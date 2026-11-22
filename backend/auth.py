"""
Accounts and login for the FACE ID backend.

  GET   /auth/status            {"needs_setup": true} until the first admin exists
  POST  /auth/setup             create the FIRST admin (only works while there are no users)
  POST  /auth/login             username + password -> token
  GET   /auth/me                the signed-in user
  POST  /auth/change-password   current + new password
  GET   /admin/users            list accounts                    (admin)
  POST  /admin/users            create an account                (admin)
  PATCH /admin/users/{id}       rename, change role, reset password, (de)activate (admin)

Every other API request needs  Authorization: Bearer <token>.
Admin-only: student registration and face enrollment, removing students,
account management, audit history, lecturer routes.
"""
import os
import secrets as pysecrets
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

import security
from db import db_conn, dict_cursor

router = APIRouter()

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'lecturer')),
    password_hash TEXT NOT NULL,
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login    TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

_secret_cache = None


def init_auth_tables():
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)


def token_secret() -> str:
    """AUTH_SECRET env var, else a random secret kept in the database (survives restarts)."""
    global _secret_cache
    if _secret_cache:
        return _secret_cache
    env = os.getenv("AUTH_SECRET")
    if env:
        _secret_cache = env
        return env
    with db_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO app_settings (key, value) VALUES ('auth_secret', %s) ON CONFLICT (key) DO NOTHING",
            (pysecrets.token_hex(32),),
        )
        cur.execute("SELECT value FROM app_settings WHERE key = 'auth_secret'")
        _secret_cache = cur.fetchone()[0]
    return _secret_cache


def _public_user(row) -> dict:
    return {
        "id": row["id"],
        "username": row["username"],
        "name": row["name"],
        "role": row["role"],
        "active": row["active"],
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "last_login": row["last_login"].isoformat() if row.get("last_login") else None,
    }


def _get_user(username: str):
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        return cur.fetchone()


def user_from_token(token: str):
    data = security.read_token(token or "", token_secret())
    if not data:
        return None
    row = _get_user(data["u"])
    if row is None or not row["active"]:
        return None
    return _public_user(row)


def _issue(row) -> dict:
    with db_conn() as conn:
        conn.cursor().execute("UPDATE users SET last_login = NOW() WHERE id = %s", (row["id"],))
    return {
        "token": security.make_token(row["username"], row["role"], token_secret()),
        "user": _public_user(row),
    }


def _bad(e: ValueError):
    raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------- request models
class SetupRequest(BaseModel):
    name: str
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class NewUser(BaseModel):
    name: str
    username: str
    role: str = "lecturer"
    password: str


class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    active: bool | None = None
    password: str | None = None


# ---------------------------------------------------------------- routes
@router.get("/auth/status")
def auth_status():
    with db_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        n = cur.fetchone()[0]
    return {"needs_setup": n == 0}


@router.post("/auth/setup")
def auth_setup(data: SetupRequest):
    try:
        username = security.check_username(data.username)
        security.check_password(data.password)
    except ValueError as e:
        _bad(e)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute("LOCK TABLE users IN EXCLUSIVE MODE")
        cur.execute("SELECT COUNT(*) AS n FROM users")
        if cur.fetchone()["n"] > 0:
            raise HTTPException(status_code=409, detail="Setup is already done. Please sign in.")
        cur.execute(
            "INSERT INTO users (username, name, role, password_hash) VALUES (%s, %s, 'admin', %s) RETURNING *",
            (username, data.name.strip(), security.hash_password(data.password)),
        )
        row = cur.fetchone()
    return _issue(row)


@router.post("/auth/login")
def auth_login(data: LoginRequest):
    row = _get_user((data.username or "").strip().lower())
    if row is None or not security.verify_password(data.password or "", row["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong username or password")
    if not row["active"]:
        raise HTTPException(status_code=403, detail="This account is deactivated. Contact the admin.")
    return _issue(row)


@router.get("/auth/me")
def auth_me(request: Request):
    return request.state.user


@router.post("/auth/change-password")
def auth_change_password(data: PasswordChange, request: Request):
    me = request.state.user
    row = _get_user(me["username"])
    if not security.verify_password(data.current_password or "", row["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is wrong")
    try:
        security.check_password(data.new_password)
    except ValueError as e:
        _bad(e)
    with db_conn() as conn:
        conn.cursor().execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (security.hash_password(data.new_password), row["id"]),
        )
    return {"message": "Password changed"}


@router.get("/admin/users")
def list_users():
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT * FROM users ORDER BY role, name")
        return {"users": [_public_user(r) for r in cur.fetchall()]}


@router.post("/admin/users")
def create_user(data: NewUser):
    try:
        username = security.check_username(data.username)
        security.check_password(data.password)
    except ValueError as e:
        _bad(e)
    if data.role not in ("admin", "lecturer"):
        raise HTTPException(status_code=400, detail="Role must be admin or lecturer")
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Username already exists")
        cur.execute(
            "INSERT INTO users (username, name, role, password_hash) VALUES (%s, %s, %s, %s) RETURNING *",
            (username, data.name.strip(), data.role, security.hash_password(data.password)),
        )
        row = cur.fetchone()
    return {"message": f"Account created for {row['name']}", "user": _public_user(row)}


@router.patch("/admin/users/{user_id}")
def update_user(user_id: int, data: UserUpdate, request: Request):
    me = request.state.user
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Account not found")
        is_me = row["username"] == me["username"]
        if is_me and (data.active is False or (data.role and data.role != "admin")):
            raise HTTPException(status_code=400, detail="You cannot deactivate or demote your own account")
        if data.role is not None and data.role not in ("admin", "lecturer"):
            raise HTTPException(status_code=400, detail="Role must be admin or lecturer")
        sets, vals = [], []
        if data.name is not None and data.name.strip():
            sets.append("name = %s"); vals.append(data.name.strip())
        if data.role is not None:
            sets.append("role = %s"); vals.append(data.role)
        if data.active is not None:
            sets.append("active = %s"); vals.append(data.active)
        if data.password:
            try:
                security.check_password(data.password)
            except ValueError as e:
                _bad(e)
            sets.append("password_hash = %s"); vals.append(security.hash_password(data.password))
        if not sets:
            raise HTTPException(status_code=400, detail="Nothing to change")
        cur.execute("UPDATE users SET " + ", ".join(sets) + " WHERE id = %s RETURNING *", (*vals, user_id))
        row = cur.fetchone()
        cur.execute("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active")
        if cur.fetchone()["n"] == 0:
            raise HTTPException(status_code=400, detail="At least one active admin account is required")
    return {"message": "Account updated", "user": _public_user(row)}


# ---------------------------------------------------------------- request guard
PUBLIC_EXACT = {"/", "/health", "/app", "/auth/status", "/auth/login", "/auth/setup",
                "/docs", "/redoc", "/openapi.json", "/favicon.ico"}
PUBLIC_PREFIX = ("/assets/", "/src/", "/docs/")


def _is_public(path: str) -> bool:
    return path in PUBLIC_EXACT or path.startswith(PUBLIC_PREFIX)


def _needs_admin(path: str, method: str) -> bool:
    if path.startswith("/admin/users"):
        return True
    if path.startswith("/lecturers"):
        return True
    if path.startswith("/attendance/audit/"):
        return True
    if method == "DELETE" and path.startswith("/admin/students/"):
        return True
    if method == "POST" and (path == "/students" or (path.startswith("/students/") and path.endswith("/faces"))):
        return True
    return False


def install(app):
    """Create tables, add the routes and protect every other request."""
    init_auth_tables()
    app.include_router(router)

    @app.middleware("http")
    async def auth_guard(request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS" or _is_public(path):
            return await call_next(request)
        header = request.headers.get("authorization", "")
        token = header[7:].strip() if header.lower().startswith("bearer ") else ""
        user = await run_in_threadpool(user_from_token, token) if token else None
        if user is None:
            return JSONResponse({"detail": "Please sign in again"}, status_code=401)
        if _needs_admin(path, request.method) and user["role"] != "admin":
            return JSONResponse({"detail": "Only an admin can do this"}, status_code=403)
        request.state.user = user
        return await call_next(request)

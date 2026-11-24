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
  GET   /me/attendance          a student's own attendance       (student)

Every other API request needs  Authorization: Bearer <token>.
Admin-only: student registration and face enrollment, removing students,
account management, audit history, lecturer routes.
Student accounts are linked to one student_id and can only read their own attendance.

LOGIN_REQUIRED (env var, default "0" = off for now):
  off -> no sign-in. The website sends X-View-Role (admin / lecturer / student) and,
         for the student view, X-View-Student. The same role rules are still applied.
  on  -> normal username + password sign-in (set LOGIN_REQUIRED=1 and redeploy).
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

LOGIN_REQUIRED = os.getenv("LOGIN_REQUIRED", "0").strip().lower() in ("1", "true", "yes", "on")
VIEW_NAMES = {"admin": "Admin", "lecturer": "Professor"}

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'lecturer', 'student')),
    password_hash TEXT NOT NULL,
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login    TIMESTAMPTZ,
    student_id    TEXT
);
CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

# Older databases: add the student_id column and allow the 'student' role.
MIGRATE_SQL = """
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id TEXT;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_role_check' AND pg_get_constraintdef(oid) LIKE '%student%'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'lecturer', 'student'));
    END IF;
END $$;
"""
ROLES = ("admin", "lecturer", "student")

_secret_cache = None


def init_auth_tables():
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
            cur.execute(MIGRATE_SQL)


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
        "student_id": row.get("student_id"),
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
    student_id: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    active: bool | None = None
    password: str | None = None
    student_id: str | None = None


def _check_student_link(cur, student_id: str | None, skip_user_id: int | None = None) -> str:
    sid = (student_id or "").strip().upper()
    if not sid:
        raise HTTPException(status_code=400, detail="Choose the student this login belongs to")
    cur.execute("SELECT 1 FROM students WHERE student_id = %s", (sid,))
    if cur.fetchone() is None:
        raise HTTPException(status_code=404, detail=f"No student with ID {sid}. Add the student first.")
    cur.execute("SELECT username FROM users WHERE student_id = %s AND id IS DISTINCT FROM %s", (sid, skip_user_id))
    other = cur.fetchone()
    if other:
        raise HTTPException(status_code=409, detail=f"Student {sid} already has a login ({other['username']})")
    return sid


# ---------------------------------------------------------------- routes
@router.get("/auth/status")
def auth_status():
    with db_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        n = cur.fetchone()[0]
    return {"needs_setup": n == 0 and LOGIN_REQUIRED, "login_required": LOGIN_REQUIRED}


@router.get("/auth/view-people")
def view_people():
    """No-login mode only: the students the top dropdown can switch to."""
    if LOGIN_REQUIRED:
        raise HTTPException(status_code=403, detail="Sign-in is turned on")
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT student_id, name, class_name FROM students ORDER BY class_name, name")
        return {"students": [dict(r) for r in cur.fetchall()]}


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
    if not LOGIN_REQUIRED:
        raise HTTPException(status_code=400, detail="Sign-in is turned off, so there is no password to change")
    me = request.state.user
    row = _get_user(me["username"])
    if row is None or not security.verify_password(data.current_password or "", row["password_hash"]):
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
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail="Role must be admin, lecturer or student")
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Username already exists")
        sid = _check_student_link(cur, data.student_id) if data.role == "student" else None
        cur.execute(
            "INSERT INTO users (username, name, role, password_hash, student_id) VALUES (%s, %s, %s, %s, %s) RETURNING *",
            (username, data.name.strip(), data.role, security.hash_password(data.password), sid),
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
        if data.role is not None and data.role not in ROLES:
            raise HTTPException(status_code=400, detail="Role must be admin, lecturer or student")
        sets, vals = [], []
        new_role = data.role or row["role"]
        if new_role == "student" and (data.student_id is not None or not row.get("student_id")):
            sets.append("student_id = %s"); vals.append(_check_student_link(cur, data.student_id or row.get("student_id"), row["id"]))
        elif new_role != "student" and row.get("student_id"):
            sets.append("student_id = NULL")
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


@router.get("/me/attendance")
def my_attendance(request: Request):
    me = request.state.user
    if me["role"] != "student" or not me.get("student_id"):
        raise HTTPException(status_code=403, detail="Only student accounts have this page")
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT student_id, name, class_name FROM students WHERE student_id = %s", (me["student_id"],))
        student = cur.fetchone()
        if student is None:
            raise HTTPException(status_code=404, detail="Your student record was removed. Contact the admin.")
        cur.execute(
            "SELECT class_name, attendance_date, status, marked_at FROM attendance "
            "WHERE student_id = %s ORDER BY attendance_date DESC, class_name",
            (me["student_id"],),
        )
        rows = cur.fetchall()
    present = sum(1 for r in rows if r["status"] == "Present")
    return {
        "student": dict(student),
        "present": present,
        "total": len(rows),
        "records": [
            {
                "class_name": r["class_name"],
                "date": r["attendance_date"].isoformat(),
                "status": r["status"],
                "marked_at": r["marked_at"].isoformat() if r["marked_at"] else None,
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------- request guard
PUBLIC_EXACT = {"/", "/health", "/app", "/auth/status", "/auth/login", "/auth/setup", "/auth/view-people",
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
    if method in ("DELETE", "PATCH") and path.startswith("/admin/students/"):
        return True
    if method == "POST" and (path == "/students" or (path.startswith("/students/") and path.endswith("/faces"))):
        return True
    return False


def _view_user(request: Request) -> dict:
    """No-login mode: act as the role picked in the website's top dropdown."""
    role = request.headers.get("x-view-role", "admin").strip().lower()
    if role not in ROLES:
        role = "admin"
    sid = request.headers.get("x-view-student", "").strip().upper() or None
    return {
        "id": 0, "username": role, "name": VIEW_NAMES.get(role, sid or "Student"), "role": role,
        "student_id": sid if role == "student" else None, "active": True,
        "created_at": None, "last_login": None,
    }


def install(app):
    """Create tables, add the routes and protect every other request."""
    init_auth_tables()
    app.include_router(router)

    @app.middleware("http")
    async def auth_guard(request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS" or _is_public(path):
            return await call_next(request)
        if not LOGIN_REQUIRED:
            user = _view_user(request)
        else:
            header = request.headers.get("authorization", "")
            token = header[7:].strip() if header.lower().startswith("bearer ") else ""
            user = await run_in_threadpool(user_from_token, token) if token else None
        if user is None:
            return JSONResponse({"detail": "Please sign in again"}, status_code=401)
        if user["role"] == "student" and not path.startswith(("/auth/", "/me/")):
            return JSONResponse({"detail": "Student accounts can only see their own attendance"}, status_code=403)
        if _needs_admin(path, request.method) and user["role"] != "admin":
            return JSONResponse({"detail": "Only an admin can do this"}, status_code=403)
        request.state.user = user
        return await call_next(request)

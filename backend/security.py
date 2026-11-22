"""
Password hashing and login tokens (standard library only).

Passwords: PBKDF2-HMAC-SHA256, 200 000 iterations, random 16-byte salt.
           Stored as  pbkdf2_sha256$<iterations>$<salt b64>$<hash b64>
Tokens:    <payload b64url>.<HMAC-SHA256 hex>, payload = {"u": username, "r": role, "exp": unix time}
           Signed with a server secret; a changed or expired token is rejected.
"""
import base64
import hashlib
import hmac
import json
import re
import secrets
import time

ITERATIONS = 200_000
TOKEN_HOURS = 12
USERNAME_RE = re.compile(r"^[a-z0-9._-]{3,32}$")
MIN_PASSWORD = 8


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    return "pbkdf2_sha256$%d$%s$%s" % (
        ITERATIONS,
        base64.b64encode(salt).decode(),
        base64.b64encode(digest).decode(),
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_b64, hash_b64 = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), base64.b64decode(salt_b64), int(iters)
        )
        return hmac.compare_digest(digest, base64.b64decode(hash_b64))
    except (ValueError, TypeError):
        return False


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64url(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def make_token(username: str, role: str, secret: str, hours: float = TOKEN_HOURS) -> str:
    payload = _b64url(json.dumps(
        {"u": username, "r": role, "exp": int(time.time() + hours * 3600)},
        separators=(",", ":"),
    ).encode())
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return payload + "." + sig


def read_token(token: str, secret: str):
    """Return the payload dict for a valid, unexpired token, else None."""
    try:
        payload, sig = token.split(".")
        good = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, good):
            return None
        data = json.loads(_unb64url(payload))
        if int(data.get("exp", 0)) < time.time():
            return None
        return data
    except (ValueError, TypeError, AttributeError):
        return None


def check_username(username: str) -> str:
    username = (username or "").strip().lower()
    if not USERNAME_RE.match(username):
        raise ValueError("Username must be 3-32 characters: lowercase letters, numbers, . _ -")
    return username


def check_password(password: str) -> str:
    if not password or len(password) < MIN_PASSWORD:
        raise ValueError(f"Password must be at least {MIN_PASSWORD} characters")
    return password

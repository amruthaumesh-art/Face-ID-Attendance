"""
PostgreSQL connection and schema for the Face ID backend.

Connection string comes from the DATABASE_URL environment variable, e.g.
  postgresql://postgres:YOURPASSWORD@localhost:5432/faceid

First-time setup (creates the database if missing, then the tables):
  python db.py
"""
import os
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/faceid"
)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


@contextmanager
def db_conn():
    """Commit on success, roll back on any error, always close."""
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def dict_cursor(conn):
    """Cursor whose rows behave like dicts (column name -> value)."""
    return conn.cursor(cursor_factory=RealDictCursor)


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT,
    class_name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_students_class
    ON students (class_name);

-- 512 float32 numbers stored as raw bytes (2 KB per face)
CREATE TABLE IF NOT EXISTS student_face_embeddings (
    id         SERIAL PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students (student_id),
    embedding  BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_embeddings_student
    ON student_face_embeddings (student_id);

CREATE TABLE IF NOT EXISTS attendance (
    id              SERIAL PRIMARY KEY,
    student_id      TEXT NOT NULL,
    class_name      TEXT NOT NULL,
    attendance_date DATE NOT NULL,
    status          TEXT NOT NULL,
    marked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, class_name, attendance_date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date
    ON attendance (class_name, attendance_date);

CREATE TABLE IF NOT EXISTS attendance_audit (
    id              SERIAL PRIMARY KEY,
    student_id      TEXT NOT NULL,
    class_name      TEXT NOT NULL,
    attendance_date DATE NOT NULL,
    old_status      TEXT NOT NULL,
    new_status      TEXT NOT NULL,
    edited_by       TEXT NOT NULL,
    reason          TEXT NOT NULL,
    edited_at       TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_student
    ON attendance_audit (student_id);
"""


def init_db():
    """Create all tables (safe to run every time)."""
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)


def create_database_if_missing():
    from psycopg2 import sql
    from psycopg2.extensions import parse_dsn

    params = parse_dsn(DATABASE_URL)
    name = params["dbname"]
    params["dbname"] = "postgres"      # connect to the default database
    conn = psycopg2.connect(**params)
    conn.autocommit = True             # CREATE DATABASE cannot run in a transaction
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (name,))
            if cur.fetchone() is None:
                cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
                print(f"Created database '{name}'")
            else:
                print(f"Database '{name}' already exists")
    finally:
        conn.close()


if __name__ == "__main__":
    create_database_if_missing()
    init_db()
    with db_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' ORDER BY table_name"
        )
        print("Tables:", [r[0] for r in cur.fetchall()])
    print("PostgreSQL is ready.")

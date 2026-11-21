"""
Copy your existing data from students.db (SQLite) into PostgreSQL.
Optional: skip it if you plan to re-enroll everyone.

Run once, after `python db.py` has created the tables:
  python migrate_sqlite_to_postgres.py
"""
import json
import sqlite3
from pathlib import Path

import numpy as np
import psycopg2

from db import db_conn, init_db

SQLITE_FILE = Path(__file__).resolve().parent / "students.db"


def count(cur, table):
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    return cur.fetchone()[0]


def main():
    if not SQLITE_FILE.exists():
        print("students.db not found, nothing to copy.")
        return
    init_db()
    src = sqlite3.connect(SQLITE_FILE)
    src.row_factory = sqlite3.Row

    with db_conn() as conn:
        cur = conn.cursor()

        for r in src.execute("SELECT * FROM students"):
            cur.execute("""
                INSERT INTO students (student_id, name, email, class_name)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (student_id) DO NOTHING
            """, (r["student_id"], r["name"], r["email"], r["class_name"]))
        print("students copied")

        if count(cur, "student_face_embeddings") == 0:
            n = 0
            for r in src.execute("SELECT * FROM student_face_embeddings"):
                vec = np.asarray(json.loads(r["embedding"]), dtype=np.float32)
                cur.execute("""
                    INSERT INTO student_face_embeddings
                        (student_id, embedding, created_at)
                    VALUES (%s, %s, %s)
                """, (r["student_id"], psycopg2.Binary(vec.tobytes()), r["created_at"]))
                n += 1
            print(f"{n} face embeddings copied")
        else:
            print("embeddings already present, skipped")

        for r in src.execute("SELECT * FROM attendance"):
            cur.execute("""
                INSERT INTO attendance
                    (student_id, class_name, attendance_date, status, marked_at)
                VALUES (%s, %s, %s, %s, COALESCE(%s::timestamptz, NOW()))
                ON CONFLICT (student_id, class_name, attendance_date) DO NOTHING
            """, (r["student_id"], r["class_name"], r["attendance_date"],
                  r["status"], r["marked_at"]))
        print("attendance copied")

        if count(cur, "attendance_audit") == 0:
            for r in src.execute("SELECT * FROM attendance_audit"):
                cur.execute("""
                    INSERT INTO attendance_audit
                        (student_id, class_name, attendance_date, old_status,
                         new_status, edited_by, reason, edited_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (r["student_id"], r["class_name"], r["attendance_date"],
                      r["old_status"], r["new_status"], r["edited_by"],
                      r["reason"], r["edited_at"]))
            print("audit log copied")
    print("Done. (The lecturer table is not copied; send lecturer.py to convert it.)")


if __name__ == "__main__":
    main()

import sqlite3
from pathlib import Path

db = Path("students.db")

print("Database:", db.resolve())

conn = sqlite3.connect(db)

tables = conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
).fetchall()

print("Tables:", tables)

student = conn.execute(
    "SELECT * FROM students WHERE student_id=?",
    ("STU001",)
).fetchone()

print("Student:", student)

conn.close()
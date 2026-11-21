import sqlite3
from pathlib import Path

DATABASE = Path(__file__).resolve().parent / "students.db"

conn = sqlite3.connect(DATABASE)

conn.execute("""
CREATE TABLE IF NOT EXISTS lecturers (
    lecturer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    created_at TEXT NOT NULL
)
""")

conn.commit()
conn.close()

print("Lecturer table created successfully!")
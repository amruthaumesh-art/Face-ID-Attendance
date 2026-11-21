"""Create the lecturer tables in PostgreSQL.

The server also creates them automatically on start-up, so this is optional.
  python create_lecturer_table.py   (DATABASE_URL must be set)
"""
from lecturer import init_lecturer_tables

init_lecturer_tables()
print("Lecturer tables created successfully in PostgreSQL!")

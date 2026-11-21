import sqlite3
import json
from datetime import datetime, timezone
from pathlib import Path
from face_enrollment import get_face_model
import cv2

image = cv2.imread(r"C:\Users\Dell\Downloads\ananya.png")
face = get_face_model().get(image)[0]
embedding = face.normed_embedding.tolist()

try:
    conn = sqlite3.connect(Path(__file__).resolve().parent / "students.db")

    conn.execute("""
        INSERT INTO student_face_embeddings
        (student_id, embedding, created_at)
        VALUES (?, ?, ?)
    """, (
        "STU001",
        json.dumps(embedding),
        datetime.now(timezone.utc).isoformat()
    ))

    conn.commit()
    print("SUCCESS: Embedding saved to database")

except Exception as e:
    print("DATABASE ERROR:", repr(e))

finally:
    conn.close()
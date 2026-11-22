"""
Admin helper endpoints for the website (FACE ID portal).

  GET    /admin/stats                      counts for the dashboard
  GET    /admin/students                   students with their enrolled face count
  GET    /admin/classes                    one row per class: students, enrolled students
  DELETE /admin/students/{student_id}      remove a student (faces + attendance; audit history kept)
  GET    /admin/attendance-dates/{class}   dates that have saved attendance for a class
"""
from datetime import date

from fastapi import APIRouter, HTTPException

from db import db_conn, dict_cursor

router = APIRouter()


@router.get("/admin/stats")
def admin_stats():
    today = date.today()
    with db_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), COUNT(DISTINCT class_name) FROM students")
        students, classes = cur.fetchone()
        cur.execute("SELECT COUNT(DISTINCT student_id), COUNT(*) FROM student_face_embeddings")
        enrolled_students, faces = cur.fetchone()
        cur.execute(
            "SELECT COUNT(*) FILTER (WHERE status = 'Present'), COUNT(*) "
            "FROM attendance WHERE attendance_date = %s",
            (today,),
        )
        today_present, today_total = cur.fetchone()
    return {
        "students": students,
        "classes": classes,
        "enrolled_students": enrolled_students,
        "faces": faces,
        "today": today.isoformat(),
        "today_present": today_present,
        "today_marked": today_total,
    }


@router.get("/admin/students")
def admin_students():
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            """
            SELECT s.student_id, s.name, s.email, s.class_name,
                   COUNT(e.id) AS face_count
            FROM students s
            LEFT JOIN student_face_embeddings e ON e.student_id = s.student_id
            GROUP BY s.student_id, s.name, s.email, s.class_name
            ORDER BY s.class_name, s.student_id
            """
        )
        rows = [dict(r) for r in cur.fetchall()]
    return {"total": len(rows), "students": rows}


@router.get("/admin/classes")
def admin_classes():
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            """
            SELECT s.class_name,
                   COUNT(*) AS students,
                   COUNT(*) FILTER (WHERE f.n > 0) AS enrolled
            FROM students s
            LEFT JOIN (
                SELECT student_id, COUNT(*) AS n
                FROM student_face_embeddings GROUP BY student_id
            ) f ON f.student_id = s.student_id
            GROUP BY s.class_name
            ORDER BY s.class_name
            """
        )
        rows = [dict(r) for r in cur.fetchall()]
    return {"classes": rows}


@router.delete("/admin/students/{student_id}")
def admin_delete_student(student_id: str):
    with db_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT name FROM students WHERE student_id = %s", (student_id,))
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Student not found")
        cur.execute("DELETE FROM student_face_embeddings WHERE student_id = %s", (student_id,))
        faces = cur.rowcount
        cur.execute("DELETE FROM attendance WHERE student_id = %s", (student_id,))
        records = cur.rowcount
        cur.execute("DELETE FROM students WHERE student_id = %s", (student_id,))
    return {
        "message": f"Removed {row[0]} ({student_id})",
        "faces_removed": faces,
        "attendance_removed": records,
    }


@router.get("/admin/attendance-dates/{class_name}")
def admin_attendance_dates(class_name: str):
    with db_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT attendance_date,
                   COUNT(*) FILTER (WHERE status = 'Present'),
                   COUNT(*),
                   MIN(marked_at)
            FROM attendance WHERE class_name = %s
            GROUP BY attendance_date
            ORDER BY attendance_date DESC
            """,
            (class_name,),
        )
        rows = cur.fetchall()
    return {
        "class_name": class_name,
        "dates": [
            {
                "date": d.isoformat(),
                "present": p,
                "total": t,
                "marked_at": m.isoformat() if m else None,
            }
            for d, p, t, m in rows
        ],
    }

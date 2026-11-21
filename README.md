# Face ID Attendance

AI-based classroom attendance using face recognition. A lecturer uploads one whole-class photo (or several row-wise photos), the system finds every face, matches it against enrolled students, and saves Present / Absent with an audit trail.

## How it works

```
classroom photo(s)
  -> face detection      SCRFD (InsightFace buffalo_l, pretrained), 640 px + 1280 px tiles for large photos
  -> alignment           5 facial landmarks -> 112x112 aligned face
  -> embedding           our trained IResNet-50 ArcFace model -> 512 numbers, L2-normalised
  -> matching            cosine similarity against the enrolled students of that class
  -> decision            threshold 0.261 -> Present / Unknown / Duplicate -> saved in PostgreSQL
```

### Store, retrieve, analyse

| Step | What happens | Code |
|---|---|---|
| **Store** | Each enrollment photo is checked (exactly one face, face at least 80 px, sharpness of the aligned face at least 30), turned into a 512-d embedding and saved as 2 KB of binary (`BYTEA`) in `student_face_embeddings`. | `face_enrollment.py` |
| **Retrieve** | For a class photo, only the embeddings of students in that class are loaded (indexed by `class_name`), so speed does not depend on the size of the whole college. | `recognition.py` |
| **Analyse** | Every detected face is compared with every enrolled embedding by cosine similarity (dot product of normalised vectors). The best match is accepted if it is at or above the threshold. Faces below it are **Unknown**; a second face matching an already-matched student is a **Duplicate**. A calibrated confidence (Platt scaling on LFW) is reported for each match. | `recognition.py`, `face_model.py` |
| **Attendance** | Results are saved per student, class and date. Row-wise photos are merged (best match per student). Corrections are allowed within a 1-hour edit window and are logged in `attendance_audit`. | `attendance.py` |

## The trained model

| | |
|---|---|
| Architecture | IResNet-50 backbone + ArcFace loss (s = 64, m = 0.5), trained from scratch |
| Training data | CASIA-WebFace, 490,623 images of 10,572 people |
| Training | 20 epochs, SGD, batch 256, mixed precision, 2x NVIDIA T4 (Kaggle), about 7 hours |
| Best epoch | 17: LFW 99.33%, CFP-FP 94.64%, AgeDB-30 94.25% (mean 96.08%) |
| Threshold | 0.261 (LFW accuracy 99.42%, FAR 0.20%, FRR 0.97%) |
| Format | ONNX, input 112x112 RGB in [-1, 1], output 512-d embedding (with flip augmentation) |

Students are not part of the training data; they are added by enrollment. The detector is pretrained, not retrained. If the model file is missing, the backend falls back to the pretrained InsightFace `buffalo_l` recognizer (threshold 0.45).

## Tech stack

| Part | Used |
|---|---|
| Backend | Python, FastAPI, uvicorn |
| Database | PostgreSQL (psycopg2) |
| Face detection | InsightFace SCRFD (buffalo_l) |
| Face recognition | Own IResNet-50 ArcFace model via onnxruntime |
| Images | OpenCV, NumPy |
| Frontend | Single HTML/CSS/JS page served at `/app` |
| Test data | FEI face database, via `dataset_tools.py` |

## Project structure

```
backend/
  main.py                      app, student registration, routers
  db.py                        PostgreSQL connection and schema (run once to create tables)
  face_model.py                detection + embedding + threshold + confidence (the only model code)
  face_enrollment.py           POST /students/{id}/faces
  recognition.py               face matching for a class photo
  attendance.py                mark, row-wise merge, records, corrections, audit
  lecturer.py                  lecturer routes
  dataset_tools.py             FEI test data: collage, enroll, eval
  migrate_sqlite_to_postgres.py  optional copy of old SQLite data
  models/                      casia_iresnet50.onnx (not in Git) + casia_iresnet50.json
  frontend/index.html          dashboard
```

## Setup (Windows)

1. **Install PostgreSQL** (version 17 used here), keep port 5432 and set a password for the `postgres` user.
2. **Create the Python environment** in `backend`:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\python.exe -m pip install fastapi uvicorn python-multipart psycopg2-binary insightface onnxruntime opencv-python numpy
   ```
3. **Download the model.** `casia_iresnet50.onnx` (175 MB) is too large for GitHub. Get it from the team's Drive and put it in `backend\models\` next to `casia_iresnet50.json`. Check it with:
   ```powershell
   .\venv\Scripts\python.exe face_model.py info
   ```
4. **Set the database connection** (in every new PowerShell window):
   ```powershell
   $env:DATABASE_URL = "postgresql://postgres:YOURPASSWORD@localhost:5432/faceid"
   ```
5. **Create the database and tables:**
   ```powershell
   .\venv\Scripts\python.exe db.py
   ```
6. **Start the server:**
   ```powershell
   .\venv\Scripts\python.exe -m uvicorn main:app
   ```
   Open http://127.0.0.1:8000/app. API docs are at http://127.0.0.1:8000/docs.

The first run downloads the InsightFace detector (about 280 MB, once).

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/students` | Register a student |
| GET | `/students`, `/students/{id}` | List / get students |
| POST | `/students/{id}/faces` | Enroll one face photo |
| POST | `/recognize/{class_name}` | Recognise faces in a photo (no saving) |
| POST | `/attendance/mark-from-recognition/{class_name}` | Whole-class photo -> attendance |
| POST | `/attendance/mark-from-rows/{class_name}` | Several row photos -> merged attendance |
| POST | `/attendance/mark` | Manual mark |
| GET | `/attendance/{class_name}/{date}` | Attendance records |
| PATCH | `/attendance/correct/{student_id}` | Correction within the 1-hour window |
| GET | `/attendance/audit/{student_id}` | Correction history |

## Testing with the FEI dataset

```powershell
.\venv\Scripts\python.exe dataset_tools.py enroll  "$env:USERPROFILE\Downloads\fei"   # 20 students, class FEI-TEST
.\venv\Scripts\python.exe dataset_tools.py collage "$env:USERPROFILE\Downloads\fei"   # out_test/class_photo.jpg, row_1..4.jpg
```

Then upload `out_test/class_photo.jpg` (Test A) or all four `row_*.jpg` together (Test B) in the dashboard for class `FEI-TEST`. The correct answer is in `out_test/who_is_in_photo.txt`. Enrollment and test images are different photos of the same people.

### Results

| Test | Enrolled | Result |
|---|---|---|
| A: whole-class collage, 20 students, model casia_iresnet50, threshold 0.261 | 20 students x 6 photos | **20/20 recognised** |
| B: 4 row-wise photos, analysed together | 20 students x 6 photos | **20/20 recognised, 0 unknown, 0 duplicate** |

Note from development: with an earlier blur check (Laplacian on the raw face region, limit 50), 9 of the 20 students could not be enrolled. In that run all 11 enrolled students were recognised, and the 9 unenrolled faces were reported as Unknown or flagged as Duplicate for review instead of being marked Present. Measuring sharpness on the aligned 112x112 face (limit 30) fixed enrollment for all 20.

## Limitations and future work

- Threshold and confidence are calibrated on LFW; they should be re-tuned on real classroom photos with known attendance.
- The trained model is weaker than buffalo_l on very small or blurry faces; back rows need row-wise photos.
- `lecturer.py` still uses SQLite and should be moved to PostgreSQL.
- Planned: a sessions table (two lectures of one class on the same day), lecturer login and roles, consent records, encryption of embeddings, the 95%-confidence auto-accept rule in the backend, and a React frontend.

## Privacy

Face embeddings are biometric data. Enroll only students who have given consent, keep the repository private, and never commit photos, `.db` files or `.env` files (see `.gitignore`).

# FACE ID — Smart Classroom Attendance

AI-based classroom attendance using face recognition. The admin registers students and captures their faces with the camera; a lecturer takes one classroom photo (or several row-wise photos); the system finds every face, matches it to the enrolled students of that class and saves Present / Absent, with a 1-hour correction window and a full audit log.

**Live website:** https://amruthaumesh-art--face-id-attendance-web.us-east.modal.run
(sign in with the account given by the admin; the first load after a quiet period takes about 30 seconds)

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
| Database | PostgreSQL (psycopg2) — hosted on Neon |
| Face detection | InsightFace SCRFD (buffalo_l, pretrained) |
| Face recognition | Own IResNet-50 ArcFace model (`casia_iresnet50.onnx`) via onnxruntime |
| Images | OpenCV, NumPy |
| Website | HTML, CSS and JavaScript served by FastAPI (`backend/static/`), no build step |
| Accounts | PBKDF2-SHA256 password hashing, HMAC-signed login tokens |
| Hosting | Modal (serverless cloud) |
| Test data | FEI face database |

## Website

Separate pages with sidebar navigation (red campus-ERP theme, works on phones):

| Page | Who | What it does |
|---|---|---|
| Dashboard | all | Greeting, summary (students, classes, faces enrolled, present today), module cards |
| Students | admin | Roster with face status, search, capture more faces, remove a student |
| Add Student | admin | Student details + live camera capture (4–6 photos) on the same page; photos are checked and enrolled on save |
| Classes | all | One card per class; class page lists students and links to attendance |
| Take Attendance | all | Camera or upload; one photo = whole class, several photos = row-wise; shows present/absent with confidence |
| Records | all | Saved attendance by class and date; corrections with a reason within 60 minutes, then locked |
| Audit Log | admin | Every correction: old → new status, who, when, why |
| Users | admin | Create lecturer/admin accounts, reset passwords, deactivate accounts |
| My Account | all | Profile and change password |

## Accounts and security

- **First run:** the website asks to create the first admin account (no passwords are stored in the code).
- **Passwords** are stored hashed (PBKDF2-SHA256, 200,000 iterations, random salt), never as plain text.
- **Login tokens** are signed by the server (HMAC-SHA256) and expire after 12 hours.
- **Every API request is checked** on the server: without a valid sign-in it is refused (401); lecturers are refused admin actions (403) such as registering students, enrolling faces, removing students, managing accounts and reading the audit log.
- Deactivating an account takes effect immediately.
- Corrections record the signed-in user's name in the audit log.

## Project structure

```
modal_app.py                   cloud deployment (Modal): image, secrets, web endpoint
Dockerfile                     alternative container build (any Docker host with ~1 GB RAM)
backend/
  main.py                      FastAPI app: student routes, routers, serves the website
  auth.py                      accounts, login, request guard (who may call what)
  security.py                  password hashing + login tokens (standard library)
  admin_api.py                 dashboard stats, student list with face counts, class summary, remove student
  db.py                        PostgreSQL connection and schema
  face_model.py                detection + embedding + threshold + confidence (the only model code)
  face_enrollment.py           POST /students/{id}/faces with quality checks
  recognition.py               face matching for a class photo
  attendance.py                mark, row-wise merge, records, corrections, audit
  lecturer.py                  lecturer routes
  dataset_tools.py             FEI test data helpers (collage, eval)
  models/                      casia_iresnet50.onnx (not in Git, see below) + casia_iresnet50.json
  static/                      the website: index.html, assets/app.css, assets/app.js
```

## Hosting

| Part | Where |
|---|---|
| Website + backend | Modal (serverless cloud, US East): starts on the first request, stops after 5 idle minutes |
| Database | Neon (hosted PostgreSQL, AWS US East) |
| Code | GitHub (this repository) |
| Model file | Uploaded with each Modal deploy; also on Google Drive |

Deploy or update (from the project folder, Windows):

```powershell
.\backend\venv\Scripts\python.exe -m pip install modal
.\backend\venv\Scripts\python.exe -m modal setup                       # once: link your Modal account
.\backend\venv\Scripts\python.exe -m modal secret create face-id-db "DATABASE_URL=<Neon connection URL>"   # once
.\backend\venv\Scripts\python.exe -m modal deploy modal_app.py         # every update; the link stays the same
```

The model file `casia_iresnet50.onnx` (175 MB) is too large for GitHub. Download it from the model team's Google Drive (https://drive.google.com/file/d/1p6efSbmov4zpLmKze3Lf4w-AbPw6P2el/view) into `backend/models/` before deploying.

## Run locally (Windows)

1. Install PostgreSQL, or use the Neon database.
2. Create the Python environment in `backend`:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\python.exe -m pip install -r requirements.txt
   ```
3. Put `casia_iresnet50.onnx` in `backend\models\` and check: `.\venv\Scripts\python.exe face_model.py info`
4. Start the server:
   ```powershell
   $env:DATABASE_URL = "postgresql://postgres:YOURPASSWORD@localhost:5432/faceid"
   .\venv\Scripts\python.exe -m uvicorn main:app
   ```
5. Open http://localhost:8000, create the admin account, then add students with the camera. (The camera needs `localhost` or https.)

## API

All endpoints except `/auth/status`, `/auth/login`, `/auth/setup` and `/health` need `Authorization: Bearer <token>`. Interactive docs: `/docs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/auth/status` | Whether the first admin still has to be created |
| POST | `/auth/setup` | Create the first admin (only when no accounts exist) |
| POST | `/auth/login` | Username + password -> token |
| GET | `/auth/me` | Signed-in user |
| POST | `/auth/change-password` | Change own password |
| GET/POST | `/admin/users` | List / create accounts (admin) |
| PATCH | `/admin/users/{id}` | Rename, change role, reset password, (de)activate (admin) |
| GET | `/admin/stats`, `/admin/students`, `/admin/classes` | Dashboard summary, students with face counts, classes |
| DELETE | `/admin/students/{id}` | Remove a student (admin) |
| GET | `/admin/attendance-dates/{class_name}` | Dates with saved attendance |
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
| POST | `/lecturers/register` | Register a lecturer |
| GET | `/lecturers/{id}` | Get a lecturer |
| POST | `/lecturers/{id}/face` | Enroll a lecturer's face |

## Testing with the FEI dataset

Test photos are made from the FEI face database (`dataset_tools.py collage`); enrollment and test images are different photos of the same people. With login enabled, students are enrolled through the website (Add Student), and test photos are uploaded on the Take Attendance page.

### Results

| Test | Enrolled | Result |
|---|---|---|
| A: whole-class collage, 20 students, model casia_iresnet50, threshold 0.261 | 20 students x 6 photos | **20/20 recognised** |
| B: 4 row-wise photos, analysed together | 20 students x 6 photos | **20/20 recognised, 0 unknown, 0 duplicate** |

Note from development: with an earlier blur check (Laplacian on the raw face region, limit 50), 9 of the 20 students could not be enrolled. In that run all 11 enrolled students were recognised, and the 9 unenrolled faces were reported as Unknown or flagged as Duplicate for review instead of being marked Present. Measuring sharpness on the aligned 112x112 face (limit 30) fixed enrollment for all 20.

The hosted demo class **FEI-TEST** has 6 enrolled students; a 6-person test photo is recognised 6/6.

## Limitations and future work

- Threshold and confidence are calibrated on LFW; they should be re-tuned on real classroom photos with known attendance.
- The trained model is weaker than buffalo_l on very small or blurry faces; back rows need row-wise photos.
- Free hosting: the first request after an idle period takes ~30 s (server start), and the free Modal credit is limited.
- One attendance record per class per date; a sessions table (two lectures of one class on the same day) is planned.
- Planned: consent records, encryption of stored embeddings, the 95%-confidence auto-accept rule, email password reset.

## Privacy

Face embeddings are biometric data. Enroll only students who have given consent. Photos are not stored: only the 512-number embeddings and attendance records are kept. Never commit photos, `.db` files, `.env` files or database passwords (see `.gitignore`).

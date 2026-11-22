"""
FACE ID Attendance on Modal (https://modal.com) - website + backend, 24/7 link.

The database is hosted PostgreSQL (Neon). Its connection string is stored in a
Modal secret named "face-id-db" with the key DATABASE_URL.

Before deploying, build the website into backend/static (see README, Hosting).

Deploy (from the project root, with the backend venv):
    python -m modal deploy modal_app.py

The first deploy builds the image (about 10 minutes). Later deploys are quick.
"""
import modal

DETECTOR_DOWNLOAD = (
    "python -c \"from insightface.app import FaceAnalysis; "
    "FaceAnalysis(name='buffalo_l', allowed_modules=['detection'], "
    "providers=['CPUExecutionProvider']).prepare(ctx_id=-1)\""
)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("build-essential", "libgl1", "libglib2.0-0")
    .pip_install_from_requirements("backend/requirements.txt")
    # pretrained face detector (InsightFace buffalo_l), downloaded once at build time
    .run_commands(DETECTOR_DOWNLOAD)
    # backend code, trained model (backend/models) and built website (backend/static)
    .add_local_dir(
        "backend",
        remote_path="/root/app",
        ignore=[
            "venv", "**/venv", ".venv",
            "**/__pycache__", "**/*.pyc",
            "*.db", "**/*.db",
            "out_test", "results", "backup_before_patch",
            ".env",
        ],
    )
)

app = modal.App("face-id-attendance")


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("face-id-db")],
    cpu=1.0,
    memory=2048,           # MB; the face models need about 0.6-0.8 GB
    scaledown_window=300,  # stay warm 5 minutes after the last request
    timeout=600,
)
@modal.concurrent(max_inputs=10)
@modal.asgi_app()
def web():
    import os
    import sys

    os.chdir("/root/app")
    sys.path.insert(0, "/root/app")
    from main import app as fastapi_app  # FastAPI: API + website

    return fastapi_app

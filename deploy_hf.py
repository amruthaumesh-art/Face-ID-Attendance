"""
Upload this project to a Hugging Face Space (Docker) - one command deploy.

  1. pip install huggingface_hub   (in the backend venv)
  2. python deploy_hf.py YOUR_HF_USERNAME/face-id-attendance

It asks for your Hugging Face access token (Settings -> Access Tokens -> "Write").
The model file backend/models/casia_iresnet50.onnx IS uploaded (Git LFS is handled
automatically); venv, databases, photos and node_modules are NOT.
"""
import getpass
import os
import sys

from huggingface_hub import HfApi

HERE = os.path.dirname(os.path.abspath(__file__))

IGNORE = [
    "**/venv/**", "**/.venv/**", "**/__pycache__/**", "**/*.pyc",
    "**/*.db", "**/node_modules/**", "**/dist/**", ".git/**",
    "backend/out_test/**", "backend/backup_before_patch/**", "backend/results/**",
    "**/.env", "**/.env.local", "*.zip", "**/*.zip",
]

if len(sys.argv) != 2 or "/" not in sys.argv[1]:
    sys.exit("Usage: python deploy_hf.py YOUR_HF_USERNAME/face-id-attendance")
repo_id = sys.argv[1]

model = os.path.join(HERE, "backend", "models", "casia_iresnet50.onnx")
if not os.path.exists(model):
    sys.exit(f"Model file missing: {model}\nPut casia_iresnet50.onnx there first.")

token = os.environ.get("HF_TOKEN") or getpass.getpass("Hugging Face WRITE token (input hidden): ").strip()
api = HfApi(token=token)

print(f"Creating / checking Space {repo_id} ...")
api.create_repo(repo_id=repo_id, repo_type="space", space_sdk="docker", exist_ok=True)

print("Uploading files (the 175 MB model takes a few minutes) ...")
api.upload_folder(
    repo_id=repo_id,
    repo_type="space",
    folder_path=HERE,
    ignore_patterns=IGNORE,
    commit_message="Deploy FACE ID Attendance",
)
print(f"\nDone. Build progress and the website: https://huggingface.co/spaces/{repo_id}")
print("Remember: add the DATABASE_URL secret in the Space settings.")

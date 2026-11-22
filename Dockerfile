# FACE ID Attendance - one container: React website + FastAPI backend.
# Built and run by Hugging Face Spaces (Docker). Database: hosted PostgreSQL
# given in the DATABASE_URL secret.

# ---------- 1. build the React website ----------
FROM node:22-slim AS web
WORKDIR /web
COPY web/package.json ./
RUN npm install --no-audit --no-fund
COPY web/ ./
# live mode, same address as the backend
ENV VITE_LIVE_BACKEND=true \
    VITE_BACKEND_URL=
RUN npx vite build

# ---------- 2. Python backend ----------
FROM python:3.11-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libgl1 libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1
WORKDIR /home/user/app

COPY --chown=user backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# download the pretrained face detector (InsightFace buffalo_l) at build time
RUN python -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_l', allowed_modules=['detection'], providers=['CPUExecutionProvider']).prepare(ctx_id=-1)"

COPY --chown=user backend/ .
COPY --from=web --chown=user /web/dist ./static

EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]

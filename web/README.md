# FACE ID - website (React + Vite)

Lecturer and administrator portal for the FACE ID classroom attendance system.

- Live mode (`VITE_LIVE_BACKEND=true`): real classes, students, face recognition and
  attendance from the FastAPI + PostgreSQL backend (`src/services/liveApi.ts`).
- Sample PUC classes are demo data with simulated results.

Local development (backend running on http://127.0.0.1:8000):

```
copy .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. The hosted version is built by the Dockerfile in the project root.
See the main README for details.

# Personal Website (FastAPI + React)

This project restructures the original Jekyll site into a modern stack with:

- **FastAPI** backend serving article content.
- **React + TypeScript** frontend using Vite.
- Articles written in Markdown in `articles/src`.

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies API requests to `http://localhost:8000`.
Add new Markdown files under `articles/src` to publish new articles.

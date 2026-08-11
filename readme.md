# Desktop AI Assistant

## Backend development

Copy `backend/.env.example` to `backend/.env` and set a strong `JWT_SECRET`.
Start PostgreSQL and Redis from the repository root:

```powershell
docker compose up -d postgres redis
```

Then, from `backend/`, activate the virtual environment, apply the reviewed
migrations, and start FastAPI:

```powershell
.\.venv\Scripts\activate
alembic upgrade head
uvicorn app.main:app --reload
```

Open `http://localhost:8000/docs` for the API. Run the backend test suite with:

```powershell
python -m pytest -q
```

## Containers

`docker compose up --build` starts PostgreSQL, Redis, and the backend on port
8000. Migrations are deliberately not automatic; after starting infrastructure,
run:

```powershell
docker compose run --rm backend alembic upgrade head
```

Generate future migrations with `alembic revision --autogenerate -m "describe
change"`, inspect the generated file, then run `alembic upgrade head`.

# ---- Stage 1: Build frontend ----
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Build backend ----
FROM python:3.12-slim AS backend
WORKDIR /app/backend-v2
COPY backend-v2/pyproject.toml backend-v2/alembic.ini ./
COPY backend-v2/app ./app
RUN pip install --no-cache-dir .

# ---- Stage 3: Runtime ----
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates tzdata && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/backend-v2 ./backend-v2
COPY --from=frontend /app/frontend/out ./frontend/out
ENV DATABASE_PATH=/data/hackathon.sqlite
ENV STATIC_DIR=/app/frontend/out
ENV SECRET_KEY_FILE=/data/.secret_key
EXPOSE 8080
VOLUME ["/data"]
CMD ["uvicorn", "app.main:app", "--app-dir", "/app/backend-v2", "--host", "0.0.0.0", "--port", "8080"]

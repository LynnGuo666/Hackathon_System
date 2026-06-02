FROM python:3.12-slim

WORKDIR /app/backend-v2

COPY backend-v2/pyproject.toml backend-v2/alembic.ini ./
COPY backend-v2/app ./app

RUN pip install --no-cache-dir .

ENV DATABASE_PATH=/data/hackathon.sqlite
ENV STATIC_DIR=/app/frontend/out
EXPOSE 8080

VOLUME ["/data"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

. .venv/bin/activate

PYTHON="$ROOT_DIR/.venv/bin/python"

if ! "$PYTHON" -m pip --version >/dev/null 2>&1; then
  "$PYTHON" -m ensurepip --upgrade >/dev/null 2>&1 || true
fi

if ! "$PYTHON" -c "import alembic, fastapi, uvicorn" >/dev/null 2>&1; then
  echo "Installing backend-v2 dependencies..."
  if "$PYTHON" -m pip --version >/dev/null 2>&1; then
    "$PYTHON" -m pip install -e ".[dev]" >/dev/null
  elif command -v uv >/dev/null 2>&1; then
    uv pip install --python "$PYTHON" -e ".[dev]" >/dev/null
  else
    echo "Could not find pip in .venv, and uv is not installed."
    echo "Try: python3 -m venv --clear .venv && ./start-backend.sh"
    exit 1
  fi
fi

export ADMIN_TOKEN="${ADMIN_TOKEN:-secret}"
export DATABASE_PATH="${DATABASE_PATH:-./hackathon.sqlite}"
export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:3000}"

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8080}"

echo "Starting backend-v2 on http://${HOST}:${PORT}"
echo "ADMIN_TOKEN=${ADMIN_TOKEN}"
echo "DATABASE_PATH=${DATABASE_PATH}"
echo "CORS_ORIGIN=${CORS_ORIGIN}"

exec "$PYTHON" -m uvicorn app.main:app --reload --host "$HOST" --port "$PORT"

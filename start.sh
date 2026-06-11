#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- 后端 ---
BACKEND_DIR="$ROOT_DIR/backend-v2"
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

. .venv/bin/activate

PYTHON="$BACKEND_DIR/.venv/bin/python"

if ! "$PYTHON" -m pip --version >/dev/null 2>&1; then
  "$PYTHON" -m ensurepip --upgrade >/dev/null 2>&1 || true
fi

if ! "$PYTHON" -c "import alembic, fastapi, uvicorn" >/dev/null 2>&1; then
  echo "Installing backend dependencies..."
  if "$PYTHON" -m pip --version >/dev/null 2>&1; then
    "$PYTHON" -m pip install -e ".[dev]" >/dev/null
  elif command -v uv >/dev/null 2>&1; then
    uv pip install --python "$PYTHON" -e ".[dev]" >/dev/null
  else
    echo "Could not find pip in .venv, and uv is not installed."
    echo "Try: python3 -m venv --clear .venv && ./start.sh"
    exit 1
  fi
fi

# --- 环境变量 ---
export ADMIN_TOKEN="${ADMIN_TOKEN:-secret}"
export DATABASE_PATH="${DATABASE_PATH:-./hackathon.sqlite}"
export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:3000}"
export BUILD_TIME="${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"

# --- 前端构建 ---
FRONTEND_DIR="$ROOT_DIR/frontend"
if [ -f "$FRONTEND_DIR/package.json" ]; then
  echo "Building frontend..."
  (cd "$FRONTEND_DIR" && npm run build)
  export STATIC_DIR="$FRONTEND_DIR/out"
fi

# --- 启动后端 ---
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8080}"

echo ""
echo "========================================="
echo "  Hackathon System"
echo "========================================="
echo "  Backend:    http://${HOST}:${PORT}"
echo "  Admin Token: ${ADMIN_TOKEN}"
echo "  Database:    ${DATABASE_PATH}"
echo "  CORS:        ${CORS_ORIGIN}"
echo "  Static:      ${STATIC_DIR:-<not set>}"
echo "  Build Time:  ${BUILD_TIME}"
echo "========================================="
echo ""

cd "$BACKEND_DIR"
exec "$PYTHON" -m uvicorn app.main:app --reload --host "$HOST" --port "$PORT"

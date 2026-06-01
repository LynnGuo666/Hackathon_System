# ---- Stage 1: Build frontend ----
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Build backend ----
FROM golang:1.26-alpine AS backend
RUN apk add --no-cache gcc musl-dev
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend /app/frontend/out /app/frontend/out
RUN CGO_ENABLED=1 go build -o /hackathon-server ./cmd/server

# ---- Stage 3: Runtime ----
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend /hackathon-server .
COPY --from=frontend /app/frontend/out ./frontend/out

ENV ADDR=:8080
ENV DATABASE_PATH=/data/hackathon.sqlite
ENV STATIC_DIR=/app/frontend/out
EXPOSE 8080

VOLUME ["/data"]
CMD ["./hackathon-server"]

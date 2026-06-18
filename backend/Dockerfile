# syntax=docker/dockerfile:1

# ───────────────────────────── build stage ─────────────────────────────
FROM golang:1.25-alpine AS builder
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/worker ./cmd/worker

# ───────────────────────────── api image ───────────────────────────────
FROM alpine:3.20 AS api
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 appuser
WORKDIR /app
COPY --from=builder /out/api ./api
COPY --from=builder /src/migrations ./migrations
USER appuser
# App reads PORT from env (defaults to 8080 in config; .env uses 8081).
EXPOSE 8081
ENTRYPOINT ["/app/api"]

# ──────────────────────────── worker image ─────────────────────────────
FROM alpine:3.20 AS worker
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 appuser
WORKDIR /app
COPY --from=builder /out/worker ./worker
COPY --from=builder /src/migrations ./migrations
USER appuser
ENTRYPOINT ["/app/worker"]

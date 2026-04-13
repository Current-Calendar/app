#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILES="-f docker-compose.mac.yaml -f docker-compose.e2e.yaml"

cleanup() {
  docker compose $COMPOSE_FILES down --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT

docker compose $COMPOSE_FILES up -d --build backend db redis selenium frontend-e2e

docker compose $COMPOSE_FILES run --rm e2e-runner "$@"

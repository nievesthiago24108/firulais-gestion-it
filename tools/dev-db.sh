#!/usr/bin/env bash
# Base de datos de desarrollo: instancia MariaDB del usuario (sin sudo) en .dev/, puerto 3307.
# Uso: tools/dev-db.sh start | stop | reset (recrea schema + datos de ejemplo)
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DATA=$ROOT/.dev/mysql
SOCK=$ROOT/.dev/mysql.sock
PORT=3307
client() { mariadb --no-defaults --socket="$SOCK" -uroot "$@"; }

start() {
  if [ ! -d "$DATA/mysql" ]; then
    mkdir -p "$DATA"
    mariadb-install-db --no-defaults --datadir="$DATA" --auth-root-authentication-method=normal >/dev/null
  fi
  if ! client -e 'select 1' >/dev/null 2>&1; then
    mariadbd --no-defaults --datadir="$DATA" --socket="$SOCK" --port=$PORT --bind-address=127.0.0.1 \
      --pid-file="$ROOT/.dev/mysql.pid" --log-error="$ROOT/.dev/mysql.err" >/dev/null 2>&1 &
    for _ in $(seq 50); do client -e 'select 1' >/dev/null 2>&1 && break; sleep 0.2; done
  fi
  client -e "CREATE USER IF NOT EXISTS 'firulais'@'127.0.0.1' IDENTIFIED BY 'firulais';
             GRANT ALL ON firulais.* TO 'firulais'@'127.0.0.1';"
  echo "MariaDB en 127.0.0.1:$PORT (usuario firulais / firulais)"
}

case "${1:-start}" in
  start) start ;;
  stop) [ -f "$ROOT/.dev/mysql.pid" ] && kill "$(cat "$ROOT/.dev/mysql.pid")" && echo detenida ;;
  reset) start; client < "$ROOT/backend/database/schema.sql"; client firulais < "$ROOT/backend/database/seed.sql"; echo "datos recargados" ;;
  *) echo "uso: $0 start|stop|reset"; exit 1 ;;
esac

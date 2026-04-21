#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR"
PORT="3000"
PID_FILE="$APP_DIR/.mission-control-server.pid"
LOG_DIR="$HOME/Library/Logs/MissionControl"
LOG_FILE="$LOG_DIR/server.log"

if [ -d "$HOME/.nvm" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1090
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

if lsof -ti tcp:$PORT >/dev/null 2>&1; then
  open "http://localhost:$PORT"
  exit 0
fi

if [ ! -d "node_modules" ]; then
  npm install
fi

if [ ! -d ".next" ]; then
  npm run build
fi

nohup env PORT="$PORT" npm run start > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"
disown "$SERVER_PID" 2>/dev/null || true

sleep 3
open "http://localhost:$PORT"

#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR"
PORT="3000"
PID_FILE="$APP_DIR/.mission-control-server.pid"

if [ -d "$HOME/.nvm" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1090
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" >/dev/null 2>&1; then
    kill "$PID" >/dev/null 2>&1 || true
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

if lsof -ti tcp:$PORT >/dev/null 2>&1; then
  lsof -ti tcp:$PORT | xargs kill >/dev/null 2>&1 || true
fi

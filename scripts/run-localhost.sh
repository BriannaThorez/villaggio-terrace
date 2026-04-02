#!/usr/bin/env sh
set -eu

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed or not available on PATH."
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if [ ! -f package.json ]; then
  echo "package.json not found in repository root."
  exit 1
fi

echo "Starting the app on localhost..."
echo "Open: http://localhost:3000"

npm run dev

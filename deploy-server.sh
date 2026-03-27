#!/usr/bin/env bash
set -euo pipefail

# Optional: pass branch name as first argument. Default = main.
BRANCH="${1:-main}"

# Always run from this script's directory (project root).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> [admin] Deploy start on branch: $BRANCH"

git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm run build
pm2 restart oracle-ics-admin

echo "==> [admin] Deploy completed"

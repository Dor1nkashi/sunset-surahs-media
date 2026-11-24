#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
git add --sparse poster/posted.json
if ! git diff --cached --quiet; then
    git commit -qm "poster: update posting record"
fi
for attempt in 1 2 3; do
    if git pull -q --rebase origin main && git push -q origin HEAD:main; then
        exit 0
    fi
    if [[ -d "$(git rev-parse --git-path rebase-merge)" || -d "$(git rev-parse --git-path rebase-apply)" ]]; then
        git rebase --abort
    fi
    sleep 5
done
exit 1

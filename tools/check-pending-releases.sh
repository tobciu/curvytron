#!/usr/bin/env bash
# Checks whether the given ref has commits that change the app sources (src, public, assets, Dockerfile,
# package files) but are not contained in the latest "vX.Y.Z" tag — code for which no Docker image has
# been built yet (locally via tools/local-release.sh).
#
# Useful before a deploy: it answers "does the last release contain everything on main?". If this
# script finds backlog, release it with:
#   tools/local-release.sh [major|minor|patch] [commit-ish]
#
# Tag lookup identical to tools/local-release.sh: newest "vX.Y.Z" tag by `sort -V`; without any tag
# everything since the beginning counts as "pending".
#
# Usage: tools/check-pending-releases.sh [ref]
#   [ref] (default HEAD) - up to which commit the check runs, e.g. main or origin/main.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

ref="${1:-HEAD}"

# Paths whose changes end up in the Docker image — commits that only touch docs or tests need no release.
paths=(src public assets Dockerfile .dockerignore package.json package-lock.json vite.config.js tsconfig.json)

echo "Checking pending release up to ${ref} ($(git rev-parse --short "${ref}"))..."
echo ""

latest=$(git tag -l 'v[0-9]*' \
  | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
  | sort -V \
  | tail -1)
latest="${latest:-v0.0.0}"

if git rev-parse --verify --quiet "refs/tags/${latest}" >/dev/null; then
  range="${latest}..${ref}"
else
  range="${ref}"
fi

commits="$(git log --format='%h %ad %s' --date=short "${range}" -- "${paths[@]}")"

if [[ -z "$commits" ]]; then
  echo "OK    curvytron: current (${latest} covers the app sources)"
else
  count=$(wc -l <<< "$commits")
  echo "OPEN  curvytron: ${count} commit(s) since ${latest} not released yet"
  while IFS= read -r line; do
    echo "        $line"
  done <<< "$commits"
  echo "        -> tools/local-release.sh [major|minor|patch] [commit-ish]"
  echo ""
  echo "Pending: curvytron"
  exit 1
fi

echo ""
echo "No pending release - the image of ${latest} is current."

#!/usr/bin/env bash
# Local release of this repository: determines the next version from the tags, builds the Docker
# image, pushes it to GHCR, tags the commit (+ pushes the version bump commit) and creates the
# GitHub release. Releases run locally on purpose (no CI minutes); GHCR push and the GitHub API work
# independently of GitHub Actions.
#
# Prerequisites (once):
#   gh auth refresh -h github.com -s write:packages   # extend the gh token with GHCR write scope
# The script logs docker in at ghcr.io itself with the gh token — no separate PAT needed.
#
# Version scheme: one tag namespace "vX.Y.Z"; the bump type is an explicit argument. The version in
# package.json is part of the image (`/health` shows it), so on a release from HEAD the script
# commits "Bump version to X.Y.Z" first when needed — the same convention as the existing v2.0.0.
#
# Usage: tools/local-release.sh [major|minor|patch] [commit-ish] [--dry-run]
#
# [commit-ish] (default HEAD) is the commit to tag and to hand over as APP_COMMIT build arg — for
# the case where the working tree does not match the commit to release exactly. With an explicit
# commit-ish the script never commits: it then only warns when the package.json version differs.
# --dry-run computes everything and builds the image but commits, pushes and releases nothing.
set -euo pipefail

bump="minor"
target="HEAD"
dry_run=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=true ;;
    -h|--help) sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    major|minor|patch) bump="$arg" ;;
    *) target="$arg" ;;
  esac
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

image="${GHCR_IMAGE:-ghcr.io/tobciu/curvytron}"

if ! $dry_run; then
  if ! gh auth status 2>&1 | grep -q "write:packages"; then
    echo "gh token has no write:packages scope - run: gh auth refresh -h github.com -s write:packages" >&2
    exit 1
  fi
  gh auth token | docker login ghcr.io -u "$(gh api user -q .login)" --password-stdin >/dev/null
fi

# Get the tags from the remote — otherwise the version calculation runs on a stale state.
git fetch --tags --quiet origin

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean - commit or stash first." >&2
  exit 1
fi

# Newest vX.Y.Z tag. `sort -V` sorts numerically per dot segment.
latest=$(git tag -l 'v[0-9]*' \
  | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
  | sort -V \
  | tail -1)
latest="${latest:-v0.0.0}"

IFS='.' read -r maj min pat <<< "${latest#v}"

case "$bump" in
  major) maj=$((maj + 1)); min=0; pat=0 ;;
  minor) min=$((min + 1)); pat=0 ;;
  patch) pat=$((pat + 1)) ;;
esac

version="${maj}.${min}.${pat}"
tag="v${version}"
commit="$(git rev-parse "${target}")"

if git rev-parse --verify --quiet "refs/tags/${tag}" >/dev/null; then
  echo "Tag ${tag} already exists." >&2
  exit 1
fi

# The version in package.json goes into the image and shows up in /health.
pkg_version="$(node -p "require('./package.json').version")"
bump_commit=false
if [[ "$pkg_version" != "$version" ]]; then
  if [[ "${commit}" == "$(git rev-parse HEAD)" ]]; then
    bump_commit=true
  else
    echo "Warning: ${target} has package.json version ${pkg_version}, not ${version} - the image will report ${pkg_version}."
  fi
fi

echo "== curvytron: ${latest} -> ${tag}  (image ${image}:${version}) =="
if $dry_run; then
  echo "--dry-run: no commits, no pushes, no release."
fi

# The version bump commit (convention of this repository: "Bump version to X.Y.Z") comes before the
# tag so the tagged commit is the one that carries the new version.
if $bump_commit && ! $dry_run; then
  npm version "${version}" --no-git-tag-version --allow-same-version >/dev/null
  git add package.json package-lock.json
  git commit -q -m "Bump version to ${version}"
  commit="$(git rev-parse HEAD)"
  echo "Bump commit ${commit:0:7} created."
fi

docker buildx build \
  --load \
  --build-arg "APP_VERSION=${version}" \
  --build-arg "APP_COMMIT=${commit}" \
  -t "${image}:${version}" \
  -t "${image}:latest" \
  .

if $dry_run; then
  echo "== Dry run finished: would tag ${commit:0:7} as ${tag} and push ${image}:${version} (+ :latest) =="
  exit 0
fi

# Push the branch before the tag so the bump commit is not only reachable through the tag.
if $bump_commit; then
  branch="$(git rev-parse --abbrev-ref HEAD)"
  git push --quiet origin "HEAD:refs/heads/${branch}"
  echo "Branch ${branch} pushed."
fi

git tag "${tag}" "${commit}"
git push --quiet origin "${tag}"

docker push "${image}:${version}"
docker push "${image}:latest"

gh release create "${tag}" --title "Curvytron ${tag}" --generate-notes

echo "== Done: ${tag} released (${image}:${version}, :latest) =="
echo "   Deploy on the VPS: change the compose service to 'image: ${image}:latest' + 'docker compose pull',"
echo "   or keep 'build: .' and deploy the tagged commit."

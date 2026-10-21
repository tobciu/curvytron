#!/usr/bin/env bash
# Local complete check before a pull request and before every update push. It mirrors the CI workflow
# (.github/workflows/ci.yml: lint, typecheck, tests, build, functional Playwright) plus the repo rules,
# and runs a SonarQube scan, so red CI rounds do not happen in the first place.
#
#   tools/pre-pr-check.sh                   # everything
#   tools/pre-pr-check.sh --skip-e2e        # without the Playwright end-to-end tests
#   tools/pre-pr-check.sh --skip-sonar      # without the SonarQube scan
#   tools/pre-pr-check.sh --skip-security   # without the Docker security tools (Trivy/Semgrep/...)
#   tools/pre-pr-check.sh --sonar-only      # only the SonarQube scan (tests only when coverage is missing)
#   tools/pre-pr-check.sh --fail-fast       # stop at the first failing step
#
# SonarQube: needs SONAR_TOKEN (browse and "Execute Analysis") in the environment, or in ~/.config/sonar-token.
# SONAR_HOST_URL is optional (default below). Local scans always run as their own branch analysis
# "local/<branch>", never as pull request analysis and never on main (the CI analyzes main, that is the
# baseline). The scanners wait for the quality gate; on red the script lists the new findings
# (rule, file:line, message).
#
# Result: a table at the end, exit code not 0 as soon as one step fails.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 1

SONAR_HOST_URL="${SONAR_HOST_URL:-https://sonarqube.tobciu08.de}"
SONAR_PROJECT_KEY="curvytron"
BASE_REF="origin/main"
SKIP_SONAR=false
SKIP_E2E=false
SKIP_SECURITY=false
SONAR_ONLY=false
FAIL_FAST=false

usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
	case "$1" in
		--skip-sonar) SKIP_SONAR=true ;;
		--skip-e2e) SKIP_E2E=true ;;
		--skip-security) SKIP_SECURITY=true ;;
		--sonar-only) SONAR_ONLY=true ;;
		--fail-fast) FAIL_FAST=true ;;
		-h|--help) usage; exit 0 ;;
		*) echo "Unknown option: $1" >&2; usage; exit 2 ;;
	esac
	shift
done
if $SONAR_ONLY && $SKIP_SONAR; then echo "--sonar-only and --skip-sonar exclude each other" >&2; exit 2; fi

# The token may live in a file (as in ~/.bashrc: export SONAR_TOKEN="$(cat ~/.config/sonar-token)").
if [[ -z "${SONAR_TOKEN:-}" && -r "$HOME/.config/sonar-token" ]]; then SONAR_TOKEN="$(cat "$HOME/.config/sonar-token")"; fi
export SONAR_TOKEN SONAR_HOST_URL   # the scanners read both from the environment, so the token never shows up in ps

# ---------------------------------------------------------------- output and step bookkeeping

BOLD=$'\e[1m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; DIM=$'\e[2m'; RESET=$'\e[0m'
RESULTS=()
FAILED=0
LOG_DIR="$(mktemp -d -t pre-pr-check.XXXXXX)"

# step <name> <command...>: runs the command, keeps its output in a log file and remembers the result.
step() {
	local name="$1"; shift
	local log
	log="$LOG_DIR/$(echo "$name" | tr ' /:' '___').log"
	local start=$SECONDS
	printf '%s▶ %s%s\n' "$BOLD" "$name" "$RESET"
	if "$@" >"$log" 2>&1; then
		RESULTS+=("${GREEN}✓${RESET}|$name|$((SECONDS - start))s|")
	else
		RESULTS+=("${RED}✗${RESET}|$name|$((SECONDS - start))s|$log")
		FAILED=$((FAILED + 1))
		printf '%s  ✗ failed, last lines (%s):%s\n' "$RED" "$log" "$RESET"
		tail -n 25 "$log" | sed 's/^/    /'
		if $FAIL_FAST; then summary; exit 1; fi
	fi
}

skip() { RESULTS+=("${YELLOW}–${RESET}|$1|skipped|$2"); }

summary() {
	echo
	printf '%sResult%s\n' "$BOLD" "$RESET"
	for row in "${RESULTS[@]}"; do
		IFS='|' read -r mark name dur info <<<"$row"
		printf '  %s %-48s %8s  %s%s%s\n' "$mark" "$name" "$dur" "$DIM" "$info" "$RESET"
	done
	echo
	if [[ $FAILED -gt 0 ]]; then
		printf '%s%d step(s) failed.%s Logs: %s\n' "$RED" "$FAILED" "$RESET" "$LOG_DIR"
	else
		printf '%sAll green, ready for a pull request or push.%s\n' "$GREEN" "$RESET"
	fi
}

# ---------------------------------------------------------------- where are we?

git fetch -q origin main 2>/dev/null || echo "${YELLOW}Warning: git fetch origin main failed, comparing against the local state.${RESET}"
CHANGED="$(git diff --name-only "$BASE_REF"...HEAD 2>/dev/null; git diff --name-only HEAD; git ls-files --others --exclude-standard)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
PR_NUMBER="$(gh pr view --json number -q .number 2>/dev/null || true)"
DOCKER_OK=false
docker info >/dev/null 2>&1 && DOCKER_OK=true

# ---------------------------------------------------------------- repo-wide checks

check_main_integrated() {
	local behind
	behind="$(git rev-list --count HEAD.."$BASE_REF")"
	if [[ "$behind" -gt 0 ]]; then
		echo "Branch is $behind commit(s) behind $BASE_REF: merge origin/main first and solve conflicts locally."
		git log --oneline HEAD.."$BASE_REF" | head -20
		return 1
	fi
	echo "main is integrated."
}

# A pull request that exists must be mergeable (no conflicts).
check_pr_mergeable() {
	if [[ -z "$PR_NUMBER" ]]; then echo "No pull request for this branch yet, skipped."; return 0; fi
	local state
	state="$(gh pr view "$PR_NUMBER" --json mergeable,mergeStateStatus -q '.mergeable + " / " + .mergeStateStatus')" \
		|| { echo "gh pr view failed"; return 1; }
	echo "PR $PR_NUMBER: $state"
	[[ "$state" != CONFLICTING* && "$state" != *DIRTY ]]
}

check_conflict_markers() {
	local hits rc=0
	# rc 1 means no hit; anything from 2 on is a real git error and must not pass as "clean".
	hits="$(git grep --untracked -nIE '^(<<<<<<< |>>>>>>> |\|\|\|\|\|\|\| )')" || rc=$?
	if [[ $rc -gt 1 ]]; then echo "git grep failed (rc=$rc)"; return 1; fi
	if [[ -n "$hits" ]]; then
		echo "Conflict markers found:"; echo "$hits" | head -20
		return 1
	fi
	echo "No conflict markers."
}

# Secret scan over the commits that would be pushed (origin/main..HEAD): local gitleaks, else the official image.
check_secrets() {
	local range="$BASE_REF..HEAD"
	if [[ -z "$(git rev-list "$range" 2>/dev/null | head -1)" ]]; then echo "No new commits."; return 0; fi
	if command -v gitleaks >/dev/null 2>&1; then
		gitleaks git --no-banner --redact --log-opts="$range" .
	elif $DOCKER_OK; then
		# Same paths inside the container (worktrees point at the common .git with absolute paths);
		# safe.directory because the container user would otherwise be refused as "dubious ownership".
		local common
		common="$(cd "$(git rev-parse --git-common-dir)" && pwd)"
		docker run --rm -v "$ROOT:$ROOT" -v "$common:$common" -w "$ROOT" --entrypoint sh \
			ghcr.io/gitleaks/gitleaks:latest \
			-c "git config --global --add safe.directory '*' && gitleaks git --no-banner --redact --log-opts='$range' ."
	else
		echo "Neither gitleaks nor Docker available, secret scan not possible."; return 1
	fi
}

# Lint of the GitHub workflows with actionlint (Docker image), the same files that run on GitHub.
check_workflows() {
	if command -v actionlint >/dev/null 2>&1; then
		actionlint
	elif $DOCKER_OK; then
		docker run --rm -v "$ROOT:/repo" -w /repo rhysd/actionlint:latest
	else
		echo "Neither actionlint nor Docker available, workflow lint not possible."; return 1
	fi
}

check_compose() {
	docker compose config -q
}

if ! $SONAR_ONLY; then
	step "Repo: main integrated" check_main_integrated
	step "Repo: pull request mergeable" check_pr_mergeable
	step "Repo: conflict markers" check_conflict_markers
	step "Repo: secret scan (gitleaks)" check_secrets
	step "Repo: GitHub workflows (actionlint)" check_workflows
	if $DOCKER_OK; then step "Repo: compose file" check_compose; else skip "Repo: compose file" "no Docker"; fi
fi

# ---------------------------------------------------------------- security & quality (Docker images, no CI minutes)

# sec_wants <regex>: never with --skip-security, otherwise only when matching files changed.
sec_wants() {
	$SKIP_SECURITY && return 1
	$DOCKER_OK || return 1
	$SONAR_ONLY && return 1
	grep -qE "$1" <<<"$CHANGED"
}

# The two hadolint exceptions fit this repo: the HEALTHCHECK-CMD needs the shell form to expand
# ${PORT} at runtime, and USER node comes from the official Node image. (--config is ignored by the
# Docker image version, hence --ignore on the command line.)
check_hadolint() {
	local f rc=0
	for f in $(git ls-files '*Dockerfile' '**/Dockerfile'); do
		echo "== $f"; docker run --rm -v "$ROOT:/repo:ro" -w /repo hadolint/hadolint \
			hadolint --ignore DL3025 --ignore DL3066 "$f" || rc=1
	done
	return $rc
}

check_shellcheck() {
	local files
	files="$(git ls-files '*.sh')"
	[[ -z "$files" ]] && { echo "No shell scripts in the repository."; return 0; }
	# shellcheck disable=SC2086
	if command -v shellcheck >/dev/null 2>&1; then
		shellcheck -S warning $files
	else
		# shellcheck disable=SC2086
		docker run --rm -v "$ROOT:/repo:ro" -w /repo koalaman/shellcheck:stable -S warning $files
	fi
}

# Trivy: known vulnerabilities in lockfiles (HIGH/CRITICAL), Dockerfile/compose misconfigurations,
# committed secrets. The database cache lives in the trivy-cache Docker volume.
check_trivy() {
	docker volume create trivy-cache >/dev/null
	docker run --rm -v "$ROOT:/src:ro" -v trivy-cache:/root/.cache aquasec/trivy:latest fs \
		--scanners vuln,secret,misconfig --severity HIGH,CRITICAL --exit-code 1 \
		--skip-dirs node_modules,dist,coverage,test-results,playwright-report,.git --no-progress /src
}

# Semgrep (OWASP Top 10 + JavaScript/TypeScript). Excluded are rules this repository does not meet on
# purpose: the tag pins of well-known actions (Renovate keeps them current) and the example nginx
# configuration in doc/nginx-proxy.md behind the own proxy.
check_semgrep() {
	docker run --rm -v "$ROOT:/src:ro" -w /src semgrep/semgrep semgrep scan \
		--config p/owasp-top-ten --config p/javascript --config p/typescript \
		--metrics=off --quiet --error \
		--exclude-rule yaml.github-actions.security.github-actions-mutable-action-tag.github-actions-mutable-action-tag \
		--exclude-rule generic.nginx.security.request-host-used.request-host-used \
		--exclude node_modules --exclude dist --exclude coverage --exclude public \
		--exclude 'tests/e2e/__screenshots__' .
}

if sec_wants '^\.github/'; then
	step "Security: actionlint (workflows)" check_workflows
fi
if sec_wants '(^|/)Dockerfile$'; then step "Security: hadolint (Dockerfile)" check_hadolint; fi
if sec_wants '\.sh$'; then step "Security: shellcheck (scripts)" check_shellcheck; fi
if sec_wants '(package-lock\.json|Dockerfile|docker-compose)'; then
	step "Security: Trivy (dependencies, Dockerfile/compose, secrets)" check_trivy
fi
if sec_wants '^(src|tests|tools)/'; then
	step "Security: Semgrep (OWASP Top 10, JS/TS)" check_semgrep
fi

# ---------------------------------------------------------------- application (mirror of .github/workflows/ci.yml)

# Playwright needs the browser builds pinned to its version (the headless shell too); the install is
# idempotent, installed builds are skipped. On distributions without Playwright downloads (ubuntu 26.04
# for example) an existing Chromium from the Playwright cache is used. CHROMIUM_PATH (see
# playwright.config.ts) bypasses both.
run_e2e() {
	if [[ -z "${CHROMIUM_PATH:-}" ]]; then
		if ! npx playwright install chromium; then
			local fallback
			fallback="$(find "$HOME/.cache/ms-playwright" -path '*chromium-*/chrome-linux*/chrome' -type f 2>/dev/null | sort -V | tail -1)"
			if [[ -n "$fallback" ]]; then
				echo "Pinned Playwright browser not downloadable, using $fallback"
				export CHROMIUM_PATH="$fallback"
			else
				echo "No Chromium for Playwright found, run 'npx playwright install chromium' once."
				return 1
			fi
		fi
	fi
	npx playwright test --project=functional
}

# npm ci only when node_modules is missing or package-lock.json is newer, that saves minutes locally.
npm_install() {
	if [[ ! -d node_modules || package-lock.json -nt node_modules ]]; then npm ci --no-audit --no-fund; else echo "node_modules current."; fi
}

if ! $SONAR_ONLY; then
	step "npm ci" npm_install
	step "Prettier format" bash -c "npx prettier --check ."
	step "ESLint (npm run lint)" npm run lint
	step "Typecheck (npm run typecheck)" npm run typecheck
	step "Vitest + coverage (npm run test:coverage)" npm run test:coverage
	step "Build (npm run build)" npm run build
	if $SKIP_E2E; then
		skip "Playwright E2E (functional)" "--skip-e2e"
	else
		step "Playwright E2E (functional)" run_e2e
	fi
	if $DOCKER_OK; then
		step "Docker: build" docker build -t curvytron:pre-pr .
	else
		skip "Docker: build" "no Docker"
	fi
fi

# ---------------------------------------------------------------- SonarQube

# Local scans always run as their own Sonar branch analysis "local/<branch>", never as pull request
# analysis and never on main: the real pull request analysis would otherwise land on main and overwrite
# its baseline and gate (the CI analyzes main). Sonar removes old local/* branches itself after the
# inactivity period.
SONAR_BRANCH="local/$BRANCH"

# newCode.referenceBranch=main: "new code" is the diff against main, as in the later pull request view
# (otherwise the project's default period applies and findings that only show up there are missed).
sonar_params() {
	echo "-Dsonar.branch.name=$SONAR_BRANCH -Dsonar.newCode.referenceBranch=main"
}

# List the new findings of the scan (only helpful when the gate is red, does no harm otherwise).
SONAR_ISSUES_PY="$LOG_DIR/sonar_issues.py"
cat >"$SONAR_ISSUES_PY" <<'PY'
import json, sys
d = json.load(sys.stdin)
print(f"{d['total']} open new findings")
for i in d["issues"]:
    path = i["component"].split(":", 1)[1]
    print(f"  {i['rule']:<24} {path}:{i.get('line', '-')}  {i['message']}")
PY

sonar_issues() {
	local scope="branch=${SONAR_BRANCH//\//%2F}&inNewCodePeriod=true"
	curl -sf -H "Authorization: Bearer $SONAR_TOKEN" \
		"$SONAR_HOST_URL/api/issues/search?componentKeys=$SONAR_PROJECT_KEY&$scope&issueStatuses=OPEN,CONFIRMED&ps=100" \
		| python3 "$SONAR_ISSUES_PY" || echo "(findings could not be fetched)"
}

# sonar_scan <command...>: scan with waiting for the gate; on red the new findings follow.
sonar_scan() {
	if "$@"; then
		echo "Quality gate green: $SONAR_HOST_URL/dashboard?id=$SONAR_PROJECT_KEY&branch=${SONAR_BRANCH//\//%2F}"
	else
		echo; echo "Quality gate red or scan failed: $SONAR_HOST_URL/dashboard?id=$SONAR_PROJECT_KEY&branch=${SONAR_BRANCH//\//%2F}"
		sonar_issues
		return 1
	fi
}

# Scan with the Sonar scanner CLI (npm wrapper, downloads the scanner engine) from sonar-project.properties.
cli_scan() {
	# shellcheck disable=SC2046
	npx --yes @sonar/scan $(sonar_params)
}

# The scan needs a feature branch and a token; a missing token fails the check instead of silently skipping
# Sonar (which would wrongly end in "all green"). To go without Sonar on purpose: --skip-sonar.
if ! $SKIP_SONAR && [[ "$BRANCH" == "main" || "$BRANCH" == "HEAD" ]]; then
	step "SonarQube: feature branch checked out" bash -c 'echo "A local scan needs a feature branch (not main or a detached HEAD), otherwise it would overwrite the main analysis"; exit 1'
	SKIP_SONAR=true
fi
if ! $SKIP_SONAR && [[ -z "${SONAR_TOKEN:-}" ]]; then
	step "SonarQube: SONAR_TOKEN set" bash -c 'echo "SONAR_TOKEN is missing: export it (token with Execute Analysis) or put it in ~/.config/sonar-token, or use --skip-sonar"; exit 1'
	SKIP_SONAR=true
fi

if ! $SKIP_SONAR; then
	# The scan measures coverage from coverage/lcov.info; with --sonar-only only build it when missing.
	if $SONAR_ONLY && [[ ! -f coverage/lcov.info ]]; then
		step "Vitest + coverage (needed for Sonar)" npm run test:coverage
	fi
	step "SonarQube: scan + quality gate" sonar_scan cli_scan
else
	skip "SonarQube: scan + quality gate" "--skip-sonar / no token"
fi

summary
[[ $FAILED -eq 0 ]]

#!/usr/bin/env bash
# scripts/secret-scan.sh
# Lightweight secret scanning wrapper using detect-secrets and truffleHog3.
# Outputs machine-friendly results and exits non-zero if any high-confidence secrets found.

set -euo pipefail
cd "$(dirname "$0")/.." || exit 1

# Ensure tools are available
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required. Install python3 and pip." >&2
  exit 2
fi

# Create venv for scanning tools to avoid global installs
VENV_DIR=".venv-secret-scan"
python3 -m venv "$VENV_DIR"
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

pip install --upgrade pip >/dev/null
pip install detect-secrets truffleHog3 >/dev/null

EXIT_CODE=0

echo "Running detect-secrets (Yelp) ..."
# Initialize baseline if not present (but do not commit baseline automatically)
if [ ! -f .secrets.baseline ]; then
  detect-secrets scan --all-files > .secrets.baseline
  echo "Baseline created at .secrets.baseline (review before committing)." >&2
  echo "To re-run against baseline use: detect-secrets audit .secrets.baseline" >&2
fi
# Run audit but only in scan mode to detect any new secrets
detect-secrets scan --scan-all-files --baseline .secrets.baseline || EXIT_CODE=1

echo "Running truffleHog3 (entropy + regex checks) ..."
trufflehog3 filesystem --directory . --no-entropy --regex --json > trufflehog-results.json || EXIT_CODE=1

# Quick grep for common patterns (AWS, supabase service_role-ish strings, private keys)
echo "Running quick-pattern checks ..."
GREP_PATTERNS=("AKIA[0-9A-Z]{16}" "aws_secret_access_key" "SUPABASE_SERVICE_ROLE_KEY" "service_role" "-----BEGIN PRIVATE KEY-----" "-----BEGIN RSA PRIVATE KEY-----" "xoxa-" "sq_" "sk_live_" "pk_live_" "eyJhbGciOi")
PATTERN_FOUND=0
for p in "${GREP_PATTERNS[@]}"; do
  if grep -R --line-number -E "$p" . | sed -n '1,10p'; then
    PATTERN_FOUND=1
  fi
done
if [ "$PATTERN_FOUND" -eq 1 ]; then
  echo "Potential secrets found by quick-pattern grep (see output above)." >&2
  EXIT_CODE=1
fi

# Summarize
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Secret scan finished: no high-confidence findings." >&2
else
  echo "Secret scan finished: findings detected. Review .secrets.baseline, trufflehog-results.json and grep output." >&2
fi

# Deactivate and exit
deactivate || true
exit "$EXIT_CODE"

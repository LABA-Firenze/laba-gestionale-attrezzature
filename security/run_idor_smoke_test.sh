#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://attrezzatura.laba.biz}"
USER_EMAIL="${2:-}"
USER_PASSWORD="${3:-}"
SELF_USER_ID="${4:-}"
OTHER_USER_ID="${5:-}"

if [[ -z "$USER_EMAIL" || -z "$USER_PASSWORD" || -z "$SELF_USER_ID" || -z "$OTHER_USER_ID" ]]; then
  echo "Usage: $0 <base_url> <user_email> <user_password> <self_user_id> <other_user_id>"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "== Login user =="
curl -sS -i -c "$TMP_DIR/user.cookies" \
  -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}" \
  > "$TMP_DIR/login.txt"
grep -E "^HTTP/" "$TMP_DIR/login.txt" || true

echo "== IDOR check /api/penalties/user/<self> =="
curl -sS -i -b "$TMP_DIR/user.cookies" \
  "$BASE_URL/api/penalties/user/$SELF_USER_ID" \
  > "$TMP_DIR/self.txt"
grep -E "^HTTP/" "$TMP_DIR/self.txt" || true

echo "== IDOR check /api/penalties/user/<other> =="
curl -sS -i -b "$TMP_DIR/user.cookies" \
  "$BASE_URL/api/penalties/user/$OTHER_USER_ID" \
  > "$TMP_DIR/other.txt"
grep -E "^HTTP/" "$TMP_DIR/other.txt" || true

echo
echo "Expected: self=200 and other=403"

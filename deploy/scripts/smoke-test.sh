#!/usr/bin/env bash
set -euo pipefail

: "${HOURIE_BASE_URL:?Set HOURIE_BASE_URL to the deployed HTTPS origin}"

base_url="${HOURIE_BASE_URL%/}"
smoke_tmp="$(mktemp -d)"
trap 'rm -rf "${smoke_tmp}"' EXIT

if [[ "${base_url}" != https://* ]]; then
    echo "HOURIE_BASE_URL must use HTTPS." >&2
    exit 1
fi

request_status() {
    local path="$1"
    local output="$2"
    local headers="$3"

    curl \
        --silent \
        --show-error \
        --location \
        --retry 2 \
        --connect-timeout 10 \
        --max-time 30 \
        --output "${output}" \
        --dump-header "${headers}" \
        --write-out '%{http_code}' \
        "${base_url}${path}"
}

assert_status() {
    local label="$1"
    local path="$2"
    local expected="$3"
    local body="${smoke_tmp}/${label}.body"
    local headers="${smoke_tmp}/${label}.headers"
    local actual

    actual="$(request_status "${path}" "${body}" "${headers}")"

    if [[ "${actual}" != "${expected}" ]]; then
        echo "FAIL: ${label} returned ${actual}; expected ${expected}." >&2
        exit 1
    fi

    echo "PASS: ${label} (${actual})"
}

assert_status frontend / 200
assert_status laravel-health /up 200
assert_status api-health /api/health 200
assert_status csrf-cookie /sanctum/csrf-cookie 204
assert_status protected-route /api/v1/auth/user 401

if ! grep -Eiq '^strict-transport-security:' "${smoke_tmp}/frontend.headers"; then
    echo "FAIL: Strict-Transport-Security is missing from the HTTPS response." >&2
    exit 1
fi

if ! grep -Eiq '^x-content-type-options:[[:space:]]*nosniff' "${smoke_tmp}/frontend.headers"; then
    echo "FAIL: X-Content-Type-Options is missing or invalid." >&2
    exit 1
fi

echo "Production smoke test passed for ${base_url}."

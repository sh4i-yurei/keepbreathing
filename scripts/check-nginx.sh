#!/usr/bin/env bash
set -euo pipefail

read -r -a engine <<< "${ENGINE:-podman}"
run_engine() { "${engine[@]}" "$@"; }

repo=$(pwd)
if [[ ! -f "$repo/deploy/nginx/nginx.conf" || ! -d "$repo/site" ]]; then
    echo 'check-nginx: run from the repository root' >&2
    exit 1
fi

scratch=$(mktemp -d)
name="check-nginx-$$"
network="$name"
cleanup() {
    run_engine rm -f "$name-web" "$name-api" >/dev/null 2>&1 || true
    run_engine network rm "$network" >/dev/null 2>&1 || true
    rm -f "$scratch/origin.key" "$scratch/origin.pem" "$scratch/body" "$scratch/headers"
    rmdir "$scratch"
}
trap cleanup EXIT

nginx_image='docker.io/library/nginx:alpine@sha256:1d40e3eb3bf4f138de1d67193f2aa5309fcaf343eb5ffadbf5e9439de1eb1ebb'
python_image='docker.io/library/python:3.13-alpine@sha256:42825e7ec3437b3bce923c237484eb23d32128476e18307d2f48951bf86f1db2'
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=keepbreath.ing' \
    -keyout "$scratch/origin.key" -out "$scratch/origin.pem" >/dev/null 2>&1

mounts=(
    -v "$repo/site:/usr/share/nginx/html:ro,z"
    -v "$repo/deploy/nginx:/etc/nginx/conf:ro,z"
    -v "$scratch:/etc/nginx/certs:ro,z"
)

run_engine run --rm "${mounts[@]}" "$nginx_image" \
    nginx -t -c /etc/nginx/conf/nginx.conf
echo 'check-nginx: nginx -t passed'

run_engine network create --subnet 10.89.0.0/24 --gateway 10.89.0.1 "$network" >/dev/null
stub='from http.server import BaseHTTPRequestHandler, HTTPServer
class Handler(BaseHTTPRequestHandler):
    def do_GET(self): self.reply(200)
    def do_POST(self): self.reply(202)
    def reply(self, code):
        body = ("stub-contact-api " + self.path).encode()
        self.send_response(code)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, *args): pass
HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()'
run_engine run -d --name "$name-api" --network "$network" \
    --network-alias contact-api "$python_image" python -u -c "$stub" >/dev/null

# Wait inside the stub container. No readiness request uses nginx's /api/ limit.
ready=0
for attempt in {1..30}; do
    if run_engine exec "$name-api" python -c \
        'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8000/ready", timeout=1)' \
        >/dev/null 2>&1; then
        ready=1
        break
    fi
    sleep 1
done
if [[ "$ready" != 1 ]]; then
    echo 'ASSERTION FAILED: stub contact API did not start' >&2
    exit 1
fi

run_engine run -d --name "$name-web" --network "$network" \
    -p 127.0.0.1::80 -p 127.0.0.1::443 -p 127.0.0.1::8080 \
    "${mounts[@]}" "$nginx_image" nginx -c /etc/nginx/conf/nginx.conf -g 'daemon off;' >/dev/null
port80=$(run_engine port "$name-web" 80/tcp | sed 's/.*://')
port443=$(run_engine port "$name-web" 443/tcp | sed 's/.*://')
port8080=$(run_engine port "$name-web" 8080/tcp | sed 's/.*://')

request() {
    local scheme=$1 host=$2 port=$3 path=$4 method=${5:-GET}
    curl -ksS --retry 10 --retry-connrefused --retry-delay 1 --max-time 10 \
        --resolve "$host:$port:127.0.0.1" -X "$method" \
        -D "$scratch/headers" -o "$scratch/body" \
        -w '%{http_code}' "$scheme://$host:$port$path"
}
fail() { echo "ASSERTION FAILED: $1" >&2; exit 1; }
header() {
    local key=$1
    awk -v key="$key" 'BEGIN { IGNORECASE=1 } tolower($1)==tolower(key ":") {sub(/\r$/, ""); $1=""; sub(/^ /, ""); print}' "$scratch/headers"
}
assert_header() {
    local key=$1 expected=$2
    [[ "$(header "$key")" == "$expected" ]] || fail "$key was not exactly $expected"
}
assert_shared_headers() {
    assert_header X-Content-Type-Options nosniff
    assert_header X-Frame-Options SAMEORIGIN
    assert_header Referrer-Policy strict-origin-when-cross-origin
    assert_header Permissions-Policy 'camera=(), microphone=(), geolocation=()'
    assert_header Content-Security-Policy "default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; connect-src 'self' https://api.github.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
}

[[ "$(request http keepbreath.ing "$port80" /)" == 301 ]] || fail '80 / did not answer 301'
assert_header Location 'https://keepbreath.ing/'
echo 'check-nginx: 80 redirects to HTTPS'

[[ "$(request https keepbreath.ing "$port443" /)" == 200 ]] || fail '443 / did not answer 200'
assert_shared_headers
assert_header Strict-Transport-Security 'max-age=31536000; includeSubDomains'
echo 'check-nginx: 443 serves the site with six security headers'

[[ "$(request http pr-1-stage.keepbreath.ing "$port8080" /)" == 200 ]] || fail '8080 / did not answer 200'
assert_shared_headers
[[ -z "$(header Strict-Transport-Security)" ]] || fail '8080 sent HSTS'
[[ -z "$(header Location)" ]] || fail '8080 sent Location'
echo 'check-nginx: 8080 serves the site with five security headers and no redirect'

for target in "http pr-1-stage.keepbreath.ing $port8080" "https keepbreath.ing $port443"; do
    read -r scheme host port <<< "$target"
    [[ "$(request "$scheme" "$host" "$port" /api/challenge)" == 200 ]] || fail "$port /api/challenge did not answer 200"
    [[ "$(cat "$scratch/body")" == 'stub-contact-api /api/challenge' ]] || fail "$port /api/challenge body differed"
done
[[ "$(request http pr-1-stage.keepbreath.ing "$port8080" /api/contact POST)" == 202 ]] || fail '8080 /api/contact did not answer 202'
echo 'check-nginx: both API proxies reached the stub; 8080 POST answered 202'
echo 'check-nginx: all checks passed'

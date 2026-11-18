#!/bin/sh
# Forced command for the site deploy key. sshd runs only this script, whatever
# the client asks for. The key carries `restrict`, so it also has no PTY, no
# port forwarding and no agent forwarding.
#
# Runs as keepbreath1, which owns /srv/keepbreathing and the container. The
# script itself is root-owned in /usr/local/bin, so this account can execute it
# but cannot rewrite its own forced command.
set -eu

REPO=/srv/keepbreathing
cd "$REPO"

git fetch --quiet origin main
git merge --ff-only origin/main

echo "deployed $(git rev-parse --short HEAD)"

# Validate and reload on every deploy. nginx.conf includes site.conf, so a hash
# of only nginx.conf would miss a change to the shared file.
echo "validating nginx config"
podman exec keepbreath nginx -t -c /etc/nginx/conf/nginx.conf

# Reload rather than restart: nginx hands connections to new workers without
# dropping any. It sees the new file because deploy/nginx is mounted as a
# directory, so the pull is already visible inside the container.
echo "config valid; reloading nginx"
podman exec keepbreath nginx -s reload
echo "reload complete"

# Verified from the box rather than from the runner. The origin accepts 443 only
# from Cloudflare's ranges, so a GitHub runner cannot reach it directly; and
# fetching the public name from outside would test whichever machine DNS points
# at, which is not this one until the cutover. -k because the origin certificate
# is a Cloudflare origin cert rather than one signed by a public CA.
echo "verifying the site responds"
code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 \
    --resolve keepbreath.ing:443:127.0.0.1 https://keepbreath.ing/)
if [ "$code" != "200" ]; then
    echo "site returned HTTP $code after deploy" >&2
    exit 1
fi
echo "site responded 200"

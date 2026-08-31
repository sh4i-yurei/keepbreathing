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

before=$(sha256sum deploy/nginx/nginx.conf | cut -d' ' -f1)

git fetch --quiet origin main
git merge --ff-only origin/main

after=$(sha256sum deploy/nginx/nginx.conf | cut -d' ' -f1)
echo "deployed $(git rev-parse --short HEAD)"

# Validated on every deploy, not only when the file changed. A config that failed
# validation stays on disk, and a later deploy that does not touch it would skip
# the check and report success while the container still holds a config it would
# refuse to start from after a reboot.
echo "validating nginx config"
podman exec keepbreath nginx -t -c /etc/nginx/conf/nginx.conf

if [ "$before" = "$after" ]; then
    echo "nginx.conf unchanged; no reload needed"
    exit 0
fi

# Reload rather than restart: nginx hands connections to new workers without
# dropping any. It sees the new file because deploy/nginx is mounted as a
# directory, so the pull is already visible inside the container.
echo "config valid; reloading nginx"
podman exec keepbreath nginx -s reload
echo "reload complete"

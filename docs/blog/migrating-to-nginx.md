# Deploying keepbreath.ing with nginx  (working title)

Tags: #homelab #networking #security

> Draft / running log. We fill each section in as we actually do the work, so
> the post is written from real steps instead of from memory. Section status:
> [done] / [todo].

## The starting point  [done]

- Where the site lived before: a Hugo container plus Caddy on a DigitalOcean
  droplet, behind Cloudflare (prod and staging containers on the one box).
- I hand-coded a new site (no framework, no generator) and wanted to serve it
  properly, and to actually learn the hosting stack instead of letting a tool
  do it for me.

## Why nginx, and not Caddy  [done]

- Caddy is easier (it does automatic HTTPS), and there was even a half-built
  Caddy setup already on the box. But the point was to learn the tool I will
  run into everywhere in networking and security work: nginx. The learning and
  the demonstrable skill were the goal, not the fastest path to live.

## Getting the repo in order first  [done]

- Put the site under git and on GitHub.
- Split a private planning doc out of the public README. Learned two things the
  hard way: .gitignore does not untrack a file that is already committed, and a
  force-push does not erase old commits from the host.
- Reorganized the repo into site/ (the published files), deploy/ (nginx config
  and compose), and docs/ (these drafts), so the web root is cleanly separated
  from the tooling.

## Writing the nginx config  [done, first layer]

- Wrote a **full** `nginx.conf` (top-level `events` + `http`, then a `server`
  block), not just a drop-in snippet, so nothing is hidden and I understand the
  whole structure.
- Started **minimal on purpose**: serve `site/` over plain HTTP on port 80,
  `include mime.types` so files get the right Content-Type, and
  `try_files $uri $uri/ =404`. gzip, security headers, and HTTPS come in later
  layers, one at a time — each layer tested before the next, so a break is easy
  to trace.
- `docker-compose.yml`: one `nginx:alpine` service. The key idea is to **mount**
  the site and config into the container (read-only) rather than bake them into
  a custom image — edit a file, restart, done, no rebuild. Because the paths are
  relative inside the repo, the same file runs locally and on the droplet.
- Used a test port (`8090:80`) so nothing ever touches the live site's ports.
- Still to add to this file: gzip, security headers, then the HTTPS server block.

## Testing locally with podman first  [done]

The pipeline is local -> staging -> prod: prove it on my own machine, then on
the droplet's staging, then live. Never test in production.

- Didn't install Docker. Fedora/Kinoite ships **podman** (daemonless, rootless,
  Docker-compatible, runs the same images and compose files), and installing
  Docker on an immutable OS is the wrong path. Good excuse to learn podman too.
- Ran the container by hand with `podman run` instead of compose (the compose
  provider isn't installed locally, and `run` shows exactly what compose does
  under the hood — same image, ports, and volume mounts, just as flags).
- Fedora-specific lessons: SELinux needs a `:z` flag on volume mounts or the
  container is denied read access; podman wants the **fully-qualified** image
  name (`docker.io/library/nginx:alpine`) where Docker assumes docker.io; and
  podman lives on the host, not inside my dev distrobox.
- Gotcha: after `Configuration complete; ready for start up` the terminal just
  sits there. That silence is the server **running and waiting**, not hung.
- Result: loaded `http://localhost:8090` and every file came back `200` in the
  access log — `/` (index), `styles.css`, `support.js`. The one `404` was
  `favicon.ico`, which is expected (no favicon yet). Reading those log lines
  (IP, request, status, bytes, referrer, user agent) is a small skill on its own.

## TLS the right way behind Cloudflare  [todo]

- Install a Cloudflare Origin Certificate on nginx.
- Flip the Cloudflare SSL mode from Full to Full (strict), and explain why it
  matters: Full does not validate the origin certificate, Full (strict) does.

## The cutover  [todo]

- Move nginx onto :80 and :443, stop the old Hugo container but keep it as an
  instant rollback, and verify the live site is the new one.

## Hardening  [todo]

- Restrict the droplet firewall so :80 and :443 only accept Cloudflare's IP
  ranges, so the origin is unreachable except through Cloudflare.

## What I learned  [todo]

- Fill in at the end.

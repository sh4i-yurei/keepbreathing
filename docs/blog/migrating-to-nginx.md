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

## Writing the nginx config  [todo]

- nginx.conf: serve site/, gzip, HTTP to HTTPS redirect, server_name for prod
  and staging, deny dotfiles.
- docker-compose.yml: the nginx service, volumes, ports.
- Capture what each directive does, in my own words.

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

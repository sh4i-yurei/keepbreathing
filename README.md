# keepbreath.ing

My personal site, blog, and resume.

## Design

A dark, terminal-inspired interface: monospace type, a code-editor palette, a
fake shell prompt and window chrome, and CRT touches (scanlines, a matrix-rain
and "phantom code" background, an occasional glitch). The home page plays a
typed SSH "boot" sequence before the content reveals.

## Pages

- init      (index)    — home: boot animation, intro, live stat counters
- whois     (about)    — background, education roadmap, skill areas
- make      (projects) — home lab, security tooling, and small games
- stdout    (blog)     — build notes, filterable by tag
- cat resume.txt       — skills and work history
- sendmail  (contact)  — contact form
- uptime    (journey)  — a timeline of how I got here

## JavaScript

- Matrix-rain and phantom-code canvas backgrounds, and a CRT glitch effect
- A typed SSH boot sequence on the home page
- Live counters: system uptime, graduation countdown, and total GitHub commits
  from the GitHub API
- Blog tag filter and expand/collapse accordion
- Client-side contact-form handling

## Stack

HTML, CSS, and vanilla JavaScript.

## Hosting

Runs on a DigitalOcean VPS behind Cloudflare, served by nginx in Docker. The
migration from Caddy is documented on the blog.

## Local preview

Serve the folder rather than opening the files directly, because `file://`
resolves relative paths differently and will mislead you.

```bash
cd site && python3 -m http.server 8000
```

## Tests

The site itself has no build step. Playwright is a development dependency used
only for testing, and nothing compiles the HTML.

```bash
npm install
npx playwright install chromium
npx playwright test
```

The browser test covers the contact form end to end, mocking both API endpoints
so it sends no mail and needs no backend. It exists because the form once
shipped broken: every server-side test passed while the page itself never
managed to fetch a challenge, so the assertions check that the requests
actually happened rather than only that a success message appeared.

There is also a structural check that the HTML validator does not perform:

```bash
python3 scripts/check-structure.py
```

## CI and deployment

Four checks run on every pull request:

| Check | What it does | Required |
|---|---|---|
| HTML validity | The Nu Html Checker over every page | Yes |
| Structure and assets | Tag balance, image paths resolve, no duplicate ids | Yes |
| Browser end-to-end | The Playwright test above | Yes |
| Links | Dead link check | No, advisory |

`main` is protected: the three required checks must pass, force pushes and
deletions are blocked, and administrators are not exempt.

Merging to `main` deploys automatically once CI passes. The deploy runs over an
SSH key that is restricted on the server to a single forced command, so it can
run the deploy script and nothing else. The web container is restarted only
when `deploy/nginx.conf` actually changed, and the config is validated in a
throwaway container before the live one is touched.

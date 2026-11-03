# Architecture

How the pieces of this repository fit together, and what each one must not do. When a change
doesn't fit this, change this file first, on purpose, in the same commit.

## The shape

keepbreath.ing is hand-written HTML, CSS and JavaScript in `site/`, with no build step. CI checks
every change. When a CI run on `main` passes, the Deploy workflow runs on a self-hosted runner and
tells the web server to fast-forward its checkout of `main`. nginx serves `site/` from a rootless
container and passes the contact form's `/api/` calls to the separate contact API.

## The pieces

| Piece | Responsibility | Interface | Fails how | Must not |
|---|---|---|---|---|
| `site/` | The pages, styles and browser scripts | Served as static files by nginx | — | Need a build step |
| `scripts/check-structure.py` | Structural checks the HTML validator doesn't make: tag balance, image paths that resolve, no duplicate ids | `python3 scripts/check-structure.py` | Exits non-zero and names each problem | Change the site |
| `tests/`, `playwright.config.js` | The browser test of the contact form, with both API endpoints mocked | `npx playwright test`, after `npm ci` | Fails the CI job | Send real mail or reach a real backend |
| `.github/workflows/ci.yml` | Run HTML validity, structure, the browser test and the advisory link check | GitHub Actions on every push and every pull request | A failed required job blocks the merge | Deploy anything; rename a job without updating `main`'s protection, which requires the jobs by name |
| `.github/workflows/deploy.yml` | Deploy `main` once its CI run passes, or by hand | `workflow_run` on CI completed, filtered to `main`; `workflow_dispatch` | Skips the deploy when CI failed | React to a CI run on any branch but `main` |
| `deploy/deploy-site.sh` | The deploy key's forced command on the web server: fast-forward to `origin/main`, validate the nginx config, and restart only when it changed | Run by sshd for the restricted key | Stops at the first failed step | Run a command the client asks for |
| `deploy/nginx/`, `deploy/quadlet/`, `deploy/docker-compose.yml` | The web container and its configuration | A Quadlet unit and `nginx.conf` | — | Hold a secret |
| `deploy/runner/` | The just-in-time self-hosted runner that runs Deploy | A Quadlet unit, `runner-jitconfig.sh` and `start.sh` | The container exits after one job and a fresh one starts | Let the long-lived registration credential into a container |

## Rules every piece follows

- **Third-party actions are pinned by full commit SHA.** A tag can be moved; a SHA cannot.
- **Only a passing CI run on `main` deploys.** A branch or pull request run never reaches the
  runner.
- **Tests never send mail.** The browser test mocks both contact API endpoints.
- **Nothing here holds a secret, and the repository is public.** Keep private paths and
  credentials out of every file.

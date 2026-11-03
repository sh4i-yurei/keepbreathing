# Site work

Project note: [[keepbreath.ing]]. Work handed off from another project names its own note and
buildlog in the handoff.

Read `ARCHITECTURE.md` before changing anything, and ask before opening a buildlog. The full check
is `python3 scripts/check-structure.py && npx playwright test && git diff --check`, after `npm ci`
and `npx playwright install chromium`. CI also validates every `site/*.html` page with the Nu Html
Checker, fetched and verified the way `ci.yml` does it, and runs an advisory link check. CI runs
on every push and every pull request; only a passing run on `main` deploys. The Playwright
contact-form test mocks both API endpoints. A production submission sends real mail and needs
deliberate authorisation.

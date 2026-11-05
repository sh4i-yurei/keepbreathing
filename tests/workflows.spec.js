import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');
const readme = readFileSync('README.md', 'utf8');

test('CI runs on every push only', () => {
  expect(ci).toMatch(/^on:\n  push: \{\}\n\n/m);
  expect(ci).not.toContain('pull_request');
});

test('deploy remains limited to successful main CI runs or manual dispatch', () => {
  expect(deploy).toContain(
    'on:\n' +
    '  workflow_run:\n' +
    '    workflows: [CI]\n' +
    '    types: [completed]\n' +
    '    branches: [main]\n' +
    '  # Manual escape hatch, for when the droplet was unreachable during the\n' +
    '  # automatic run. It deploys whatever is currently on main. That is safe\n' +
    '  # because main is protected and cannot hold a commit that failed CI, but it\n' +
    '  # does skip the conclusion check below, so it is a deliberate bypass.\n' +
    '  workflow_dispatch:\n\n'
  );
  expect(deploy).toContain(
    "    if: >-\n      ${{ github.event_name == 'workflow_dispatch' ||\n" +
    "          github.event.workflow_run.conclusion == 'success' }}"
  );
});

test('README describes CI on pushes and main-only deployment', () => {
  expect(readme).toContain('Four checks run on every push:');
  expect(readme).not.toContain('every pull request');
  expect(readme).toContain('Merging to `main` deploys automatically once CI passes.');
});

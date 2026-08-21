// End-to-end test for the contact form, driven in a real browser.
//
// This exists because the form once shipped dead: every server-side test passed
// while the page itself never managed to fetch a challenge. Testing the server
// proves the server works, not that the feature works.
//
// Both API endpoints are mocked, so this sends no real mail and needs no backend.
// The assertions that matter are the ones checking the requests actually happened —
// a test that only looks for the success message would pass against a page that
// never contacted the API at all, which is exactly the bug this guards against.

import { test, expect } from '@playwright/test';

// A well-formed challenge in the shape this site's API returns: PBKDF2/SHA-256
// with a nested `parameters` object. The signature is carried through by the
// widget and only verified server-side, so a placeholder is fine here.
// `expiresAt` must be in the future or the widget rejects the challenge.
function mockChallenge() {
  return {
    parameters: {
      algorithm: 'PBKDF2/SHA-256',
      cost: 5000,
      expiresAt: Math.floor(Date.now() / 1000) + 600,
      keyLength: 32,
      keyPrefix: '00',
      nonce: 'afa75511d15e71172dba178530381d08',
      salt: 'e68e93b5817800cf2db5cfb675cd4ec1',
    },
    signature: 'test-signature-not-verified-client-side',
  };
}

/** Install both API mocks and return counters describing what was called. */
async function mockApi(page, { contactStatus = 202, contactBody = { ok: true } } = {}) {
  const calls = { challenge: 0, contact: 0, payload: null };

  await page.route('**/api/challenge', async (route) => {
    calls.challenge += 1;
    await route.fulfill({ json: mockChallenge() });
  });

  await page.route('**/api/contact', async (route) => {
    calls.contact += 1;
    calls.payload = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({ status: contactStatus, json: contactBody });
  });

  return calls;
}

async function fillForm(page, over = {}) {
  await page.fill('#cf-name', over.name ?? 'Playwright Test');
  await page.fill('#cf-email', over.email ?? 'visitor@example.com');
  await page.fill('#cf-message', over.message ?? 'Automated end-to-end check.');
}

test.describe('contact form', () => {
  test('completes a real submission end to end', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    const calls = await mockApi(page);
    await page.goto('/contact.html');
    await fillForm(page);
    await page.click('button[type="submit"]');

    // The widget solves a proof of work before submitting, which takes about a second.
    await expect(page.locator('#cf-result')).toHaveClass(/cf-ok/, { timeout: 30_000 });
    await expect(page.locator('#cf-result')).toContainText(/sent/i);

    // The assertions that actually matter.
    expect(calls.challenge, 'the widget never fetched a challenge').toBeGreaterThan(0);
    expect(calls.contact, 'the form never posted to /api/contact').toBe(1);

    // The payload must carry a solved ALTCHA token, not an empty field.
    expect(calls.payload.altcha, 'no ALTCHA token in the payload').toBeTruthy();
    expect(calls.payload.name).toBe('Playwright Test');
    expect(calls.payload.email).toBe('visitor@example.com');

    expect(consoleErrors.join('\n')).not.toMatch(/altcha|verification failed|content-type/i);
  });

  test('surfaces an error when the API rejects the message', async ({ page }) => {
    const calls = await mockApi(page, { contactStatus: 400, contactBody: { error: 'Nope.' } });
    await page.goto('/contact.html');
    await fillForm(page);
    await page.click('button[type="submit"]');

    await expect(page.locator('#cf-result')).toHaveClass(/cf-error/, { timeout: 30_000 });
    expect(calls.contact).toBe(1);
  });

  test('honeypot field is off-screen, unfocusable and hidden from assistive tech', async ({ page }) => {
    await page.goto('/contact.html');
    const pot = page.locator('#cf-website');
    await expect(pot).toHaveCount(1);

    // The field is positioned off-screen rather than display:none, deliberately —
    // some bots skip display:none inputs, and this one is meant to be filled in.
    // So the check is that a person cannot see or reach it, not that it is "hidden".
    const box = await pot.boundingBox();
    expect(box.x + box.width, 'honeypot is not off-screen').toBeLessThan(0);

    // Not reachable by keyboard, and hidden from screen readers.
    await expect(pot).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('.hp-field')).toHaveAttribute('aria-hidden', 'true');
  });

  test('a filled honeypot is submitted so the API can drop it', async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto('/contact.html');
    await fillForm(page);
    // Simulate a naive bot filling every field it finds.
    await page.locator('#cf-website').fill('http://spam.example');
    await page.click('button[type="submit"]');

    await expect(page.locator('#cf-result')).toHaveClass(/cf-ok|cf-error/, { timeout: 30_000 });
    expect(calls.payload.website, 'honeypot value never reached the API').toBe('http://spam.example');
  });
});

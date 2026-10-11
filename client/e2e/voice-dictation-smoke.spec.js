import { expect, test } from '@playwright/test';

// Smoke for the voice-dictation feature (Web Speech API). Real speech can't be
// driven headlessly, so these tests pin the UI contract instead: the mic
// buttons render next to the documentation fields, the floating capture button
// follows the mobile-only rule, and a browser without Web Speech support falls
// back to disabled buttons + a type-manually dialog.

const therapistUsername = process.env.E2E_THERAPIST_USERNAME;
const therapistPassword = process.env.E2E_THERAPIST_PASSWORD;

async function authenticateTherapist(request, context) {
  test.skip(!therapistUsername || !therapistPassword, 'Therapist test credentials were not provided.');

  const loginResponse = await request.post('/api/auth/login', {
    data: { username: therapistUsername, password: therapistPassword }
  });
  expect(loginResponse.ok()).toBeTruthy();
  const session = await loginResponse.json();

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('wisecare_token', token);
    localStorage.setItem('wisecare_user', JSON.stringify(user));
    localStorage.setItem('wisecare_pwa_dismissed', Date.now().toString());
  }, session);

  return session;
}

// Simulates iOS Safari and other browsers that lack the Web Speech API.
async function stripWebSpeech(page) {
  await page.addInitScript(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });
}

test('mic buttons render next to the documentation fields', async ({ page, request, context }) => {
  const session = await authenticateTherapist(request, context);
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`/crm/${session.user.loginCode}/clients`);

  // Desktop viewport must not show the floating capture button.
  await expect(page.locator('button[aria-label="פתק קולי חדש"]')).toBeHidden();

  // New-client modal: intake notes carries a dictation mic.
  await page.getByRole('button', { name: 'לקוח חדש' }).click();
  const intakeNotes = page.getByRole('textbox', { name: /נושאי פנייה מרכזיים/ });
  await expect(intakeNotes).toBeVisible();
  await expect(page.locator('button[aria-label="הכתבה קולית לשדה זה"]').first()).toBeVisible();
});

test('browser without Web Speech falls back gracefully everywhere', async ({ page, request, context }) => {
  const session = await authenticateTherapist(request, context);
  await stripWebSpeech(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/crm/${session.user.loginCode}/clients`);

  // Fields' mic buttons render disabled with the explanatory tooltip.
  await page.getByRole('button', { name: 'לקוח חדש' }).click();
  const mic = page.locator('button[aria-label="הכתבה קולית לשדה זה"]').first();
  await expect(mic).toBeVisible();
  await expect(mic).toBeDisabled();
  await expect(mic).toHaveAttribute('title', /לא תומך בהכתבה/);

  // Floating capture: mobile viewport shows it; tapping opens the routing
  // dialog with the unsupported-browser notice and a manual-typing textarea.
  const fab = page.locator('button[aria-label="פתק קולי חדש"]');
  await expect(fab).toBeVisible();
  // The Next.js dev overlay can sit on top of the FAB in next dev — remove it.
  await page.evaluate(() => document.querySelector('nextjs-portal')?.remove());
  await fab.click();

  const dialog = page.getByRole('dialog', { name: 'שיוך תיעוד קולי' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/לא תומך בהכתבה קולית/)).toBeVisible();

  // Manual typing still works, and saving without a client is blocked with a
  // clear Hebrew message instead of writing anything.
  await dialog.getByRole('textbox', { name: /הטקסט המתומלל/ }).fill('תיעוד ידני לבדיקה');
  await dialog.getByRole('button', { name: 'שמור תיעוד' }).click();
  await expect(dialog.getByText('בחרו לקוח לשיוך התיעוד.')).toBeVisible();

  await dialog.getByRole('button', { name: 'ביטול' }).click();
  await expect(dialog).toBeHidden();
});

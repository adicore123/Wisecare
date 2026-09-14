import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const therapistUsername = process.env.E2E_THERAPIST_USERNAME;
const therapistPassword = process.env.E2E_THERAPIST_PASSWORD;
const portalCode = process.env.E2E_PORTAL_CODE;
const featuredContentId = process.env.E2E_CONTENT_ID;
const screenshotDir = process.env.QA_SCREENSHOT_DIR;

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

test('therapist content library is RTL, responsive, and keyboard-ready', async ({ page, request, context }) => {
  const session = await authenticateTherapist(request, context);

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`/crm/${session.user.loginCode}/content`);

  await expect(page.getByRole('heading', { name: 'תוכן נכון, למטופל הנכון' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'הוספת תוכן' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'טבלת הספרייה הטיפולית' })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('direction', 'rtl');

  const primaryButtonHeight = await page.getByRole('button', { name: 'הוספת תוכן' }).evaluate(element => element.getBoundingClientRect().height);
  expect(primaryButtonHeight).toBeGreaterThanOrEqual(40);

  const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasPageOverflow).toBeFalsy();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(violation => ['critical', 'serious'].includes(violation.impact))).toEqual([]);

  if (screenshotDir) {
    await page.screenshot({ path: `${screenshotDir}/content-library-desktop.png`, fullPage: true });
  }

  await page.getByRole('button', { name: 'שיוך ושליחה' }).first().click();
  const assignmentDialog = page.getByRole('dialog', { name: /למי לשייך או לשלוח שוב/ });
  await expect(assignmentDialog).toBeVisible();
  const drawerBox = await assignmentDialog.boundingBox();
  expect(drawerBox?.x).toBeLessThanOrEqual(1);
  expect(drawerBox?.height).toBeGreaterThanOrEqual(900);

  if (screenshotDir) {
    await page.screenshot({ path: `${screenshotDir}/content-assignment-drawer.png`, fullPage: true });
  }
});

test('shared therapist shell renders the core workspace routes', async ({ page, request, context }) => {
  const session = await authenticateTherapist(request, context);
  await page.setViewportSize({ width: 1440, height: 1024 });

  const routes = [
    `/crm/${session.user.loginCode}`,
    `/crm/${session.user.loginCode}/appointments`,
    `/crm/${session.user.loginCode}/settings`
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('.page-header').first()).toBeVisible();
    const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(hasPageOverflow).toBeFalsy();
  }

  if (screenshotDir) {
    await page.goto(`/crm/${session.user.loginCode}`);
    await page.screenshot({ path: `${screenshotDir}/clients-desktop.png`, fullPage: true });
  }
});

test('patient deep link opens the shared content at a phone viewport', async ({ page }) => {
  test.skip(!portalCode || !featuredContentId, 'Portal visual fixture was not provided.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/portal/${portalCode}?tab=content&content=${featuredContentId}`);

  await expect(page.getByText('התוכן שנשלח אליך עכשיו')).toBeVisible();
  await expect(page.locator(`#portal-content-${featuredContentId}`)).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('direction', 'rtl');

  const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasPageOverflow).toBeFalsy();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(violation => ['critical', 'serious'].includes(violation.impact))).toEqual([]);

  if (screenshotDir) {
    await page.screenshot({ path: `${screenshotDir}/patient-content-mobile.png`, fullPage: true });
  }

  for (const viewport of [{ width: 375, height: 812 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator(`#portal-content-${featuredContentId}`)).toBeVisible();
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflows).toBeFalsy();
  }
});

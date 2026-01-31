import { test, expect, Page } from "@playwright/test";

/**
 * Helper to login to the private dashboard
 */
async function login(page: Page, baseUrl: string) {
  const password = process.env.TEST_PASSWORD;
  if (!password) {
    throw new Error("TEST_PASSWORD environment variable is required");
  }

  // Navigate to private dashboard
  await page.goto(`${baseUrl}/ge8d9nH$,1xOMk_`);

  // Fill password and submit
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for login to complete - should see the dashboard
  await expect(page.locator("text=TODO List")).toBeVisible({ timeout: 15000 });
}

/**
 * Helper to generate unique test TODO text
 */
function generateTestTodoText(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `[TEST] E2E Todo - ${timestamp}`;
}

/**
 * Helper to open TODO sidebar on mobile/tablet
 */
async function ensureSidebarOpen(page: Page) {
  // Check if we need to open the sidebar (mobile view)
  const sidebar = page.locator('h2:has-text("TODO List")');
  if (!(await sidebar.isVisible())) {
    // Look for a button that toggles the sidebar
    const toggleBtn = page.locator('button[aria-label*="todo"], button:has-text("TODO")');
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await expect(sidebar).toBeVisible();
    }
  }
}

export { login, generateTestTodoText, ensureSidebarOpen };

import { expect, Page } from "@playwright/test";

const LOCAL_URL = "http://localhost:8888";
const NETLIFY_URL = "https://develop--dashboard0x.netlify.app";

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

/**
 * Helper to get auth token after login (for API calls)
 */
async function getAuthToken(page: Page, baseUrl: string): Promise<string> {
  const password = process.env.TEST_PASSWORD;
  if (!password) {
    throw new Error("TEST_PASSWORD environment variable is required");
  }

  // Call auth API to get token (correct endpoint is /api/auth/verify)
  const response = await page.request.post(`${baseUrl}/api/auth/verify`, {
    data: { password },
  });

  if (!response.ok()) {
    throw new Error(`Auth failed: ${response.status()}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Helper to fetch TODOs count from API
 */
async function getTodosFromApi(
  page: Page,
  baseUrl: string,
  token: string
): Promise<{ count: number; todos: Array<{ id: string; text: string }> }> {
  const response = await page.request.get(`${baseUrl}/api/todos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to fetch todos: ${response.status()}`);
  }

  const data = await response.json();
  return {
    count: data.todos?.length || 0,
    todos: data.todos || [],
  };
}

/**
 * Helper to verify a service card shows "Operational" status (not error)
 */
async function verifyServiceCardOperational(page: Page, cardTitle: string) {
  const card = page.locator(`div:has(h3:has-text("${cardTitle}"))`).first();
  await expect(card).toBeVisible({ timeout: 15000 });

  // Check for "Operational" status indicator
  const operationalStatus = card.locator('text="Operational"');
  const errorStatus = card.locator('text="Error"');

  // Should show Operational, not Error
  const hasOperational = await operationalStatus.isVisible().catch(() => false);
  const hasError = await errorStatus.isVisible().catch(() => false);

  if (hasError && !hasOperational) {
    throw new Error(`Service "${cardTitle}" shows Error status instead of Operational`);
  }

  return { card, hasOperational, hasError };
}

/**
 * Helper to verify crypto card shows valid price (not error message)
 */
async function verifyCryptoCardHasValidPrice(page: Page, cryptoName: string) {
  const card = page.locator(`div:has(h3:has-text("${cryptoName}"))`).first();
  await expect(card).toBeVisible({ timeout: 15000 });

  // Check for price format: €XX,XXX or €XX.XX
  const priceLabel = card.locator('text="Price (EUR):"');
  await expect(priceLabel).toBeVisible();

  // Get the price value (next sibling or nearby element)
  const priceRow = card.locator('div:has-text("Price (EUR)")').first();
  const priceText = await priceRow.textContent();

  // Should contain € and a number
  if (!priceText || !priceText.includes("€")) {
    throw new Error(`${cryptoName} card does not show a valid price with € symbol`);
  }

  // Check for error indicator
  const errorStatus = card.locator('text="Error"');
  const hasError = await errorStatus.isVisible().catch(() => false);

  if (hasError) {
    throw new Error(`${cryptoName} card shows Error status`);
  }

  return { card, priceText };
}

/**
 * Helper to count TODO items displayed in the UI
 * Uses the button text "Add Todo (X/200)" as the most reliable source
 */
async function countTodosInUI(page: Page): Promise<number> {
  // Wait for todos to load (loading state to disappear)
  await page.waitForSelector('text="Loading todos..."', { state: "hidden", timeout: 15000 }).catch(() => {});
  
  // Give extra time for render
  await page.waitForTimeout(2000);
  
  // First, try to get the count from the button text - most reliable
  const addButton = page.locator('button:has-text("Add Todo")');
  const buttonVisible = await addButton.isVisible().catch(() => false);
  
  if (buttonVisible) {
    const buttonText = await addButton.textContent().catch(() => null);
    if (buttonText) {
      const match = buttonText.match(/\((\d+)\/200\)/);
      if (match) {
        const count = parseInt(match[1], 10);
        console.log(`📊 Got count from button text: ${count}`);
        return count;
      }
    }
  }
  
  // Fallback: Count todo items by looking for checkboxes in todo containers
  const todoItems = page.locator('div.space-y-2 > div input[type="checkbox"]');
  let count = await todoItems.count();
  
  if (count > 0) {
    console.log(`📊 Got count from checkboxes: ${count}`);
    return count;
  }
  
  // Second fallback: try finding by the todo text paragraph
  const altTodoItems = page.locator('p.break-words.text-sm');
  count = await altTodoItems.count();
  
  if (count > 0) {
    console.log(`📊 Got count from paragraphs: ${count}`);
  }
  
  return count;
}

/**
 * Helper to get all TODO texts from UI
 */
async function getTodoTextsFromUI(page: Page): Promise<string[]> {
  await page.waitForSelector('text="Loading todos..."', { state: "hidden", timeout: 10000 }).catch(() => {});
  
  const todoItems = page.locator('div.p-3.rounded-lg.border-2 p.text-sm.break-words');
  const texts: string[] = [];
  
  const count = await todoItems.count();
  for (let i = 0; i < count; i++) {
    const text = await todoItems.nth(i).textContent();
    if (text) texts.push(text.trim());
  }
  
  return texts;
}

export {
  LOCAL_URL,
  NETLIFY_URL,
  login,
  generateTestTodoText,
  ensureSidebarOpen,
  getAuthToken,
  getTodosFromApi,
  verifyServiceCardOperational,
  verifyCryptoCardHasValidPrice,
  countTodosInUI,
  getTodoTextsFromUI,
};

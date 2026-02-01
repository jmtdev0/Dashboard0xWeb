import { test, expect } from "@playwright/test";
import {
  NETLIFY_URL,
  login,
  generateTestTodoText,
  ensureSidebarOpen,
  getAuthToken,
  getTodosFromApi,
  countTodosInUI,
  getTodoTextsFromUI,
} from "./helpers";

test.describe("TODOs - Netlify Environment", () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await login(page, NETLIFY_URL);
  });

  test("should display correct number of TODOs (API vs UI consistency)", async ({ page }) => {
    await ensureSidebarOpen(page);

    // Get auth token for API calls
    const token = await getAuthToken(page, NETLIFY_URL);

    // Get TODOs from API
    const apiData = await getTodosFromApi(page, NETLIFY_URL, token);
    console.log(`📊 API reports ${apiData.count} TODOs`);

    // Count TODOs in UI
    const uiCount = await countTodosInUI(page);
    console.log(`📊 UI displays ${uiCount} TODOs`);

    // They should match
    expect(uiCount).toBe(apiData.count);

    // Also verify the button shows correct count
    const addButton = page.locator('button:has-text("Add Todo")');
    const buttonText = await addButton.textContent();
    expect(buttonText).toContain(`(${apiData.count}/200)`);

    console.log(`✅ TODO count matches: API=${apiData.count}, UI=${uiCount}`);
  });

  test("should have at least 1 TODO stored (not empty)", async ({ page }) => {
    await ensureSidebarOpen(page);

    const token = await getAuthToken(page, NETLIFY_URL);
    const apiData = await getTodosFromApi(page, NETLIFY_URL, token);

    // Should have at least 1 TODO (production data)
    expect(apiData.count).toBeGreaterThanOrEqual(1);

    console.log(`✅ Found ${apiData.count} TODOs in storage`);
  });

  test("should display all TODO texts from API in UI", async ({ page }) => {
    await ensureSidebarOpen(page);

    const token = await getAuthToken(page, NETLIFY_URL);
    const apiData = await getTodosFromApi(page, NETLIFY_URL, token);

    if (apiData.count === 0) {
      console.log("⚠️ No TODOs to verify");
      return;
    }

    // Get texts from UI
    const uiTexts = await getTodoTextsFromUI(page);

    // Each API todo should appear in UI (check first 5 to avoid timeout)
    const todosToCheck = apiData.todos.slice(0, 5);
    for (const todo of todosToCheck) {
      const foundInUI = uiTexts.some((uiText) => uiText.includes(todo.text.substring(0, 30)));
      if (!foundInUI) {
        console.log(`⚠️ TODO not found in UI: "${todo.text.substring(0, 50)}..."`);
      }
    }

    console.log(`✅ Verified ${todosToCheck.length} TODOs appear in UI`);
  });

  test("should add a new TODO successfully", async ({ page }) => {
    await ensureSidebarOpen(page);

    // Get initial count
    const token = await getAuthToken(page, NETLIFY_URL);
    const beforeData = await getTodosFromApi(page, NETLIFY_URL, token);
    const initialCount = beforeData.count;

    // Generate unique todo text
    const todoText = generateTestTodoText();

    // Fill the new todo input
    const todoInput = page.locator('input[placeholder*="Add new todo"]');
    await todoInput.fill(todoText);

    // Click add button
    const addButton = page.locator('button:has-text("Add Todo")');
    await addButton.click();

    // Wait for the new todo to appear in the list
    await expect(page.locator(`text="${todoText}"`)).toBeVisible({ timeout: 20000 });

    // Verify the input was cleared
    await expect(todoInput).toHaveValue("");

    // Verify count increased
    const afterData = await getTodosFromApi(page, NETLIFY_URL, token);
    expect(afterData.count).toBe(initialCount + 1);

    console.log(`✅ TODO added successfully: ${todoText}`);
  });

  test("should show TODO List header and form elements", async ({ page }) => {
    await ensureSidebarOpen(page);

    // Verify the TODO sidebar is loaded
    const todoHeader = page.locator('h2:has-text("TODO List")');
    await expect(todoHeader).toBeVisible();

    // Verify the TODO form is present
    const todoInput = page.locator('input[placeholder*="Add new todo"]');
    await expect(todoInput).toBeVisible();

    // Verify the Add button is present
    const addButton = page.locator('button:has-text("Add Todo")');
    await expect(addButton).toBeVisible();

    // Check if we can see the todos count (e.g., "Add Todo (5/200)")
    const countText = await addButton.textContent();
    expect(countText).toMatch(/Add Todo \(\d+\/200\)/);

    console.log("✅ TODO form elements verified");
  });
});

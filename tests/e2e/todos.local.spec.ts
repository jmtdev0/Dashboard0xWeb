import { test, expect } from "@playwright/test";
import {
  LOCAL_URL,
  NETLIFY_URL,
  login,
  generateTestTodoText,
  ensureSidebarOpen,
  getAuthToken,
  getTodosFromApi,
  countTodosInUI,
} from "./helpers";

test.describe("TODOs - Local Environment", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, LOCAL_URL);
  });

  test("should display correct number of TODOs (API vs UI consistency)", async ({ page }) => {
    await ensureSidebarOpen(page);

    // Get auth token for API calls
    const token = await getAuthToken(page, LOCAL_URL);

    // Get TODOs from API
    const apiData = await getTodosFromApi(page, LOCAL_URL, token);
    console.log(`📊 API reports ${apiData.count} TODOs`);

    // Count TODOs in UI
    const uiCount = await countTodosInUI(page);
    console.log(`📊 UI displays ${uiCount} TODOs`);

    // They should match
    expect(uiCount).toBe(apiData.count);

    console.log(`✅ TODO count matches: API=${apiData.count}, UI=${uiCount}`);
  });

  test("should match Netlify TODO count (same data source)", async ({ page }) => {
    await ensureSidebarOpen(page);

    // Get local TODOs
    const localToken = await getAuthToken(page, LOCAL_URL);
    const localData = await getTodosFromApi(page, LOCAL_URL, localToken);

    // Get Netlify TODOs (using page.request for cross-origin)
    const netlifyToken = await getAuthToken(page, NETLIFY_URL);
    const netlifyData = await getTodosFromApi(page, NETLIFY_URL, netlifyToken);

    console.log(`📊 Local: ${localData.count} TODOs`);
    console.log(`📊 Netlify: ${netlifyData.count} TODOs`);

    // They should match if using same Netlify Blobs
    expect(localData.count).toBe(netlifyData.count);

    // Verify same TODO IDs exist in both
    const localIds = new Set(localData.todos.map((t) => t.id));
    const netlifyIds = new Set(netlifyData.todos.map((t) => t.id));

    // Check if IDs match
    const idsMatch = localData.todos.every((t) => netlifyIds.has(t.id));

    if (!idsMatch) {
      console.log("⚠️ Local and Netlify have different TODO IDs - they may use different storage");
      console.log("Local IDs:", [...localIds].slice(0, 3));
      console.log("Netlify IDs:", [...netlifyIds].slice(0, 3));
    }

    expect(idsMatch).toBe(true);

    console.log(`✅ Local and Netlify have same ${localData.count} TODOs`);
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

    // Check if we can see the todos count
    const countText = await addButton.textContent();
    expect(countText).toMatch(/Add Todo \(\d+\/200\)/);

    console.log("✅ TODOs loaded successfully in local environment");
  });

  test("should add a new TODO successfully", async ({ page }) => {
    await ensureSidebarOpen(page);

    // Generate unique todo text
    const todoText = generateTestTodoText();

    // Fill the new todo input
    const todoInput = page.locator('input[placeholder*="Add new todo"]');
    await todoInput.fill(todoText);

    // Click add button
    const addButton = page.locator('button:has-text("Add Todo")');
    await addButton.click();

    // Wait for the new todo to appear in the list
    await expect(page.locator(`text="${todoText}"`)).toBeVisible({ timeout: 10000 });

    // Verify the input was cleared
    await expect(todoInput).toHaveValue("");

    console.log(`✅ TODO added successfully in local environment: ${todoText}`);
  });
});

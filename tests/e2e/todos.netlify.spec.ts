import { test, expect } from "@playwright/test";
import { login, generateTestTodoText, ensureSidebarOpen } from "./helpers";

const NETLIFY_URL = "https://develop--dashboard0x.netlify.app";

test.describe("TODOs - Netlify Environment", () => {
  // Longer timeout for Netlify cold starts
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await login(page, NETLIFY_URL);
  });

  test("should read TODOs from Netlify Blobs and display them", async ({ page }) => {
    // The sidebar with TODOs should be visible after login
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

    console.log("✅ TODOs loaded successfully in Netlify environment");
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

    // Wait for the new todo to appear in the list (longer timeout for Netlify)
    await expect(page.locator(`text="${todoText}"`)).toBeVisible({ timeout: 20000 });

    // Verify the input was cleared
    await expect(todoInput).toHaveValue("");

    console.log(`✅ TODO added successfully in Netlify environment: ${todoText}`);
  });
});

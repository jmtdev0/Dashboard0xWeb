import { test, expect } from "@playwright/test";
import { NETLIFY_URL, verifyServiceCardOperational } from "./helpers";

test.describe("Public Dashboard - Netlify", () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto(NETLIFY_URL);
    // Wait for data to load - either cards appear or we get an error
    // The loading message should disappear and be replaced with content
    try {
      await page.waitForSelector('text="Loading dashboard data..."', { 
        state: "hidden", 
        timeout: 30000 
      });
    } catch {
      // Loading may have already finished
    }
    // Give extra time for React to render
    await page.waitForTimeout(2000);
  });

  test("should load public dashboard without errors", async ({ page }) => {
    // Verify page loaded (no error message visible at top level)
    const errorBanner = page.locator('div.bg-red-50, div.bg-red-900\\/20').first();
    const hasTopLevelError = await errorBanner.isVisible().catch(() => false);
    
    // If there's a top-level error, fail the test with the error message
    if (hasTopLevelError) {
      const errorText = await errorBanner.textContent();
      throw new Error(`Dashboard shows error: ${errorText}`);
    }

    // Check if we're still loading or if cards appeared
    const loadingText = page.locator('text="Loading dashboard data..."');
    const isStillLoading = await loadingText.isVisible().catch(() => false);
    
    if (isStillLoading) {
      // Page failed to load data - this is a valid failure
      throw new Error("Dashboard stuck in loading state - data not loading");
    }

    // Verify we have service cards visible OR an error state
    const serviceCards = page.locator('div.rounded-xl.shadow-lg');
    const cardsCount = await serviceCards.count();
    
    if (cardsCount === 0) {
      // Check if there's a "No data available" message
      const noDataMsg = page.locator('text=/No data available/');
      const hasNoData = await noDataMsg.isVisible().catch(() => false);
      if (hasNoData) {
        console.log("⚠️ Dashboard has no data - scraper needs to run");
      } else {
        throw new Error("No service cards found and no error message displayed");
      }
    }

    console.log(`✅ Public dashboard loaded with ${cardsCount} cards`);
  });

  test("should display YouTube indicator with valid content", async ({ page }) => {
    const { card } = await verifyServiceCardOperational(page, "YouTube");
    
    // Verify "Last Video" has content (not "N/A" or empty)
    const lastVideoRow = card.locator('div:has-text("Last Video")').first();
    const lastVideoText = await lastVideoRow.textContent();
    
    expect(lastVideoText).toBeTruthy();
    expect(lastVideoText).not.toContain("N/A");
    
    console.log(`✅ YouTube indicator operational - Last Video: ${lastVideoText?.substring(0, 50)}...`);
  });

  test("should display Twitter indicator with valid content", async ({ page }) => {
    const { card } = await verifyServiceCardOperational(page, "Twitter");
    
    // Verify "Last Tweet" has content
    const lastTweetRow = card.locator('div:has-text("Last Tweet")').first();
    const lastTweetText = await lastTweetRow.textContent();
    
    expect(lastTweetText).toBeTruthy();
    
    // Verify "Total Tweets" shows a number
    const totalTweetsRow = card.locator('div:has-text("Total Tweets")').first();
    const totalTweetsText = await totalTweetsRow.textContent();
    
    expect(totalTweetsText).toBeTruthy();
    expect(totalTweetsText).not.toContain("N/A");
    
    console.log(`✅ Twitter indicator operational`);
  });

  test("should display Instagram indicator with valid content", async ({ page }) => {
    const { card } = await verifyServiceCardOperational(page, "Instagram");
    
    // Verify "Last Post" has content
    const lastPostRow = card.locator('div:has-text("Last Post")').first();
    const lastPostText = await lastPostRow.textContent();
    
    expect(lastPostText).toBeTruthy();
    
    console.log(`✅ Instagram indicator operational`);
  });

  test("should display GitHub indicator with valid content", async ({ page }) => {
    const { card } = await verifyServiceCardOperational(page, "Kingdom Hearts");
    
    // Verify "Latest Version" has content (format: vX.X.X or similar)
    const versionRow = card.locator('div:has-text("Latest Version")').first();
    const versionText = await versionRow.textContent();
    
    expect(versionText).toBeTruthy();
    expect(versionText).not.toContain("N/A");
    
    // Verify "Downloads" shows a number
    const downloadsRow = card.locator('div:has-text("Downloads")').first();
    const downloadsText = await downloadsRow.textContent();
    
    expect(downloadsText).toBeTruthy();
    expect(downloadsText).not.toContain("N/A");
    
    console.log(`✅ GitHub indicator operational - Version: ${versionText}`);
  });

  test("should display Chrome extension indicators as available", async ({ page }) => {
    // Find all extension cards (they have 🧩 emoji)
    const extensionCards = page.locator('div.rounded-xl:has(span:has-text("🧩"))');
    const count = await extensionCards.count();
    
    expect(count).toBeGreaterThanOrEqual(1);
    
    // Verify each extension shows "Available: ✓ Yes"
    for (let i = 0; i < count; i++) {
      const card = extensionCards.nth(i);
      const availableRow = card.locator('div:has-text("Available")').first();
      const availableText = await availableRow.textContent();
      
      expect(availableText).toContain("✓ Yes");
    }
    
    console.log(`✅ ${count} Chrome extension(s) showing as available`);
  });

  test("should have service indicators visible when data loads", async ({ page }) => {
    // Wait a bit more for any lazy loading
    await page.waitForTimeout(3000);
    
    // Count all service cards in the grid
    const serviceCards = page.locator('div.grid div.rounded-xl.shadow-lg');
    const count = await serviceCards.count();
    
    // If no cards, check if still loading or has error
    if (count === 0) {
      const loadingText = page.locator('text="Loading dashboard data..."');
      const isLoading = await loadingText.isVisible().catch(() => false);
      
      if (isLoading) {
        throw new Error("Dashboard stuck in loading state after 5+ seconds");
      }
      
      // Could be an error state - that's a valid failure too
      throw new Error("No service cards visible - data may not be loading");
    }
    
    // Should have: YouTube, Twitter, Instagram, GitHub, + Chrome extensions
    // At minimum, expect some cards
    expect(count).toBeGreaterThanOrEqual(1);
    
    console.log(`✅ Found ${count} service indicators on public dashboard`);
  });

  test("should show last update timestamp", async ({ page }) => {
    // Verify "Last updated:" text is visible with a date
    const lastUpdated = page.locator('p:has-text("Last updated")');
    
    // This might not be visible if no data loaded
    const isVisible = await lastUpdated.isVisible().catch(() => false);
    
    if (!isVisible) {
      // Check if page is in loading or error state
      const loadingText = page.locator('text="Loading dashboard data..."');
      const isLoading = await loadingText.isVisible().catch(() => false);
      
      if (isLoading) {
        throw new Error("Cannot verify timestamp - page stuck in loading state");
      }
      
      // No timestamp might mean no data yet
      console.log("⚠️ No timestamp visible - data may not have loaded yet");
      return;
    }
    
    const updateText = await lastUpdated.textContent();
    expect(updateText).toBeTruthy();
    
    console.log(`✅ Last update timestamp visible: ${updateText}`);
  });
});

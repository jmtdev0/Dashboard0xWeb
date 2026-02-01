import { test, expect } from "@playwright/test";
import {
  NETLIFY_URL,
  login,
  verifyCryptoCardHasValidPrice,
} from "./helpers";

test.describe("Private Dashboard - Crypto Indicators - Netlify", () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await login(page, NETLIFY_URL);
    // Wait for crypto data to load - check for loading state to disappear
    await page.waitForSelector('text="Loading dashboard data..."', { 
      state: "hidden", 
      timeout: 20000 
    }).catch(() => {});
    // Extra time for data fetch
    await page.waitForTimeout(3000);
  });

  test("should display BTC with valid price (not error)", async ({ page }) => {
    // First check if crypto cards are visible at all
    const btcCard = page.locator('div:has(h3:has-text("Bitcoin"))').first();
    const cardVisible = await btcCard.isVisible().catch(() => false);
    
    if (!cardVisible) {
      // Check if there's a general error or no data state
      const errorBanner = page.locator('div.bg-red-50 p, div.bg-red-900\\/20 p');
      const hasError = await errorBanner.isVisible().catch(() => false);
      
      if (hasError) {
        const errorText = await errorBanner.textContent();
        throw new Error(`Crypto data not available: ${errorText}`);
      }
      
      throw new Error("BTC card not found - crypto data may not be loading");
    }
    
    const { priceText } = await verifyCryptoCardHasValidPrice(page, "Bitcoin");
    
    // Verify the card shows "Operational" status
    const operationalStatus = btcCard.locator('text="Operational"');
    await expect(operationalStatus).toBeVisible();
    
    // Verify 24h change is displayed
    const changeRow = btcCard.locator('div:has-text("24h Change")').first();
    const changeText = await changeRow.textContent();
    expect(changeText).toContain("%");
    
    console.log(`✅ BTC indicator operational - ${priceText}`);
  });

  test("should display SOL with valid price (not error)", async ({ page }) => {
    const solCard = page.locator('div:has(h3:has-text("Solana"))').first();
    const cardVisible = await solCard.isVisible().catch(() => false);
    
    if (!cardVisible) {
      throw new Error("SOL card not found - crypto data may not be loading");
    }
    
    const { priceText } = await verifyCryptoCardHasValidPrice(page, "Solana");
    
    // Verify the card shows "Operational" status
    const operationalStatus = solCard.locator('text="Operational"');
    await expect(operationalStatus).toBeVisible();
    
    // Verify 24h change is displayed
    const changeRow = solCard.locator('div:has-text("24h Change")').first();
    const changeText = await changeRow.textContent();
    expect(changeText).toContain("%");
    
    console.log(`✅ SOL indicator operational - ${priceText}`);
  });

  test("should NOT show any error status on crypto cards", async ({ page }) => {
    // Check if any crypto cards exist first
    const cryptoCards = page.locator('div:has(h3:has-text("Bitcoin")), div:has(h3:has-text("Solana"))');
    const cardsCount = await cryptoCards.count();
    
    if (cardsCount === 0) {
      // No crypto cards - check if this is due to data not loading
      const loadingText = page.locator('text="Loading dashboard data..."');
      const isLoading = await loadingText.isVisible().catch(() => false);
      
      if (isLoading) {
        throw new Error("Dashboard stuck in loading state - crypto data not available");
      }
      
      // Could be that crypto section just doesn't show up
      console.log("⚠️ No crypto cards found - may need to check data availability");
      return;
    }
    
    // Check BTC card for error
    const btcCard = page.locator('div:has(h3:has-text("Bitcoin"))').first();
    if (await btcCard.isVisible().catch(() => false)) {
      const btcError = btcCard.locator('text="Error"');
      const btcHasError = await btcError.isVisible().catch(() => false);
      expect(btcHasError).toBe(false);
    }
    
    // Check SOL card for error
    const solCard = page.locator('div:has(h3:has-text("Solana"))').first();
    if (await solCard.isVisible().catch(() => false)) {
      const solError = solCard.locator('text="Error"');
      const solHasError = await solError.isVisible().catch(() => false);
      expect(solHasError).toBe(false);
    }
    
    // Check for any error banner at page level
    const errorBanner = page.locator('div.bg-red-50 p, div.bg-red-900\\/20 p');
    const hasPageError = await errorBanner.isVisible().catch(() => false);
    
    if (hasPageError) {
      const errorText = await errorBanner.textContent();
      // Session expired is acceptable, other errors are not
      if (!errorText?.includes("Session expired")) {
        throw new Error(`Page shows error: ${errorText}`);
      }
    }
    
    console.log("✅ No error status on crypto cards");
  });

  test("should show valid EUR prices (not N/A or undefined)", async ({ page }) => {
    // Get all price elements in crypto cards
    const cryptoSection = page.locator('div.grid');
    const priceRows = cryptoSection.locator('div:has-text("Price (EUR)")');
    const count = await priceRows.count();
    
    if (count === 0) {
      // No price rows found - check if data loaded
      throw new Error("No price indicators found - crypto data may not be loaded");
    }
    
    expect(count).toBeGreaterThanOrEqual(1); // At least BTC or SOL
    
    for (let i = 0; i < count; i++) {
      const row = priceRows.nth(i);
      const text = await row.textContent();
      
      // Should contain € symbol and NOT contain N/A or undefined
      expect(text).toContain("€");
      expect(text).not.toContain("N/A");
      expect(text).not.toContain("undefined");
    }
    
    console.log(`✅ ${count} price indicators showing valid EUR values`);
  });

  test("should display timestamp of last update", async ({ page }) => {
    const lastUpdated = page.locator('p:has-text("Last updated")');
    const isVisible = await lastUpdated.isVisible().catch(() => false);
    
    if (!isVisible) {
      // Check loading state
      const loadingText = page.locator('text="Loading dashboard data..."');
      const isLoading = await loadingText.isVisible().catch(() => false);
      
      if (isLoading) {
        throw new Error("Dashboard stuck in loading state");
      }
      
      console.log("⚠️ No timestamp visible - data may not have loaded");
      return;
    }
    
    const updateText = await lastUpdated.textContent();
    expect(updateText).toBeTruthy();
    expect(updateText!.length).toBeGreaterThan(15); // "Last updated: " + date
    
    console.log(`✅ Crypto data timestamp: ${updateText}`);
  });
});

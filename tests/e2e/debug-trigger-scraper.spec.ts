import { test } from "@playwright/test";
import { NETLIFY_URL } from "./helpers";

/**
 * Test to manually trigger the scraper and capture logs
 */

test.describe("Debug - Trigger Scraper", () => {
  test.setTimeout(300000); // 5 minutes - scraper can be slow

  test("trigger scraper via API and wait for completion", async ({ page }) => {
    console.log("\n=== TRIGGERING SCRAPER ===\n");

    // Capture network requests
    page.on("request", (request) => {
      if (request.url().includes("/api/scrape")) {
        console.log(`[REQUEST] ${request.method()} ${request.url()}`);
      }
    });

    page.on("response", async (response) => {
      if (response.url().includes("/api/scrape")) {
        console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
        try {
          const body = await response.text();
          console.log(`[RESPONSE BODY]`, body.substring(0, 500));
        } catch (e) {
          console.log("[Could not read response body]");
        }
      }
    });

    console.log("Navigating to dashboard...");
    await page.goto(NETLIFY_URL);

    // Wait for page to load
    await page.waitForTimeout(3000);

    console.log("Clicking 'Refresh Now' button to trigger scraper...");
    const refreshButton = page.locator('button:has-text("Refresh Now")');
    await refreshButton.click();

    console.log("Waiting for scraper to complete (this may take 1-2 minutes)...");
    
    // Wait and watch for updates
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(10000); // Check every 10 seconds
      console.log(`... waiting ${(i + 1) * 10}s`);

      // Check if button is still disabled (loading)
      const isDisabled = await refreshButton.isDisabled();
      if (!isDisabled) {
        console.log("✅ Scraper completed (button re-enabled)");
        break;
      }
    }

    // Wait a bit more for data to propagate
    await page.waitForTimeout(5000);

    // Check the final state
    console.log("\n=== CHECKING UPDATED DATA ===\n");

    // Fetch the API to see what data we have now
    const response = await page.request.get(`${NETLIFY_URL}/api/results`);
    const data = await response.json();

    console.log("[FINAL DATA STATE]");
    console.log(JSON.stringify(data, null, 2));

    console.log("\n[SUMMARY]");
    console.log("Timestamp:", data.timestamp);
    console.log("YouTube success:", data.results?.youtube?.success);
    console.log("Twitter success:", data.results?.twitter?.success);
    console.log("Instagram success:", data.results?.instagram?.success);
    console.log("GitHub success:", data.results?.github?.success);
    console.log("Extensions count:", data.results?.extensions?.length || 0);

    // Check if data has improved
    const hasValidYouTube = data.results?.youtube?.lastVideo && data.results.youtube.lastVideo !== "N/A";
    const hasValidTwitter = data.results?.twitter?.lastTweet && data.results.twitter.lastTweet !== "N/A";

    console.log("\n[DATA QUALITY]");
    console.log("YouTube has valid data:", hasValidYouTube);
    console.log("Twitter has valid data:", hasValidTwitter);

    if (!hasValidYouTube && !hasValidTwitter) {
      console.log("\n⚠️ WARNING: Scraper ran but data is still missing/invalid");
      console.log("This suggests the scraper is failing to fetch data from external sites");
    }
  });

  test("check Netlify function logs (if available)", async ({ page }) => {
    // Note: This would require Netlify API access
    // For now, just document what to check

    console.log("\n=== NETLIFY FUNCTION LOGS CHECK ===\n");
    console.log("To check Netlify function logs:");
    console.log("1. Go to: https://app.netlify.com/");
    console.log("2. Select your 'dashboard0x' site");
    console.log("3. Go to 'Functions' tab");
    console.log("4. Check 'daily-scraper' function logs");
    console.log("5. Look for errors or timeouts (26s limit)");
    console.log("\nCommon issues:");
    console.log("- Function timeout (26s limit on free tier)");
    console.log("- Puppeteer can't launch in serverless environment");
    console.log("- External site blocking requests");
    console.log("- Rate limiting from external APIs");
  });
});

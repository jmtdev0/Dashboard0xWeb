import { test } from "@playwright/test";
import { NETLIFY_URL, login } from "./helpers";

/**
 * Special test to capture browser console logs for debugging
 * This test doesn't assert anything - it just loads pages and captures logs
 */

test.describe("Debug - Console Logs Capture", () => {
  test.setTimeout(120000);

  test("capture public dashboard logs", async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    // Capture console messages
    page.on("console", (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      logs.push(text);
      console.log(text);
    });

    // Capture page errors
    page.on("pageerror", (error) => {
      const text = `[PAGE ERROR] ${error.message}`;
      errors.push(text);
      console.error(text);
    });

    // Capture network failures
    page.on("requestfailed", (request) => {
      const text = `[NETWORK FAILED] ${request.url()} - ${request.failure()?.errorText}`;
      errors.push(text);
      console.error(text);
    });

    console.log("\n=== PUBLIC DASHBOARD DEBUG SESSION ===\n");

    await page.goto(NETLIFY_URL);

    // Wait for page to fully load
    await page.waitForTimeout(10000);

    console.log("\n=== CAPTURED LOGS ===");
    console.log(`Total logs: ${logs.length}`);
    console.log(`Total errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\n=== ERRORS ===");
      errors.forEach((err) => console.log(err));
    }

    // Get the final HTML to see what was rendered
    const bodyHTML = await page.locator("body").innerHTML();
    const hasLoadingText = bodyHTML.includes("Loading dashboard data");
    const hasServiceCards = bodyHTML.includes("rounded-xl shadow-lg");

    console.log("\n=== PAGE STATE ===");
    console.log("Still loading:", hasLoadingText);
    console.log("Has service cards:", hasServiceCards);
  });

  test("capture private dashboard (crypto) logs", async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    // Capture console messages
    page.on("console", (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      logs.push(text);
      console.log(text);
    });

    // Capture page errors
    page.on("pageerror", (error) => {
      const text = `[PAGE ERROR] ${error.message}`;
      errors.push(text);
      console.error(text);
    });

    // Capture network failures
    page.on("requestfailed", (request) => {
      const text = `[NETWORK FAILED] ${request.url()} - ${request.failure()?.errorText}`;
      errors.push(text);
      console.error(text);
    });

    console.log("\n=== PRIVATE DASHBOARD DEBUG SESSION ===\n");

    await login(page, NETLIFY_URL);

    // Wait for crypto data to load
    await page.waitForTimeout(10000);

    console.log("\n=== CAPTURED LOGS ===");
    console.log(`Total logs: ${logs.length}`);
    console.log(`Total errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\n=== ERRORS ===");
      errors.forEach((err) => console.log(err));
    }

    // Get the final HTML to see what was rendered
    const bodyHTML = await page.locator("body").innerHTML();
    const hasBitcoin = bodyHTML.includes("Bitcoin");
    const hasSolana = bodyHTML.includes("Solana");
    const hasError = bodyHTML.includes("Error");

    console.log("\n=== PAGE STATE ===");
    console.log("Has Bitcoin card:", hasBitcoin);
    console.log("Has Solana card:", hasSolana);
    console.log("Has error messages:", hasError);
  });

  test("check API responses directly", async ({ page }) => {
    console.log("\n=== API DIRECT CHECK ===\n");

    // Check public API
    console.log("Fetching /api/results...");
    const publicResponse = await page.request.get(`${NETLIFY_URL}/api/results`);
    const publicData = await publicResponse.json();

    console.log("\n[PUBLIC API RESPONSE]");
    console.log(JSON.stringify(publicData, null, 2));

    // Check if we have data
    if (publicData.results) {
      console.log("\n[PUBLIC DATA SUMMARY]");
      console.log("YouTube success:", publicData.results.youtube?.success);
      console.log("YouTube lastVideo:", publicData.results.youtube?.lastVideo || "N/A");
      console.log("Twitter success:", publicData.results.twitter?.success);
      console.log("Twitter lastTweet:", publicData.results.twitter?.lastTweet || "N/A");
      console.log("Instagram success:", publicData.results.instagram?.success);
      console.log("GitHub success:", publicData.results.github?.success);
      console.log("Extensions count:", publicData.results.extensions?.length || 0);
    }

    // Check private API (need auth)
    console.log("\n\nFetching /api/private/data...");
    
    // First login to get token
    const password = process.env.TEST_PASSWORD;
    const authResponse = await page.request.post(`${NETLIFY_URL}/api/auth/verify`, {
      data: { password },
    });
    const authData = await authResponse.json();
    const token = authData.token;

    if (token) {
      const privateResponse = await page.request.get(
        `${NETLIFY_URL}/api/private/data`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const privateData = await privateResponse.json();

      console.log("\n[PRIVATE API RESPONSE]");
      console.log(JSON.stringify(privateData, null, 2));

      if (privateData.crypto) {
        console.log("\n[CRYPTO DATA SUMMARY]");
        console.log("Crypto success:", privateData.crypto.success);
        console.log("BTC price:", privateData.crypto.btc?.price || "N/A");
        console.log("SOL price:", privateData.crypto.sol?.price || "N/A");
        console.log("Crypto error:", privateData.crypto.error || "none");
      }
    }
  });
});

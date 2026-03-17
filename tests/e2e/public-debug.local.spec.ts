/**
 * Diagnostic test for the public dashboard.
 * Run with: npx playwright test public-debug --project=local
 *
 * Goal: understand why service cards show "Error" status.
 * This test does NOT assert pass/fail — it collects and prints everything.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:8888";

test.describe("Public Dashboard — Diagnostics (local)", () => {
  test.setTimeout(60000);

  test("inspect /api/results raw response", async ({ request }) => {
    console.log("\n=== RAW API RESPONSE ===");

    const response = await request.get(`${BASE_URL}/api/results`);
    const status = response.status();
    const body = await response.json().catch(() => null);

    console.log("HTTP status:", status);
    console.log("Response body:", JSON.stringify(body, null, 2));

    expect(status, "API should return 200").toBe(200);

    if (!body?.results) {
      console.warn("⚠️  No 'results' key in response. Message:", body?.message ?? "(none)");
      return;
    }

    const services = ["youtube", "twitter", "instagram", "github"] as const;
    for (const svc of services) {
      const s = body.results[svc];
      if (!s) { console.warn(`⚠️  Service '${svc}' missing from results`); continue; }
      if (s.success) {
        console.log(`✅ ${svc}: success`);
      } else {
        console.error(`❌ ${svc}: failed — error: ${s.error ?? "(no error field)"}`);
      }
    }

    const exts: any[] = body.results.extensions ?? [];
    for (const ext of exts) {
      if (ext.available) {
        console.log(`✅ extension '${ext.name}': available`);
      } else {
        console.error(`❌ extension '${ext.name}': not available — ${ext.error ?? "(no error field)"}`);
      }
    }
  });

  test("capture browser console and inspect card states", async ({ page }) => {
    const consoleLogs: string[] = [];
    const networkErrors: string[] = [];
    let apiResultsResponseBody: unknown = null;

    page.on("console", (msg) => {
      consoleLogs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on("pageerror", (err) => {
      consoleLogs.push(`[PAGE ERROR] ${err.message}`);
    });

    await page.route("**/api/results", async (route) => {
      const response = await route.fetch();
      try { apiResultsResponseBody = await response.json(); }
      catch { apiResultsResponseBody = await response.text(); }
      await route.fulfill({ response });
    });

    page.on("requestfailed", (req) => {
      networkErrors.push(`FAILED: ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
    });

    console.log(`\n=== NAVIGATING TO ${BASE_URL} ===`);
    await page.goto(BASE_URL);

    try {
      await page.waitForSelector('text="Loading dashboard data..."', { state: "hidden", timeout: 20000 });
    } catch { /* already gone */ }

    await page.waitForTimeout(2000);

    console.log("\n=== INTERCEPTED /api/results RESPONSE ===");
    console.log(JSON.stringify(apiResultsResponseBody, null, 2));

    console.log("\n=== SERVICE CARD STATES ===");
    const cards = page.locator("div.rounded-xl.shadow-lg");
    const cardCount = await cards.count();
    console.log(`Found ${cardCount} card(s)`);

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const title = await card.locator("h3").textContent().catch(() => "?");
      const statusDot = card.locator("span.rounded-full").first();
      const statusText = await card.locator("span.text-xs.font-medium").first().textContent().catch(() => "?");
      const isError = await statusDot.evaluate((el) => el.classList.contains("bg-red-500")).catch(() => false);

      console.log(`  [${isError ? "ERROR" : "OK   "}] ${title?.trim()} — ${statusText?.trim()}`);

      if (isError) {
        const errorBox = card.locator("div.bg-red-50, div.bg-red-900\\/20").first();
        const errorText = await errorBox.textContent().catch(() => null);
        if (errorText?.trim()) console.error(`           Detail: ${errorText.trim()}`);
      }

      const rows = card.locator("div.flex.justify-between");
      const rowCount = await rows.count();
      for (let r = 0; r < rowCount; r++) {
        const rowText = await rows.nth(r).textContent().catch(() => "");
        console.log(`           row: ${rowText?.replace(/\s+/g, " ").trim()}`);
      }
    }

    if (networkErrors.length > 0) {
      console.error("\n=== NETWORK ERRORS ===");
      networkErrors.forEach((e) => console.error("  ", e));
    } else {
      console.log("\n✅ No network errors");
    }

    console.log("\n=== BROWSER CONSOLE LOGS ===");
    consoleLogs.forEach((l) => console.log("  ", l));

    await page.screenshot({ path: "test-results/public-dashboard-debug.png", fullPage: true });
    console.log("\n📸 Screenshot saved to test-results/public-dashboard-debug.png");
  });
});

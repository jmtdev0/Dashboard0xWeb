import { getStore } from "@netlify/blobs";
import { TestResult } from "./scraper";

const BLOB_KEY = "dashboard-data";

/**
 * Get Netlify Blobs store for dashboard data with strong consistency
 * Strong consistency ensures immediate visibility of updates
 */
function getDashboardStore() {
  return getStore({
    name: "dashboard",
    consistency: "strong", // Critical for immediate updates
  });
}

/**
 * Fetch dashboard data from Netlify Blobs
 * Returns null if no data exists
 */
export async function getDashboardData(): Promise<TestResult | null> {
  console.log("📦 [STORAGE] Fetching data from Netlify Blobs...");
  try {
    const store = getDashboardStore();
    console.log("🔗 [STORAGE] Store connected:", { name: "dashboard", key: BLOB_KEY });

    const data = await store.get(BLOB_KEY, { type: "json" });
    console.log("📊 [STORAGE] Data retrieved:", {
      hasData: !!data,
      timestamp: data?.timestamp,
    });

    if (!data) {
      console.log("⚠️ [STORAGE] No data found in blob store");
      return null;
    }

    console.log("✅ [STORAGE] Data fetched successfully");
    return data as TestResult;
  } catch (error) {
    console.error("❌ [STORAGE] Failed to fetch dashboard data:", error);
    return null;
  }
}

/**
 * Save dashboard data to Netlify Blobs
 * Uses strong consistency for immediate visibility
 */
export async function saveDashboardData(data: TestResult): Promise<void> {
  console.log("💾 [STORAGE] Saving data to Netlify Blobs...");
  console.log("📊 [STORAGE] Data to save:", {
    timestamp: data.timestamp,
    hasResults: !!data.results,
    hasCrypto: !!data.results?.crypto,
  });

  try {
    const store = getDashboardStore();
    console.log("🔗 [STORAGE] Store connected");

    await store.setJSON(BLOB_KEY, data);
    console.log("✅ [STORAGE] Data saved successfully to blob store");
  } catch (error) {
    console.error("❌ [STORAGE] Failed to save dashboard data:", error);
    throw error;
  }
}

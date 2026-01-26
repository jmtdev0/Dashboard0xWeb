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
  try {
    const store = getDashboardStore();
    const data = await store.get(BLOB_KEY, { type: "json" });

    if (!data) {
      return null;
    }

    return data as TestResult;
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return null;
  }
}

/**
 * Save dashboard data to Netlify Blobs
 * Uses strong consistency for immediate visibility
 */
export async function saveDashboardData(data: TestResult): Promise<void> {
  try {
    const store = getDashboardStore();
    await store.setJSON(BLOB_KEY, data);
  } catch (error) {
    console.error("Failed to save dashboard data:", error);
    throw error;
  }
}

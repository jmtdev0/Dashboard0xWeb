import { neon } from "@netlify/neon";
import { TestResult } from "./scraper";
import { promises as fs } from "fs";
import path from "path";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".local-data");
const LOCAL_DASHBOARD_FILE = path.join(LOCAL_DATA_DIR, "dashboard-data.json");

/**
 * Check if we can use Netlify DB (production or Netlify dev environment)
 * CRITICAL: Only return true if NETLIFY_DATABASE_URL is actually present
 */
function canUseDatabase(): boolean {
  const hasDbUrl = !!process.env.NETLIFY_DATABASE_URL;
  console.log("🔍 [DASHBOARD STORAGE] Can use database:", hasDbUrl);
  return hasDbUrl;
}

/**
 * Check if we're running in local development (no Netlify DB available)
 */
function isLocalDevelopment(): boolean {
  const isLocal = !canUseDatabase() && process.env.NODE_ENV !== "production";
  console.log("🔍 [DASHBOARD STORAGE] Is local development:", isLocal);
  return isLocal;
}

/**
 * Ensure local data directory exists
 */
async function ensureLocalDataDir(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create local data directory:", error);
  }
}

/**
 * Fetch dashboard data from Netlify DB or local file system
 * Returns null if no data exists
 */
export async function getDashboardData(): Promise<TestResult | null> {
  console.log("📦 [STORAGE] Fetching data...");

  // Use local file system in development
  if (isLocalDevelopment()) {
    console.log("🏠 [STORAGE] Using local file system (development mode)");
    try {
      const data = await fs.readFile(LOCAL_DASHBOARD_FILE, "utf-8");
      const parsed = JSON.parse(data) as TestResult;
      console.log("✅ [STORAGE] Data loaded from local file:", {
        timestamp: parsed.timestamp,
      });
      return parsed;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("⚠️ [STORAGE] No local data file found");
        return null;
      }
      console.error("❌ [STORAGE] Failed to read local file:", error);
      return null;
    }
  }

  // Use Netlify DB in production
  console.log("☁️ [STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();
    console.log("🔗 [STORAGE] Database connected");

    const [row] = await sql`
      SELECT data FROM dashboard
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const data = row ? (row.data as TestResult) : null;

    console.log("📊 [STORAGE] Data retrieved:", {
      hasData: !!data,
      timestamp: data?.timestamp,
      hasCrypto: !!(data as any)?.results?.crypto,
    });

    // Log crypto data details after retrieval
    if (data && (data as any).results?.crypto) {
      console.log("₿ [STORAGE] Crypto data after retrieval:", {
        success: (data as any).results.crypto.success,
        hasBTC: !!(data as any).results.crypto.btc,
        hasSOL: !!(data as any).results.crypto.sol,
        hasError: !!(data as any).results.crypto.error,
        error: (data as any).results.crypto.error,
        fullCryptoObject: JSON.stringify((data as any).results.crypto),
      });
    }

    if (!data) {
      console.log("⚠️ [STORAGE] No data found in database");
      return null;
    }

    console.log("✅ [STORAGE] Data fetched successfully");
    return data;
  } catch (error) {
    console.error("❌ [STORAGE] Failed to fetch dashboard data:", error);
    return null;
  }
}

/**
 * Save dashboard data to Netlify DB or local file system
 * The database trigger ensures only the most recent record is kept
 */
export async function saveDashboardData(data: TestResult): Promise<void> {
  console.log("💾 [STORAGE] Saving data...");
  console.log("📊 [STORAGE] Data to save:", {
    timestamp: data.timestamp,
    hasResults: !!data.results,
    hasCrypto: !!data.results?.crypto,
  });

  // Log crypto data details before saving
  if (data.results?.crypto) {
    console.log("₿ [STORAGE] Crypto data before save:", {
      success: data.results.crypto.success,
      hasBTC: !!data.results.crypto.btc,
      hasSOL: !!data.results.crypto.sol,
      hasError: !!data.results.crypto.error,
      error: data.results.crypto.error,
      fullCryptoObject: JSON.stringify(data.results.crypto),
    });
  } else {
    console.warn("⚠️ [STORAGE] No crypto data to save!");
  }

  // Use local file system in development
  if (isLocalDevelopment()) {
    console.log("🏠 [STORAGE] Using local file system (development mode)");
    try {
      await ensureLocalDataDir();
      await fs.writeFile(
        LOCAL_DASHBOARD_FILE,
        JSON.stringify(data, null, 2),
        "utf-8"
      );
      console.log("✅ [STORAGE] Data saved to local file:", LOCAL_DASHBOARD_FILE);
      return;
    } catch (error) {
      console.error("❌ [STORAGE] Failed to save to local file:", error);
      throw error;
    }
  }

  // Use Netlify DB in production
  console.log("☁️ [STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();
    console.log("🔗 [STORAGE] Database connected");

    // Insert new record (trigger will delete old ones automatically)
    await sql`
      INSERT INTO dashboard (data, updated_at)
      VALUES (${JSON.stringify(data)}, NOW())
    `;

    console.log("✅ [STORAGE] Data saved successfully to database");
  } catch (error) {
    console.error("❌ [STORAGE] Failed to save dashboard data:", error);
    throw error;
  }
}

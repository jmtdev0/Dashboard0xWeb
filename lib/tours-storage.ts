import { neon } from "@netlify/neon";
import { Tour, TourListData } from "./types/tour";
import { promises as fs } from "fs";
import path from "path";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".local-data");
const LOCAL_TOURS_FILE = path.join(LOCAL_DATA_DIR, "tours-data.json");

function canUseDatabase(): boolean {
  return !!process.env.NETLIFY_DATABASE_URL;
}

function isLocalDevelopment(): boolean {
  return !canUseDatabase() && process.env.NODE_ENV !== "production";
}

async function ensureLocalDataDir(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create local data directory:", error);
  }
}

/**
 * Fetch all tours from Netlify DB or local file system
 */
export async function getAllTours(): Promise<TourListData> {
  console.log("🗺️ [TOURS STORAGE] Fetching tours...");

  if (isLocalDevelopment()) {
    console.log("🏠 [TOURS STORAGE] Using local file system (development mode)");
    try {
      const data = await fs.readFile(LOCAL_TOURS_FILE, "utf-8");
      const parsed = JSON.parse(data) as TourListData;
      console.log("✅ [TOURS STORAGE] Tours loaded from local file:", parsed.tours.length, "items");
      return parsed;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("⚠️ [TOURS STORAGE] No local tours file found, returning empty list");
        return { tours: [], lastModified: new Date().toISOString() };
      }
      console.error("❌ [TOURS STORAGE] Failed to read local file:", error);
      return { tours: [], lastModified: new Date().toISOString() };
    }
  }

  console.log("☁️ [TOURS STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();

    const rows = await sql`
      SELECT
        id,
        name,
        description,
        created_at as "createdAt"
      FROM tours
      ORDER BY created_at DESC
    `;

    const tours: Tour[] = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
    }));

    const [lastUpdate] = await sql`
      SELECT MAX(updated_at) as last_modified FROM tours
    `;

    const lastModified = lastUpdate?.last_modified || new Date().toISOString();

    console.log("✅ [TOURS STORAGE] Tours fetched successfully:", tours.length, "items");
    return { tours, lastModified };
  } catch (error) {
    console.error("❌ [TOURS STORAGE] Failed to fetch tours:", error);
    return { tours: [], lastModified: new Date().toISOString() };
  }
}

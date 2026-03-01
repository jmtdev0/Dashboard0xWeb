import { neon } from "@netlify/neon";
import { CalendarEvent, EventListData } from "./types/event";
import { promises as fs } from "fs";
import path from "path";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".local-data");
const LOCAL_EVENTS_FILE = path.join(LOCAL_DATA_DIR, "events-data.json");

function canUseDatabase(): boolean {
  const hasDbUrl = !!process.env.NETLIFY_DATABASE_URL;
  console.log("🔍 [EVENT STORAGE] Can use database:", hasDbUrl);
  return hasDbUrl;
}

function isLocalDevelopment(): boolean {
  console.log("🔍 [EVENT STORAGE] Environment check:", {
    NETLIFY: process.env.NETLIFY,
    NODE_ENV: process.env.NODE_ENV,
    NETLIFY_DEV: process.env.NETLIFY_DEV,
    HAS_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
  });

  const useLocalFile = !canUseDatabase() && process.env.NODE_ENV !== "production";
  console.log("🔍 [EVENT STORAGE] Use local file:", useLocalFile);
  return useLocalFile;
}

async function ensureLocalDataDir(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create local data directory:", error);
  }
}

export async function getAllEvents(): Promise<EventListData> {
  console.log("📅 [EVENT STORAGE] Fetching events...");

  if (isLocalDevelopment()) {
    console.log("🏠 [EVENT STORAGE] Using local file system (development mode)");
    try {
      const data = await fs.readFile(LOCAL_EVENTS_FILE, "utf-8");
      const parsed = JSON.parse(data) as EventListData;
      console.log("✅ [EVENT STORAGE] Events loaded from local file:", parsed.events.length, "items");
      return parsed;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("⚠️ [EVENT STORAGE] No local events file found, creating empty list");
        return { events: [], lastModified: new Date().toISOString() };
      }
      console.error("❌ [EVENT STORAGE] Failed to read local file:", error);
      return { events: [], lastModified: new Date().toISOString() };
    }
  }

  console.log("☁️ [EVENT STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();

    const rows = await sql`
      SELECT
        id,
        title,
        date,
        description,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM events
      ORDER BY date ASC
    `;

    const events: CalendarEvent[] = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    const [lastUpdate] = await sql`
      SELECT MAX(updated_at) as last_modified FROM events
    `;

    const lastModified = lastUpdate?.last_modified || new Date().toISOString();

    console.log("✅ [EVENT STORAGE] Events fetched successfully:", events.length, "items");
    return { events, lastModified };
  } catch (error) {
    console.error("❌ [EVENT STORAGE] Failed to fetch events:", error);
    return { events: [], lastModified: new Date().toISOString() };
  }
}

export async function saveEvents(events: CalendarEvent[]): Promise<void> {
  console.log("💾 [EVENT STORAGE] Saving events...", events.length, "items");

  const data: EventListData = {
    events,
    lastModified: new Date().toISOString(),
  };

  if (isLocalDevelopment()) {
    console.log("🏠 [EVENT STORAGE] Using local file system (development mode)");
    try {
      await ensureLocalDataDir();
      await fs.writeFile(
        LOCAL_EVENTS_FILE,
        JSON.stringify(data, null, 2),
        "utf-8"
      );
      console.log("✅ [EVENT STORAGE] Events saved to local file:", LOCAL_EVENTS_FILE);
      return;
    } catch (error) {
      console.error("❌ [EVENT STORAGE] Failed to save to local file:", error);
      throw error;
    }
  }

  console.log("☁️ [EVENT STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();

    const eventIds = events.map((e) => e.id);

    for (const event of events) {
      await sql`
        INSERT INTO events (id, title, date, description, created_at, updated_at)
        VALUES (
          ${event.id},
          ${event.title},
          ${event.date},
          ${event.description},
          ${event.createdAt},
          ${event.updatedAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          date = EXCLUDED.date,
          description = EXCLUDED.description
      `;
    }

    if (eventIds.length > 0) {
      await sql`
        DELETE FROM events
        WHERE NOT (id = ANY(${eventIds}))
      `;
    } else {
      await sql`DELETE FROM events`;
    }

    console.log("✅ [EVENT STORAGE] Events saved successfully to database");
  } catch (error) {
    console.error("❌ [EVENT STORAGE] Failed to save events:", error);
    throw error;
  }
}

export function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Migration script to move dashboard data from local JSON file to Netlify Blobs
 * Run with: npm run migrate-dashboard-data
 */

import fs from "fs/promises";
import path from "path";
import { saveDashboardData } from "../lib/dashboard-storage";
import type { TestResult } from "../lib/scraper";

async function migrateDashboardData() {
  try {
    const dataPath = path.join(process.cwd(), "data", "lastRun.json");

    console.log("Checking for existing dashboard data...");

    // Check if local file exists
    try {
      const data = await fs.readFile(dataPath, "utf-8");
      const parsed: TestResult = JSON.parse(data);

      console.log("Found existing data from:", parsed.timestamp);
      console.log("Migrating to Netlify Blobs...");

      // Save to Netlify Blobs
      await saveDashboardData(parsed);

      console.log("✅ Migration successful!");
      console.log("Data is now stored in Netlify Blobs and shared between Web and Android.");

      // Optionally backup and remove the old file
      const backupPath = path.join(
        process.cwd(),
        "data",
        `lastRun.backup.${Date.now()}.json`
      );
      await fs.copyFile(dataPath, backupPath);
      console.log(`📦 Created backup at: ${backupPath}`);

      // Uncomment to remove the old file after successful migration
      // await fs.unlink(dataPath);
      // console.log("🗑️  Removed old local file");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.log("No existing data file found. Nothing to migrate.");
        console.log("Run the scraper to populate data: POST /api/scrape");
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateDashboardData();

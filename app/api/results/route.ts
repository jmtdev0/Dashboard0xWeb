import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), "data", "lastRun.json");

    // Check if file exists
    try {
      const data = await fs.readFile(dataPath, "utf-8");
      const parsed = JSON.parse(data);

      // Remove crypto data from public API response
      const publicData = {
        timestamp: parsed.timestamp,
        results: {
          youtube: parsed.results.youtube,
          twitter: parsed.results.twitter,
          instagram: parsed.results.instagram,
          github: parsed.results.github,
          extensions: parsed.results.extensions,
          // crypto: intentionally excluded from public API
        },
      };

      return NextResponse.json(publicData);
    } catch (error) {
      // No data yet
      return NextResponse.json({
        timestamp: null,
        results: null,
        message: "No data available yet. Run scraper first.",
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

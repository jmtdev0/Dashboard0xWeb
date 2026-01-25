import { NextResponse } from "next/server";
import { runAllTests } from "@/lib/scraper";
import { saveDashboardData } from "@/lib/dashboard-storage";

// Simple rate limiting (in-memory)
const lastRunMap = new Map<string, number>();

export async function POST(request: Request) {
  try {
    // Get IP for rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "localhost";

    const now = Date.now();
    const lastRun = lastRunMap.get(ip);

    // Rate limit: 1 request per 5 minutes
    if (lastRun && now - lastRun < 5 * 60 * 1000) {
      const waitSeconds = Math.ceil((5 * 60 * 1000 - (now - lastRun)) / 1000);
      return NextResponse.json(
        {
          error: `Please wait ${waitSeconds} seconds before running again`,
        },
        { status: 429 }
      );
    }

    lastRunMap.set(ip, now);

    // Run all tests
    const results = await runAllTests();

    // Save results to Netlify Blobs (shared between Web and Android)
    await saveDashboardData(results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: results.results,
    });
  } catch (error) {
    console.error("Manual scraper failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

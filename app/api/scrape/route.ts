import { NextResponse } from "next/server";
import { runAllTests } from "@/lib/scraper";
import { saveDashboardData } from "@/lib/dashboard-storage";

// Simple rate limiting (in-memory)
const lastRunMap = new Map<string, number>();

export async function POST(request: Request) {
  console.log("🚀 [SCRAPE] Starting scrape request");
  try {
    // Get IP for rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "localhost";
    console.log(`📍 [SCRAPE] Request from IP: ${ip}`);

    const now = Date.now();
    const lastRun = lastRunMap.get(ip);

    // Rate limit: 1 request per 5 minutes
    if (lastRun && now - lastRun < 5 * 60 * 1000) {
      const waitSeconds = Math.ceil((5 * 60 * 1000 - (now - lastRun)) / 1000);
      console.log(`⏱️ [SCRAPE] Rate limit hit. Wait ${waitSeconds}s`);
      return NextResponse.json(
        {
          error: `Please wait ${waitSeconds} seconds before running again`,
        },
        { status: 429 }
      );
    }

    lastRunMap.set(ip, now);
    console.log("🔄 [SCRAPE] Running all tests...");

    // Run all tests
    const results = await runAllTests();
    console.log("✅ [SCRAPE] Tests completed:", {
      timestamp: results.timestamp,
      hasYoutube: !!results.results.youtube,
      hasTwitter: !!results.results.twitter,
      hasCrypto: !!results.results.crypto,
    });

    // Save results to Netlify Blobs (shared between Web and Android)
    console.log("💾 [SCRAPE] Saving to Netlify Blobs...");
    await saveDashboardData(results);
    console.log("✅ [SCRAPE] Data saved successfully");

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        youtube: results.results.youtube,
        twitter: results.results.twitter,
        instagram: results.results.instagram,
        github: results.results.github,
        extensions: results.results.extensions,
        websites: results.results.websites,
        chromeExtensions: results.results.chromeExtensions,
        bethecandle: results.results.bethecandle,
      },
    });
  } catch (error) {
    console.error("❌ [SCRAPE] Manual scraper failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

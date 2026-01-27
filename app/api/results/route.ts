import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard-storage";

export async function GET() {
  console.log("📊 [RESULTS] Fetching public dashboard data");
  try {
    const data = await getDashboardData();
    console.log("📦 [RESULTS] Data retrieved:", {
      hasData: !!data,
      timestamp: data?.timestamp,
    });

    if (!data) {
      console.log("⚠️ [RESULTS] No data available");
      return NextResponse.json({
        timestamp: null,
        results: null,
        message: "No data available yet. Run scraper first.",
      });
    }

    // Remove crypto data from public API response
    const publicData = {
      timestamp: data.timestamp,
      results: {
        youtube: data.results.youtube,
        twitter: data.results.twitter,
        instagram: data.results.instagram,
        github: data.results.github,
        extensions: data.results.extensions,
        // crypto: intentionally excluded from public API
      },
    };

    console.log("✅ [RESULTS] Returning public data");
    return NextResponse.json(publicData);
  } catch (error) {
    console.error("❌ [RESULTS] Error fetching data:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard-storage";

export async function GET() {
  try {
    const data = await getDashboardData();

    if (!data) {
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

    return NextResponse.json(publicData);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

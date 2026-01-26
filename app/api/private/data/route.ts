import { NextResponse } from "next/server";
import { validateToken } from "@/lib/auth-utils";
import { getDashboardData } from "@/lib/dashboard-storage";

export async function GET(request: Request) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Validate token
    if (!validateToken(token)) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Token is valid - return private data
    const data = await getDashboardData();

    if (!data) {
      return NextResponse.json({
        timestamp: null,
        crypto: null,
        message: "No data available yet. Run scraper first.",
      });
    }

    // Extract only crypto data
    const privateData = {
      timestamp: data.timestamp,
      crypto: data.results.crypto || null,
    };

    return NextResponse.json(privateData);
  } catch (error) {
    console.error("Private data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch private data" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { validateToken } from "@/lib/auth-utils";

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
    const dataPath = path.join(process.cwd(), "data", "lastRun.json");

    try {
      const data = await fs.readFile(dataPath, "utf-8");
      const parsed = JSON.parse(data);

      // Extract only crypto data
      const privateData = {
        timestamp: parsed.timestamp,
        crypto: parsed.results.crypto || null,
      };

      return NextResponse.json(privateData);
    } catch (fileError) {
      // File doesn't exist or can't be read
      return NextResponse.json({
        timestamp: null,
        crypto: null,
        message: "No data available yet. Run scraper first.",
      });
    }
  } catch (error) {
    console.error("Private data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch private data" },
      { status: 500 }
    );
  }
}

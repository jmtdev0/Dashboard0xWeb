import type { Handler } from "@netlify/functions";
import { runAllTests } from "../../lib/scraper";
import { saveDashboardData } from "../../lib/dashboard-storage";

// Rate limiting in-memory (simple approach for demo)
const lastRunMap = new Map<string, number>();

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Simple rate limiting: 1 request per 5 minutes per IP
    const ip = event.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const lastRun = lastRunMap.get(ip);

    if (lastRun && now - lastRun < 5 * 60 * 1000) {
      const waitSeconds = Math.ceil((5 * 60 * 1000 - (now - lastRun)) / 1000);
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: `Please wait ${waitSeconds} seconds before running again`,
        }),
      };
    }

    lastRunMap.set(ip, now);

    // Run all tests
    const results = await runAllTests();

    // Save results to Netlify Blobs (shared between Web and Android)
    await saveDashboardData(results);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
      }),
    };
  } catch (error) {
    console.error("Manual scraper failed:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

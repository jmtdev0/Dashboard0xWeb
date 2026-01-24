import type { Handler } from "@netlify/functions";
import fs from "fs/promises";
import path from "path";

export const handler: Handler = async () => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const dataPath = path.join(process.cwd(), "data", "lastRun.json");

    // Check if file exists
    try {
      const data = await fs.readFile(dataPath, "utf-8");
      return {
        statusCode: 200,
        headers,
        body: data,
      };
    } catch (error) {
      // No data yet
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          timestamp: null,
          results: null,
          message: "No data available yet. Run scraper first.",
        }),
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

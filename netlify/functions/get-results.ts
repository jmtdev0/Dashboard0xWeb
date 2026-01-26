import type { Handler } from "@netlify/functions";
import { getDashboardData } from "../../lib/dashboard-storage";

export const handler: Handler = async () => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const data = await getDashboardData();

    if (!data) {
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
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

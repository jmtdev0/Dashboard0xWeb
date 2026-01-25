import { schedule } from "@netlify/functions";
import { runAllTests } from "../../lib/scraper";
import { saveDashboardData } from "../../lib/dashboard-storage";

// This function runs daily at 3 AM UTC
const handler = schedule("0 3 * * *", async () => {
  console.log("Starting daily scraper...");

  try {
    const results = await runAllTests();

    // Save results to Netlify Blobs (shared between Web and Android)
    await saveDashboardData(results);

    console.log("Daily scraper completed successfully");

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
      }),
    };
  } catch (error) {
    console.error("Daily scraper failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
});

export { handler };

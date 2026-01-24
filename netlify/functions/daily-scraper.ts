import { schedule } from "@netlify/functions";
import { runAllTests } from "../../lib/scraper";
import fs from "fs/promises";
import path from "path";

// This function runs daily at 3 AM UTC
const handler = schedule("0 3 * * *", async () => {
  console.log("Starting daily scraper...");
  
  try {
    const results = await runAllTests();
    
    // Save results to data directory
    const dataDir = path.join(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });
    
    const dataPath = path.join(dataDir, "lastRun.json");
    await fs.writeFile(
      dataPath,
      JSON.stringify(results, null, 2),
      "utf-8"
    );
    
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

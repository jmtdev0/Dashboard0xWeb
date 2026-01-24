import { runAllTests } from "../lib/scraper";
import fs from "fs/promises";
import path from "path";

async function main() {
  console.log("🚀 Starting scraper test...\n");

  try {
    const results = await runAllTests();

    console.log("\n✅ Scraper test completed!");
    console.log("\n📊 Results:");
    console.log(JSON.stringify(results, null, 2));

    // Save results to data directory
    const dataDir = path.join(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });

    const dataPath = path.join(dataDir, "lastRun.json");
    await fs.writeFile(dataPath, JSON.stringify(results, null, 2), "utf-8");

    console.log(`\n💾 Results saved to: ${dataPath}`);

    // Summary
    const { youtube, twitter, instagram, github, crypto, extensions } =
      results.results;

    console.log("\n📈 Summary:");
    console.log(`  YouTube: ${youtube.success ? "✅" : "❌"}`);
    console.log(`  Twitter: ${twitter.success ? "✅" : "❌"}`);
    console.log(`  Instagram: ${instagram.success ? "✅" : "❌"}`);
    console.log(`  GitHub: ${github.success ? "✅" : "❌"}`);
    console.log(`  Crypto: ${crypto.success ? "✅" : "❌"}`);
    console.log(
      `  Extensions: ${extensions.filter((e) => e.success).length}/${extensions.length} passed`
    );
  } catch (error) {
    console.error("\n❌ Scraper test failed:", error);
    process.exit(1);
  }
}

main();

/**
 * Sync TODOs from production Netlify Blobs to local development sandbox
 * 
 * Usage: npm run sync-todos
 * or: tsx scripts/sync-todos-from-production.ts
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const TEMP_FILE = "todos-temp.json";
const SANDBOX_PATTERN =
  ".netlify/blobs-serve/entries/**/site%3Atodos/todos-data";

async function syncTodos() {
  try {
    console.log("🔄 Syncing TODOs from production to local sandbox...\n");

    // Step 1: Download from production
    console.log("📥 Downloading TODOs from production...");
    execSync(`netlify blobs:get todos todos-data > ${TEMP_FILE}`, {
      stdio: "inherit",
    });

    // Step 2: Find sandbox file
    console.log("🔍 Finding local sandbox file...");
    const sandboxFiles = execSync(
      `powershell -Command "Get-ChildItem .netlify\\blobs-serve\\entries -Recurse -Filter 'todos-data' | Select-Object -ExpandProperty FullName"`,
      { encoding: "utf-8" }
    )
      .trim()
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f);

    if (sandboxFiles.length === 0) {
      console.error(
        "❌ No local sandbox file found. Make sure you've run 'netlify dev' at least once."
      );
      process.exit(1);
    }

    const sandboxFile = sandboxFiles[0];
    console.log(`✅ Found sandbox file: ${sandboxFile}\n`);

    // Step 3: Copy to sandbox
    console.log("📋 Copying TODOs to local sandbox...");
    fs.copyFileSync(TEMP_FILE, sandboxFile);

    // Step 4: Verify
    const data = JSON.parse(fs.readFileSync(sandboxFile, "utf-8"));
    console.log(`✅ Successfully synced ${data.todos.length} TODOs!\n`);

    // Cleanup
    fs.unlinkSync(TEMP_FILE);

    console.log("🎉 Sync complete! Restart 'netlify dev' to see the changes.");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

syncTodos();

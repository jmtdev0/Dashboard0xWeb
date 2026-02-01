import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

const LOCAL_URL = "http://localhost:8888";
const NETLIFY_URL = "https://develop--dashboard0x.netlify.app";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Run sequentially to avoid auth conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "local",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: LOCAL_URL,
      },
      testMatch: /.*\.local\.spec\.ts/,
    },
    {
      name: "netlify",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: NETLIFY_URL,
      },
      testMatch: /.*\.netlify\.spec\.ts|.*debug.*\.spec\.ts/,
    },
    {
      name: "all",
      use: {
        ...devices["Desktop Chrome"],
      },
      testMatch: /.*\.spec\.ts/,
    },
  ],

  // Timeout settings for slower Netlify cold starts
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
});

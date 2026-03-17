"use client";

import { useState, useEffect } from "react";
import { TestResult } from "@/lib/scraper";

export default function Dashboard() {
  const [data, setData] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log("📊 [PUBLIC DASHBOARD] Loading data...");
    try {
      const response = await fetch("/api/results");
      console.log("📡 [PUBLIC DASHBOARD] Response status:", response.status);

      const result = await response.json();
      console.log("📦 [PUBLIC DASHBOARD] Full response:", JSON.stringify(result, null, 2));
      console.log("📦 [PUBLIC DASHBOARD] Data received:", {
        hasResults: !!result.results,
        timestamp: result.timestamp,
        message: result.message,
      });

      if (result.results) {
        // Log each service indicator
        console.log("🎥 [YOUTUBE]", {
          success: result.results.youtube?.success,
          lastVideo: result.results.youtube?.lastVideo,
          error: result.results.youtube?.error,
        });
        console.log("🐦 [TWITTER]", {
          success: result.results.twitter?.success,
          lastTweet: result.results.twitter?.lastTweet,
          totalTweets: result.results.twitter?.totalTweets,
          error: result.results.twitter?.error,
        });
        console.log("📷 [INSTAGRAM]", {
          success: result.results.instagram?.success,
          lastPost: result.results.instagram?.lastPost,
          error: result.results.instagram?.error,
        });
        console.log("🎮 [GITHUB]", {
          success: result.results.github?.success,
          version: result.results.github?.version,
          downloads: result.results.github?.downloads,
          error: result.results.github?.error,
        });
        console.log("🧩 [EXTENSIONS]", {
          count: result.results.extensions?.length || 0,
          extensions: result.results.extensions?.map((ext: any) => ({
            name: ext.name,
            available: ext.available,
            error: ext.error,
          })),
        });

        setData(result);
        setLastUpdate(result.timestamp);
        setError(null);
        console.log("✅ [PUBLIC DASHBOARD] Data loaded successfully");
      } else {
        console.log("⚠️ [PUBLIC DASHBOARD] No results in response");
        setError(result.message || "No data available yet");
      }
    } catch (err) {
      console.error("❌ [PUBLIC DASHBOARD] Failed to load data:", err);
      setError("Failed to load data");
    }
  };

  const handleRefresh = async () => {
    console.log("🔄 [PUBLIC DASHBOARD] Manual refresh triggered");
    setLoading(true);
    setError(null);

    try {
      console.log("🚀 [PUBLIC DASHBOARD] Calling scrape API...");
      const response = await fetch("/api/scrape", {
        method: "POST",
      });

      console.log("📡 [PUBLIC DASHBOARD] Scrape response:", {
        ok: response.ok,
        status: response.status,
      });

      const result = await response.json();
      console.log("📦 [PUBLIC DASHBOARD] Scrape result:", {
        success: result.success,
        timestamp: result.timestamp,
        hasResults: !!result.results,
      });

      if (response.ok) {
        setData(result);
        setLastUpdate(result.timestamp);
        console.log("✅ [PUBLIC DASHBOARD] Refresh successful");
      } else {
        console.log("❌ [PUBLIC DASHBOARD] Scrape failed:", result.error);
        setError(result.error || "Failed to refresh data");
      }
    } catch (err) {
      console.error("❌ [PUBLIC DASHBOARD] Refresh error:", err);
      setError("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 via-sky-200 to-blue-100 dark:from-sky-900 dark:to-blue-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-end">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-lg transition-all disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Running Tests...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh Now
                </>
              )}
            </button>
          </div>

          {lastUpdate && (
            <p className="text-sm text-slate-700 dark:text-sky-100 mt-4">
              Last updated: {new Date(lastUpdate).toLocaleString()}
            </p>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </header>

        {/* Dashboard Grid */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* YouTube Card */}
            <ServiceCard
              title="YouTube (@jmtdev)"
              icon="🎥"
              status={data.results.youtube.success}
              data={[
                {
                  label: "Last Video",
                  value: data.results.youtube.lastVideo || "N/A",
                },
              ]}
              error={data.results.youtube.error}
              link="https://www.youtube.com/@jmtdev"
            />

            {/* Twitter Card */}
            <ServiceCard
              title="Twitter (@windyBotES)"
              icon="🐦"
              status={data.results.twitter.success}
              data={[
                {
                  label: "Last Tweet",
                  value: data.results.twitter.lastTweet || "N/A",
                },
                {
                  label: "Total Tweets",
                  value: data.results.twitter.totalTweets || "N/A",
                },
              ]}
              error={data.results.twitter.error}
              link="https://x.com/windyBotES"
            />

            {/* Instagram Card */}
            <ServiceCard
              title="Instagram (@anainimaladay)"
              icon="📷"
              status={data.results.instagram.success}
              data={[
                {
                  label: "Last Post",
                  value: data.results.instagram.lastPost || "N/A",
                },
              ]}
              error={data.results.instagram.error}
              link="https://www.instagram.com/anainimaladay/"
            />

            {/* GitHub Card */}
            <ServiceCard
              title="Kingdom Hearts Custom Music"
              icon="🎮"
              status={data.results.github.success}
              data={[
                {
                  label: "Latest Version",
                  value: data.results.github.version || "N/A",
                },
                {
                  label: "Release Date",
                  value: data.results.github.releaseDate
                    ? new Date(
                        data.results.github.releaseDate
                      ).toLocaleDateString()
                    : "N/A",
                },
                {
                  label: "Downloads",
                  value: data.results.github.downloads?.toString() || "N/A",
                },
              ]}
              error={data.results.github.error}
              link="https://github.com/jmtdev0/KingdomHeartsCustomMusic"
            />

            {/* Extension Cards */}
            {data.results.extensions.map((ext) => (
              <ServiceCard
                key={ext.extensionId}
                title={ext.name}
                icon="🧩"
                status={ext.success}
                data={[
                  {
                    label: "Available",
                    value: ext.available ? "✓ Yes" : "✗ No",
                    color: ext.available ? "text-green-600" : "text-red-600",
                  },
                  {
                    label: "Functional Test",
                    value: ext.functionalTest ? "✓ Passed" : "○ Skipped",
                    color: ext.functionalTest
                      ? "text-green-600"
                      : "text-slate-400",
                  },
                ]}
                error={ext.error}
                link={`https://chromewebstore.google.com/detail/${ext.extensionId}`}
              />
            ))}

            {/* BeTheCandle Card */}
            <ServiceCard
              title="Be The Candle"
              icon="🕯️"
              status={data.results.bethecandle.success}
              data={[
                {
                  label: "Total Distributed",
                  value: data.results.bethecandle.totalDistributed != null
                    ? `$${data.results.bethecandle.totalDistributed.toFixed(2)} USDC`
                    : "N/A",
                },
              ]}
              error={data.results.bethecandle.error}
              link="https://bethecandle.live/history"
            />
          </div>
        )}

        {!data && !error && (
          <div className="text-center py-12">
            <p className="text-slate-800 dark:text-sky-50 text-lg">
              Loading dashboard data...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceCard({
  title,
  icon,
  status,
  data,
  error,
  link,
}: {
  title: string;
  icon: string;
  status: boolean;
  data: Array<{ label: string; value: string; color?: string }>;
  error?: string;
  link?: string;
}) {
  return (
    <div
      className={`bg-sky-50 dark:bg-sky-900/40 rounded-xl shadow-lg p-6 border-2 transition-all hover:shadow-xl ${
        status
          ? "border-blue-600 dark:border-blue-500"
          : "border-red-600 dark:border-red-500"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-sky-50">
              {title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  status ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  status
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {status ? "Operational" : "Error"}
              </span>
            </div>
          </div>
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:text-blue-800 dark:text-sky-200 dark:hover:text-sky-100"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>

      {/* Data */}
      {data.length > 0 && (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-slate-700 dark:text-sky-200">
                {item.label}:
              </span>
              <span
                className={`text-sm font-medium ${
                  item.color || "text-slate-900 dark:text-sky-50"
                }`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

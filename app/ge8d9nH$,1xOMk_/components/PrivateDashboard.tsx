"use client";

import { useState, useEffect } from "react";
import TodoSidebar from "./TodoSidebar";

interface CryptoData {
  timestamp: string;
  crypto: {
    success: boolean;
    btc?: { price: number; change24h: number };
    sol?: { price: number; change24h: number };
    error?: string;
  } | null;
}

interface PrivateDashboardProps {
  token: string;
  onLogout: () => void;
}

export default function PrivateDashboard({
  token,
  onLogout,
}: PrivateDashboardProps) {
  const [data, setData] = useState<CryptoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      const response = await fetch("/api/private/data", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        setError("Session expired. Redirecting to login...");
        setTimeout(() => onLogout(), 2000);
        return;
      }

      const result = await response.json();

      if (result.crypto) {
        setData(result);
        setError(null);
      } else {
        setError(result.message || "No data available yet");
      }
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      // Trigger scrape
      const response = await fetch("/api/scrape", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        // Reload private data after scrape completes
        await loadData();
      } else {
        setError(result.error || "Failed to refresh data");
      }
    } catch (err) {
      setError("Failed to refresh data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 via-sky-200 to-blue-100 dark:from-sky-900 dark:to-blue-800">
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <header className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-sky-50">
                  Private Dashboard
                </h1>
                <div className="flex gap-3">
                  {/* TODOs Button */}
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center gap-2"
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
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    TODOs
                  </button>
                  {/* Refresh Button */}
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
                  {/* Logout Button */}
                  <button
                    onClick={onLogout}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center gap-2"
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
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>

              {data?.timestamp && (
                <p className="text-sm text-slate-700 dark:text-sky-100">
                  Last updated: {new Date(data.timestamp).toLocaleString()}
                </p>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </header>

            {/* Dashboard Grid */}
            {data?.crypto && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* BTC Card */}
                <ServiceCard
                  title="Bitcoin (BTC)"
                  icon="₿"
                  status={data.crypto.success}
                  data={
                    data.crypto.btc
                      ? [
                          {
                            label: "Price (EUR)",
                            value: `€${data.crypto.btc.price.toLocaleString()}`,
                          },
                          {
                            label: "24h Change",
                            value: `${data.crypto.btc.change24h.toFixed(2)}%`,
                            color:
                              data.crypto.btc.change24h >= 0
                                ? "text-green-600"
                                : "text-red-600",
                          },
                        ]
                      : []
                  }
                  error={data.crypto.error}
                />

                {/* SOL Card */}
                <ServiceCard
                  title="Solana (SOL)"
                  icon="◎"
                  status={data.crypto.success}
                  data={
                    data.crypto.sol
                      ? [
                          {
                            label: "Price (EUR)",
                            value: `€${data.crypto.sol.price.toFixed(2)}`,
                          },
                          {
                            label: "24h Change",
                            value: `${data.crypto.sol.change24h.toFixed(2)}%`,
                            color:
                              data.crypto.sol.change24h >= 0
                                ? "text-green-600"
                                : "text-red-600",
                          },
                        ]
                      : []
                  }
                  error={data.crypto.error}
                />
              </div>
            )}

            {!data && !error && (
              <div className="text-center py-12">
                <div className="animate-pulse">
                  <p className="text-slate-800 dark:text-sky-50 text-lg">
                    Loading dashboard data...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TODO Sidebar */}
        <TodoSidebar
          token={token}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
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
}: {
  title: string;
  icon: string;
  status: boolean;
  data: Array<{ label: string; value: string; color?: string }>;
  error?: string;
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

"use client";

import { useState, useEffect } from "react";
import ServiceCard from "./ServiceCard";

interface CryptoData {
  timestamp: string;
  crypto: {
    success: boolean;
    btc?: { price: number; change24h: number };
    sol?: { price: number; change24h: number };
    error?: string;
  } | null;
}

interface CryptoViewProps {
  token: string;
  onBack: () => void;
}

export default function CryptoView({ token, onBack }: CryptoViewProps) {
  const [data, setData] = useState<CryptoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/private/data", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setError("Session expired. Please reload the page and login again.");
        return;
      }

      const result = await response.json();

      if (result.crypto) {
        setData(result);

        if (result.crypto.success && (result.crypto.btc || result.crypto.sol)) {
          setError(null);
        } else if (!result.crypto.success) {
          const errorMsg = result.crypto.error || "Failed to fetch crypto prices";
          setError(errorMsg);
        } else {
          setError("Crypto data incomplete");
        }
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
      const response = await fetch("/api/scrape", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Back button and title */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center gap-2"
                aria-label="Back to menu"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="hidden sm:inline">Volver</span>
              </button>

              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-sky-50">
                Crypto Dashboard
              </h1>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
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
                  <span className="hidden sm:inline">Running Tests...</span>
                  <span className="sm:hidden">Tests...</span>
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
                  <span className="hidden sm:inline">Refresh Now</span>
                  <span className="sm:hidden">Refresh</span>
                </>
              )}
            </button>
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
  );
}

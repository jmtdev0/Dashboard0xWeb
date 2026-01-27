"use client";

import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm";
import PrivateDashboard from "./components/PrivateDashboard";

const TOKEN_STORAGE_KEY = "dashboard_auth_token";
const TOKEN_EXPIRY_KEY = "dashboard_auth_expiry";

export default function PrivatePage() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount or check if cookie exists
  useEffect(() => {
    console.log("🔍 [CLIENT] Checking for existing session...");

    // First check if we have a cookie (web version)
    const checkCookie = async () => {
      try {
        // Try to fetch private data to see if cookie works
        const response = await fetch("/api/private/data", {
          credentials: "include", // Important: include cookies
        });

        if (response.ok) {
          console.log("✅ [CLIENT] Valid cookie found, using cookie-based auth");
          // Cookie is valid, set a dummy token to show dashboard
          setToken("cookie-auth");
          setIsLoading(false);
          return true;
        }
      } catch (error) {
        console.log("⚠️ [CLIENT] No valid cookie found");
      }
      return false;
    };

    // Run async check
    checkCookie().then((hasCookie) => {
      if (!hasCookie) {
        // No cookie, check localStorage (mobile version)
        console.log("🔍 [CLIENT] Checking localStorage...");
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

        if (storedToken && storedExpiry) {
          const expiryTime = parseInt(storedExpiry, 10);

          // Check if token is still valid
          if (Date.now() < expiryTime) {
            console.log("✅ [CLIENT] Valid token in localStorage");
            setToken(storedToken);
          } else {
            // Token expired, clean up
            console.log("⚠️ [CLIENT] Token expired, cleaning up");
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(TOKEN_EXPIRY_KEY);
          }
        } else {
          console.log("⚠️ [CLIENT] No stored token found");
        }

        setIsLoading(false);
      }
    });
  }, []);

  const handleLoginSuccess = (newToken: string, expiresAt: number) => {
    setToken(newToken);
    // Persist token and expiry in localStorage
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
  };

  const handleLogout = async () => {
    console.log("🚪 [CLIENT] Logging out...");

    // Call logout endpoint to clear cookie
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      console.log("✅ [CLIENT] Logout API called");
    } catch (error) {
      console.error("❌ [CLIENT] Logout error:", error);
    }

    // Clear local state
    setToken(null);
    // Remove token from localStorage
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    console.log("✅ [CLIENT] Local session cleared");
  };

  // Show loading state while checking for stored token
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-300 via-sky-200 to-blue-100 dark:from-sky-900 dark:to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 dark:text-sky-300 mx-auto"
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
          <p className="mt-4 text-slate-700 dark:text-sky-200">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if no token, otherwise show dashboard
  if (!token) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return <PrivateDashboard token={token} onLogout={handleLogout} />;
}

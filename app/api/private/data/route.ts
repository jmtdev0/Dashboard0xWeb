import { NextResponse } from "next/server";
import { validateToken } from "@/lib/auth-utils";
import { getDashboardData } from "@/lib/dashboard-storage";

export async function GET(request: Request) {
  console.log("🔐 [PRIVATE] Fetching private data");
  try {
    // Extract token from Authorization header or cookies
    const authHeader = request.headers.get("authorization");
    const cookieHeader = request.headers.get("cookie");

    let token = authHeader?.replace("Bearer ", "");

    // If no bearer token, try to get from cookies
    if (!token && cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...v] = c.split("=");
          return [key, v.join("=")];
        })
      );
      token = cookies["auth_token"];
      console.log("🍪 [PRIVATE] Using token from cookie");
    }

    console.log("🔑 [PRIVATE] Token present:", !!token);

    if (!token) {
      console.log("⚠️ [PRIVATE] No authentication token provided");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Validate token
    const isValid = validateToken(token);
    console.log("✓ [PRIVATE] Token valid:", isValid);

    if (!isValid) {
      console.log("❌ [PRIVATE] Invalid or expired token");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Token is valid - return private data
    console.log("📦 [PRIVATE] Fetching dashboard data from storage...");
    const data = await getDashboardData();
    console.log("📊 [PRIVATE] Data retrieved from storage:", {
      hasData: !!data,
      timestamp: data?.timestamp,
      hasResults: !!data?.results,
      hasCrypto: !!data?.results?.crypto,
    });

    if (!data) {
      console.log("⚠️ [PRIVATE] No data available in storage");
      return NextResponse.json({
        timestamp: null,
        crypto: null,
        message: "No data available yet. Run scraper first.",
      });
    }

    // Extract only crypto data
    const cryptoData = data.results.crypto || null;

    console.log("₿ [PRIVATE] Crypto data details:", {
      hasCrypto: !!cryptoData,
      success: cryptoData?.success,
      hasBTC: !!cryptoData?.btc,
      hasSOL: !!cryptoData?.sol,
      error: cryptoData?.error,
    });

    if (cryptoData) {
      console.log("₿ [PRIVATE] Crypto prices:", {
        btc: cryptoData.btc ? {
          price: cryptoData.btc.price,
          change24h: cryptoData.btc.change24h,
        } : null,
        sol: cryptoData.sol ? {
          price: cryptoData.sol.price,
          change24h: cryptoData.sol.change24h,
        } : null,
      });
    }

    const privateData = {
      timestamp: data.timestamp,
      crypto: cryptoData,
    };

    console.log("✅ [PRIVATE] Returning crypto data to client");
    return NextResponse.json(privateData);
  } catch (error) {
    console.error("❌ [PRIVATE] Private data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch private data" },
      { status: 500 }
    );
  }
}

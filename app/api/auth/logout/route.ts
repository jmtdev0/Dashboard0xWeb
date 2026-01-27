import { NextResponse } from "next/server";
import { revokeToken } from "@/lib/auth-utils";

export async function POST(request: Request) {
  console.log("🚪 [LOGOUT] Logout request received");
  try {
    // Get token from cookie or authorization header
    const cookieHeader = request.headers.get("cookie");
    const authHeader = request.headers.get("authorization");

    let token = authHeader?.replace("Bearer ", "");

    if (!token && cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...v] = c.split("=");
          return [key, v.join("=")];
        })
      );
      token = cookies["auth_token"];
    }

    // Revoke token if it exists
    if (token) {
      revokeToken(token);
      console.log("🗑️ [LOGOUT] Token revoked");
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear the auth cookie
    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    console.log("✅ [LOGOUT] Cookie cleared");
    return response;
  } catch (error) {
    console.error("❌ [LOGOUT] Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}

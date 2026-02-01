import { NextResponse } from "next/server";

export async function POST(request: Request) {
  console.log("🚪 [LOGOUT] Logout request received");
  try {
    // Note: With JWT tokens, we can't revoke them server-side (they're stateless)
    // The logout is handled by clearing the cookie on the client side
    console.log("🗑️ [LOGOUT] Clearing authentication cookie");

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

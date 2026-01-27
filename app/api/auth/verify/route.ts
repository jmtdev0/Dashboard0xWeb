import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storeToken } from "@/lib/auth-utils";

export async function POST(request: Request) {
  console.log("🔐 [AUTH] Authentication request received");
  try {
    const { password } = await request.json();

    if (!password) {
      console.log("⚠️ [AUTH] No password provided");
      return NextResponse.json(
        { success: false, error: "Password required" },
        { status: 400 }
      );
    }

    // Get stored hash from environment
    const storedHash = process.env.PRIVATE_PASSWORD_HASH;

    if (!storedHash) {
      console.error("❌ [AUTH] PRIVATE_PASSWORD_HASH not configured in environment");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Verify password
    console.log("🔍 [AUTH] Verifying password...");
    const isValid = await bcrypt.compare(password, storedHash);

    if (!isValid) {
      console.log("❌ [AUTH] Invalid password");
      // Add delay to prevent brute force attacks
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    console.log("✅ [AUTH] Password valid, generating token");

    // Generate cryptographically secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days from now

    // Store token in memory
    storeToken(token, expiresAt);
    console.log("💾 [AUTH] Token stored with expiry:", new Date(expiresAt).toISOString());

    // Create response with cookie for web clients
    const response = NextResponse.json({
      success: true,
      token,
      expiresAt,
    });

    // Set HTTP-only cookie that expires in 24 hours for web
    const cookieExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: cookieExpiresAt,
      path: "/",
    });

    console.log("🍪 [AUTH] Cookie set, expires:", cookieExpiresAt.toISOString());
    console.log("✅ [AUTH] Authentication successful");

    return response;
  } catch (error) {
    console.error("❌ [AUTH] Authentication verification error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storeToken } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password required" },
        { status: 400 }
      );
    }

    // Get stored hash from environment
    const storedHash = process.env.PRIVATE_PASSWORD_HASH;

    if (!storedHash) {
      console.error("PRIVATE_PASSWORD_HASH not configured in environment");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, storedHash);

    if (!isValid) {
      // Add delay to prevent brute force attacks
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    // Generate cryptographically secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes from now

    // Store token in memory
    storeToken(token, expiresAt);

    return NextResponse.json({
      success: true,
      token,
      expiresAt,
    });
  } catch (error) {
    console.error("Authentication verification error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}

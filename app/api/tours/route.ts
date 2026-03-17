import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAllTours } from "@/lib/tours-storage";

/**
 * Validate the password from the Authorization header
 * Accepts: Authorization: <password>
 */
async function validatePassword(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    console.log("⚠️ [TOURS] No Authorization header provided");
    return false;
  }

  // Support both raw password and "Bearer <password>" formats
  const password = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!password) {
    console.log("⚠️ [TOURS] Empty password in Authorization header");
    return false;
  }

  const storedHash = process.env.PRIVATE_PASSWORD_HASH;

  if (!storedHash) {
    console.error("❌ [TOURS] PRIVATE_PASSWORD_HASH not configured");
    return false;
  }

  const isValid = await bcrypt.compare(password, storedHash);
  console.log("🔍 [TOURS] Password valid:", isValid);
  return isValid;
}

/**
 * GET /api/tours - Fetch all tours
 * Requires Authorization header with the login password
 * Returns JSON with tours array
 */
export async function GET(request: Request) {
  console.log("🗺️ [TOURS] GET request received");
  try {
    const isValid = await validatePassword(request);

    if (!isValid) {
      console.log("❌ [TOURS] Unauthorized request");
      // Add delay to prevent brute force attacks
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("📦 [TOURS] Fetching all tours...");
    const data = await getAllTours();
    console.log("✅ [TOURS] Tours fetched successfully:", data.tours.length, "items");

    return NextResponse.json(data, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("❌ [TOURS] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tours" },
      { status: 500 }
    );
  }
}

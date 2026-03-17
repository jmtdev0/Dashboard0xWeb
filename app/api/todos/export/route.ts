import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAllTodos } from "@/lib/todos-storage";

/**
 * GET /api/todos/export
 *
 * Returns the full TODO list as JSON.
 * Requires the plain-text password in the Authorization header:
 *   Authorization: Bearer <password>
 *
 * The password is verified against PRIVATE_PASSWORD_HASH using bcrypt,
 * exactly like the login endpoint.
 */
export async function GET(request: Request) {
  console.log("📤 [TODOS EXPORT] GET request received");

  try {
    // Extract password from Authorization header
    const authHeader = request.headers.get("authorization");
    const password = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!password) {
      console.log("⚠️ [TODOS EXPORT] No password provided");
      return NextResponse.json(
        { error: "Authorization header with Bearer password required" },
        { status: 401 }
      );
    }

    // Verify password against stored bcrypt hash
    const storedHash = process.env.PRIVATE_PASSWORD_HASH;

    if (!storedHash) {
      console.error("❌ [TODOS EXPORT] PRIVATE_PASSWORD_HASH not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const isValid = await bcrypt.compare(password, storedHash);

    if (!isValid) {
      console.log("❌ [TODOS EXPORT] Invalid password");
      // Delay to slow down brute-force attempts
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    console.log("✅ [TODOS EXPORT] Password valid, fetching todos...");
    const data = await getAllTodos();
    console.log("📦 [TODOS EXPORT] Returning", data.todos.length, "todos");

    return NextResponse.json(data, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("❌ [TODOS EXPORT] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

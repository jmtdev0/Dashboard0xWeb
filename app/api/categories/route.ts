import { NextResponse } from "next/server";
import { validateToken } from "@/lib/auth-utils";
import {
  getAllCategories,
  getAllCategoriesFlat,
  createCategory,
} from "@/lib/categories-storage";

/**
 * Extract and validate token from Authorization header or cookies
 */
function validateRequest(request: Request): boolean {
  console.log("🔐 [CATEGORIES] Validating request...");

  // Try to get token from Authorization header first
  const authHeader = request.headers.get("authorization");
  let token = authHeader?.replace("Bearer ", "");

  // If no bearer token, try to get from cookies
  if (!token) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...v] = c.split("=");
          return [key, v.join("=")];
        })
      );
      token = cookies["auth_token"];
      if (token) {
        console.log("🍪 [CATEGORIES] Using token from cookie");
      }
    }
  } else {
    console.log("🔑 [CATEGORIES] Using Bearer token");
  }

  if (!token) {
    console.log("⚠️ [CATEGORIES] No token provided");
    return false;
  }

  const isValid = validateToken(token);
  console.log("✓ [CATEGORIES] Token valid:", isValid);

  return isValid;
}

/**
 * GET /api/categories - Fetch all categories as tree structure
 * Query params:
 *   - flat=true: Return flat list instead of tree
 * Requires valid Authorization token
 */
export async function GET(request: Request) {
  console.log("📁 [CATEGORIES] GET request received");
  try {
    if (!validateRequest(request)) {
      console.log("❌ [CATEGORIES] Unauthorized GET request");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const flat = searchParams.get("flat") === "true";

    console.log("📦 [CATEGORIES] Fetching categories (flat:", flat, ")");

    const categories = flat
      ? await getAllCategoriesFlat()
      : await getAllCategories();

    console.log("✅ [CATEGORIES] Categories fetched successfully");

    return NextResponse.json(categories, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error("❌ [CATEGORIES] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories - Create new category
 * Body: { name: string, parentId?: string | null }
 * Requires valid Authorization token
 */
export async function POST(request: Request) {
  console.log("➕ [CATEGORIES] POST request received");
  try {
    if (!validateRequest(request)) {
      console.log("❌ [CATEGORIES] Unauthorized POST request");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { name, parentId } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Limit name length
    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name too long (max 100 characters)" },
        { status: 400 }
      );
    }

    // Validate parentId if provided
    if (parentId !== undefined && parentId !== null && typeof parentId !== "string") {
      return NextResponse.json(
        { error: "Invalid parent ID" },
        { status: 400 }
      );
    }

    const newCategory = await createCategory(
      name,
      parentId === undefined ? null : parentId
    );

    console.log("✅ [CATEGORIES] Category created:", newCategory.id);
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("❌ [CATEGORIES] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

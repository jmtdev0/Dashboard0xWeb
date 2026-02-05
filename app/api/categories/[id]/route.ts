import { NextResponse } from "next/server";
import { validateToken } from "@/lib/auth-utils";
import { updateCategory, deleteCategory } from "@/lib/categories-storage";

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
 * PUT /api/categories/[id] - Update category name
 * Body: { name: string }
 * Requires valid Authorization token
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("✏️ [CATEGORIES] PUT request received");
  try {
    if (!validateRequest(request)) {
      console.log("❌ [CATEGORIES] Unauthorized PUT request");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { name } = await request.json();

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

    const updatedCategory = await updateCategory(id, name);

    if (!updatedCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    console.log("✅ [CATEGORIES] Category updated:", id);
    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("❌ [CATEGORIES] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[id] - Delete category and all subcategories
 * Requires valid Authorization token
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🗑️ [CATEGORIES] DELETE request received");
  try {
    if (!validateRequest(request)) {
      console.log("❌ [CATEGORIES] Unauthorized DELETE request");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const deleted = await deleteCategory(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    console.log("✅ [CATEGORIES] Category deleted:", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [CATEGORIES] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}

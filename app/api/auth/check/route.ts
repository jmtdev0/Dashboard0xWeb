import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    // Validate the token
    const isValid = validateToken(token);

    if (isValid) {
      return NextResponse.json({ valid: true, token }, { status: 200 });
    } else {
      return NextResponse.json({ valid: false }, { status: 200 });
    }
  } catch (error) {
    console.error("Error checking auth token:", error);
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}

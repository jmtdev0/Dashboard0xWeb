import jwt from "jsonwebtoken";

// Get JWT secret from environment or generate a warning
// Uses PRIVATE_AUTH_SECRET for JWT signing (same variable used before for session tokens)
const JWT_SECRET = process.env.PRIVATE_AUTH_SECRET;

if (!JWT_SECRET) {
  console.warn(
    "⚠️ [AUTH] PRIVATE_AUTH_SECRET not set in environment variables. Using fallback (not secure for production)."
  );
}

// Use a fallback secret for development (not secure for production)
const SECRET = JWT_SECRET || "dev-secret-change-in-production";

interface TokenPayload {
  exp: number; // Expiration timestamp (in seconds)
}

/**
 * Validates if a JWT token is valid and not expired
 * Works in serverless environments (no in-memory state required)
 * @param token - The JWT token to validate
 * @returns true if token is valid and not expired, false otherwise
 */
export function validateToken(token: string): boolean {
  try {
    // Verify the token signature and expiration
    jwt.verify(token, SECRET) as TokenPayload;
    return true;
  } catch (error) {
    // Token is invalid or expired
    return false;
  }
}

/**
 * Generates a new JWT token with expiration
 * @param expiresAt - Unix timestamp when token expires (in milliseconds)
 * @returns The generated JWT token
 */
export function generateToken(expiresAt: number): string {
  // JWT expects expiration in seconds, not milliseconds
  const expiresAtSeconds = Math.floor(expiresAt / 1000);

  const token = jwt.sign(
    {
      // You can add custom claims here if needed
      iat: Math.floor(Date.now() / 1000), // Issued at
    },
    SECRET,
    {
      expiresIn: expiresAtSeconds - Math.floor(Date.now() / 1000), // Time until expiration in seconds
    }
  );

  return token;
}

/**
 * Legacy function for compatibility - no longer needed with JWT
 * JWT tokens are self-contained and don't need to be stored
 * @deprecated This function is no longer needed with JWT
 */
export function storeToken(token: string, expiresAt: number): void {
  // No-op: JWT tokens don't need to be stored
  console.log("💡 [AUTH] storeToken called but not needed with JWT");
}

/**
 * Legacy function for compatibility - no longer needed with JWT
 * @deprecated This function is no longer needed with JWT
 */
export function revokeToken(token: string): void {
  // No-op: JWT tokens can't be revoked without a blacklist
  console.log("💡 [AUTH] revokeToken called but not supported with stateless JWT");
}

/**
 * Legacy function for compatibility
 * @deprecated This function is no longer meaningful with JWT
 */
export function getActiveTokenCount(): number {
  return 0; // No tokens are stored with JWT
}

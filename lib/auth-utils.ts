// In-memory token store (resets on server restart - intentional for stateless design)
const validTokens = new Map<string, { expiresAt: number }>();

/**
 * Validates if a token is valid and not expired
 * @param token - The token to validate
 * @returns true if token is valid and not expired, false otherwise
 */
export function validateToken(token: string): boolean {
  const tokenData = validTokens.get(token);

  if (!tokenData) {
    return false;
  }

  // Check if expired
  if (tokenData.expiresAt < Date.now()) {
    validTokens.delete(token);
    return false;
  }

  return true;
}

/**
 * Stores a token with expiration timestamp
 * @param token - The token to store
 * @param expiresAt - Unix timestamp when token expires
 */
export function storeToken(token: string, expiresAt: number): void {
  validTokens.set(token, { expiresAt });
}

/**
 * Revokes a token immediately
 * @param token - The token to revoke
 */
export function revokeToken(token: string): void {
  validTokens.delete(token);
}

/**
 * Gets the count of active tokens (for debugging/monitoring)
 */
export function getActiveTokenCount(): number {
  return validTokens.size;
}

// Cleanup expired tokens periodically
const CLEANUP_INTERVAL = 60000; // Every minute

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [token, data] of validTokens.entries()) {
    if (data.expiresAt < now) {
      validTokens.delete(token);
    }
  }
}, CLEANUP_INTERVAL);

// Prevent the cleanup interval from keeping the process alive
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

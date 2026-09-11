import crypto from "crypto";

export const STATUS_COOKIE_NAME = "fess_status_session";

export function getExpectedStatusPin(): string {
  return (process.env.STATUS_PAGE_PIN || "2112").trim();
}

export function getStatusAuthToken(): string {
  const pin = getExpectedStatusPin();
  return crypto
    .createHash("sha256")
    .update(`fess-status-auth-${pin}`)
    .digest("hex");
}

export function verifyStatusAuthToken(token?: string | null): boolean {
  if (!token) return false;
  const expectedToken = getStatusAuthToken();
  return token === expectedToken;
}

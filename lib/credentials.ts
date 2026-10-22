import { portalUsername, safeEqual } from "./session";

const DEFAULT_PASSWORD = "Pa55w0rd12#";

export function portalPassword(): string {
  const configured = process.env.PORTAL_PASSWORD;
  return configured && configured.length > 0 ? configured : DEFAULT_PASSWORD;
}

export function credentialsMatch(username: string, password: string): boolean {
  const usernameMatches = safeEqual(username.trim(), portalUsername());
  const passwordMatches = safeEqual(password, portalPassword());
  return usernameMatches && passwordMatches;
}

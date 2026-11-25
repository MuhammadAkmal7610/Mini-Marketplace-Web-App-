import { findUserBySession } from "@/lib/database";
import type { User } from "@/lib/marketplace";

export const SESSION_COOKIE = "marketplace_session";

export async function getRequestUser(request: Request): Promise<User | null> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return token ? findUserBySession(decodeURIComponent(token)) : null;
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=1209600${secure}`;
}

export function expiredSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

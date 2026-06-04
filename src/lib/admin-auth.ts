import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_PASSWORD_ENV = "ZENFULNOTE_ADMIN_PASSWORD";
export const ADMIN_SESSION_SECRET_ENV = "ZENFULNOTE_ADMIN_SESSION_SECRET";
export const ADMIN_COOKIE_NAME = "zenfulnote_admin";

const ADMIN_SESSION_SECONDS = 60 * 60 * 12;

export function isAdminConfigured() {
  return Boolean(adminPassword());
}

export function verifyAdminPassword(password: string) {
  const expected = adminPassword();
  return Boolean(expected && safeEqual(password, expected));
}

export function createAdminSessionToken(now = new Date()) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload = `${issuedAt}.${randomBytes(18).toString("base64url")}`;
  return `${payload}.${signAdminPayload(payload)}`;
}

export function validateAdminSessionToken(token: string | undefined) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [issuedAt, nonce, signature] = parts;
  const timestamp = Number(issuedAt);
  if (!Number.isFinite(timestamp) || !nonce || !signature) return false;

  const ageSeconds = Math.floor(Date.now() / 1000) - timestamp;
  if (ageSeconds < 0 || ageSeconds > ADMIN_SESSION_SECONDS) return false;

  return safeEqual(signature, signAdminPayload(`${issuedAt}.${nonce}`));
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return validateAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export async function setAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function adminApiUnauthorized() {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "Admin password is not configured." },
      { status: 503 },
    );
  }

  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Admin login required." }, { status: 401 });
  }

  return null;
}

function adminPassword() {
  return process.env[ADMIN_PASSWORD_ENV]?.trim();
}

function adminSessionSecret() {
  return (
    process.env[ADMIN_SESSION_SECRET_ENV]?.trim() ||
    process.env[ADMIN_PASSWORD_ENV]?.trim() ||
    ""
  );
}

function signAdminPayload(payload: string) {
  return createHmac("sha256", adminSessionSecret()).update(payload).digest("hex");
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  if (firstBuffer.length !== secondBuffer.length) return false;
  return timingSafeEqual(firstBuffer, secondBuffer);
}

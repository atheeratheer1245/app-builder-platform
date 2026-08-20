import { promisify } from "node:util";
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import type { Request, Response } from "express";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";

const scrypt = promisify(scryptCallback);
const LOCAL_SESSION_COOKIE = "app_builder_local_session";
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

type LocalSession = { userId: number };

function sessionKey() {
  if (!ENV.cookieSecret) throw new Error("Session secret is unavailable");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createLocalSession(userId: number) {
  return new SignJWT({ type: "local" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionKey());
}

export async function getLocalSession(req: Request): Promise<LocalSession | null> {
  const cookieToken = parse(req.headers.cookie ?? "")[LOCAL_SESSION_COOKIE];
  const authorization = req.headers.authorization;
  const bearerToken = typeof authorization === "string" && /^Bearer\s+\S+$/i.test(authorization)
    ? authorization.replace(/^Bearer\s+/i, "")
    : "";
  const token = cookieToken || bearerToken;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    if (payload.type !== "local" || !payload.sub || !/^[1-9]\d*$/.test(payload.sub)) return null;
    return { userId: Number(payload.sub) };
  } catch {
    return null;
  }
}

export async function setLocalSession(req: Request, res: Response, userId: number) {
  const token = await createLocalSession(userId);
  res.cookie(LOCAL_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(req),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearLocalSession(req: Request, res: Response) {
  res.clearCookie(LOCAL_SESSION_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 });
}

export async function getLocalAuthenticatedUser(req: Request) {
  const session = await getLocalSession(req);
  if (!session) return null;
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return result[0] ?? null;
}

export function createLocalOpenId() {
  return `local_${randomUUID().replaceAll("-", "")}`;
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createResetToken() {
  return { rawToken: randomBytes(32).toString("base64url"), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) };
}

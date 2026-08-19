import { createRemoteJWKSet, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";
import { parse } from "cookie";
import type { Express, Request, Response } from "express";
import { eq, or } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { createLocalOpenId, createLocalSession, setLocalSession } from "./localAuth";
import { getSessionCookieOptions } from "./_core/cookies";
import { getRequestBaseUrl } from "./publicUrl";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_STATE_COOKIE = "app_builder_google_state";
const GOOGLE_REDIRECT_COOKIE = "app_builder_google_redirect";
const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured");
  return { clientId, clientSecret };
}

export function buildGoogleAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string }) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    prompt: "select_account",
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getGoogleConfig();
  const form = new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" });
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  if (!response.ok) throw new Error("Google could not exchange the authorization code");
  const body = await response.json() as { id_token?: string };
  if (!body.id_token) throw new Error("Google did not return an identity token");
  return body.id_token;
}

async function verifyGoogleIdentity(idToken: string) {
  const { clientId } = getGoogleConfig();
  const { payload } = await jwtVerify(idToken, googleJwks, { audience: clientId, issuer: ["https://accounts.google.com", "accounts.google.com"] });
  if (!payload.sub || !payload.email || payload.email_verified !== true) throw new Error("Google did not verify the email address");
  return { googleId: payload.sub, email: String(payload.email).toLowerCase(), name: typeof payload.name === "string" ? payload.name : null };
}

async function findOrCreateGoogleUser(identity: { googleId: string; email: string; name: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const googleOpenId = `google_${identity.googleId}`;
  const existing = (await db.select().from(users).where(or(eq(users.openId, googleOpenId), eq(users.email, identity.email))).limit(1))[0];
  if (existing) {
    await db.update(users).set({ name: identity.name ?? existing.name, email: identity.email, loginMethod: "google", lastSignedIn: new Date() }).where(eq(users.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(users).values({ openId: googleOpenId || createLocalOpenId(), name: identity.name, email: identity.email, loginMethod: "google", lastSignedIn: new Date() });
  return Number(result[0]?.insertId ?? 0);
}

function clearGoogleState(req: Request, res: Response) {
  res.clearCookie(GOOGLE_STATE_COOKIE, { ...getSessionCookieOptions(req), sameSite: "lax", maxAge: -1 });
  res.clearCookie(GOOGLE_REDIRECT_COOKIE, { ...getSessionCookieOptions(req), sameSite: "lax", maxAge: -1 });
}

function getGoogleCallbackUrl(req: Request) {
  const stored = parse(req.headers.cookie ?? "")[GOOGLE_REDIRECT_COOKIE];
  if (stored) {
    try {
      const url = new URL(stored);
      if (url.protocol === "https:" && url.pathname === "/api/auth/google/callback" && !url.search && !url.hash) return url.toString();
    } catch {
      // Fall back to the validated request origin below.
    }
  }
  return `${getRequestBaseUrl(req)}/api/auth/google/callback`;
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req, res) => {
    try {
      const { clientId } = getGoogleConfig();
      const state = randomBytes(32).toString("base64url");
      const redirectUri = getGoogleCallbackUrl(req);
      res.set("Cache-Control", "no-store");
      // Google returns to this site through a top-level GET navigation. Lax keeps CSRF
      // state protection while ensuring browsers return this short-lived cookie reliably.
      res.cookie(GOOGLE_STATE_COOKIE, state, { ...getSessionCookieOptions(req), sameSite: "lax", maxAge: 10 * 60 * 1000 });
      res.cookie(GOOGLE_REDIRECT_COOKIE, redirectUri, { ...getSessionCookieOptions(req), sameSite: "lax", maxAge: 10 * 60 * 1000 });
      res.redirect(buildGoogleAuthorizationUrl({ clientId, redirectUri, state }));
    } catch {
      res.redirect("/auth?google=configuration_error");
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const callbackState = typeof req.query.state === "string" ? req.query.state : "";
    const expectedState = parse(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE];
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code || !callbackState || !expectedState || callbackState !== expectedState) {
      clearGoogleState(req, res);
      res.redirect("/auth?google=state_error");
      return;
    }
    try {
      const redirectUri = getGoogleCallbackUrl(req);
      const identity = await verifyGoogleIdentity(await exchangeGoogleCode(code, redirectUri));
      const userId = await findOrCreateGoogleUser(identity);
      if (!userId) throw new Error("Unable to create Google account");
      await setLocalSession(req, res, userId);
      clearGoogleState(req, res);
      res.redirect("/app");
    } catch (error) {
      clearGoogleState(req, res);
      const message = error instanceof Error ? error.message : "Unknown Google OAuth error";
      const failure = message.includes("exchange") ? "exchange_error" : message.includes("identity") || message.includes("verify") ? "identity_error" : "authorization_error";
      console.warn("[Google OAuth] Callback failed", { failure });
      res.redirect(`/auth?google=${failure}`);
    }
  });

  app.post("/api/auth/google/native", async (req, res) => {
    const idToken = typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";
    if (!idToken || idToken.length > 16_384) {
      res.status(400).json({ error: "invalid_token" });
      return;
    }
    try {
      const identity = await verifyGoogleIdentity(idToken);
      const userId = await findOrCreateGoogleUser(identity);
      if (!userId) throw new Error("Unable to create Google account");
      // The Android app receives this same signed, short-lived session capability only over HTTPS
      // and stores it as an HttpOnly-equivalent WebView cookie for the published app origin.
      const sessionToken = await createLocalSession(userId);
      res.set("Cache-Control", "no-store");
      res.status(200).json({ sessionToken });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown native Google OAuth error";
      const failure = message.includes("identity") || message.includes("verify") ? "identity_error" : "authorization_error";
      console.warn("[Google OAuth] Native sign-in failed", { failure });
      res.status(401).json({ error: failure });
    }
  });
}

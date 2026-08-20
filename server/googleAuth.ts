import { createRemoteJWKSet, jwtVerify } from "jose";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
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
const GOOGLE_STATE_TTL_MS = 10 * 60 * 1000;
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

type SignedGoogleState = { nonce: string; redirectUri: string; issuedAt: number };

function googleStateSecret() {
  const secret = process.env.JWT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!secret) throw new Error("Google state signing secret is unavailable");
  return secret;
}

function stateSignature(payload: string) {
  return createHmac("sha256", googleStateSecret()).update(payload).digest("base64url");
}

/** Keeps CSRF protection intact even if privacy controls drop the temporary state cookie. */
export function createGoogleState(input: Omit<SignedGoogleState, "issuedAt"> & { issuedAt?: number }) {
  const payload = Buffer.from(JSON.stringify({ ...input, issuedAt: input.issuedAt ?? Date.now() })).toString("base64url");
  return `${payload}.${stateSignature(payload)}`;
}

export function verifyGoogleState(state: string): SignedGoogleState | null {
  const [payload, signature, ...extra] = state.split(".");
  if (!payload || !signature || extra.length) return null;
  const expected = stateSignature(payload);
  const receivedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (receivedBytes.length !== expectedBytes.length || !timingSafeEqual(receivedBytes, expectedBytes)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SignedGoogleState>;
    const callback = typeof parsed.redirectUri === "string" ? new URL(parsed.redirectUri) : null;
    const validCallback = callback?.protocol === "https:" && callback.pathname === "/api/auth/google/callback" && !callback.search && !callback.hash;
    if (!validCallback || typeof parsed.nonce !== "string" || parsed.nonce.length < 32 || typeof parsed.issuedAt !== "number" || !Number.isFinite(parsed.issuedAt) || Date.now() - parsed.issuedAt > GOOGLE_STATE_TTL_MS || parsed.issuedAt > Date.now() + 30_000) return null;
    return { nonce: parsed.nonce, redirectUri: callback.toString(), issuedAt: parsed.issuedAt };
  } catch {
    return null;
  }
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
}

function getGoogleCallbackUrl(req: Request, stored?: string) {
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

function readGoogleState(req: Request) {
  const stored = parse(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE];
  if (!stored) return { state: undefined, redirectUri: undefined };
  try {
    const parsed = JSON.parse(stored) as { state?: unknown; redirectUri?: unknown };
    if (typeof parsed.state === "string") return { state: parsed.state, redirectUri: typeof parsed.redirectUri === "string" ? parsed.redirectUri : undefined };
  } catch {
    // Accept the prior state-only cookie during a rolling deployment.
  }
  return { state: stored, redirectUri: undefined };
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req, res) => {
    try {
      const { clientId } = getGoogleConfig();
      const redirectUri = getGoogleCallbackUrl(req);
      const state = createGoogleState({ nonce: randomBytes(32).toString("base64url"), redirectUri });
      res.set("Cache-Control", "no-store");
      // Google returns to this site through a top-level GET navigation. Lax keeps CSRF
      // state protection while ensuring browsers return this short-lived cookie reliably.
      res.cookie(GOOGLE_STATE_COOKIE, JSON.stringify({ state, redirectUri }), { ...getSessionCookieOptions(req), sameSite: "lax", maxAge: GOOGLE_STATE_TTL_MS });
      res.redirect(buildGoogleAuthorizationUrl({ clientId, redirectUri, state }));
    } catch {
      res.redirect("/auth?google=configuration_error");
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const callbackState = typeof req.query.state === "string" ? req.query.state : "";
    const { state: expectedState } = readGoogleState(req);
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const providerError = typeof req.query.error === "string" ? req.query.error : "";
    if (providerError) {
      clearGoogleState(req, res);
      res.redirect(`/auth?google=${providerError === "access_denied" ? "audience_error" : "provider_error"}`);
      return;
    }
    const signedState = callbackState ? verifyGoogleState(callbackState) : null;
    if (!code || !callbackState || !signedState || (expectedState && callbackState !== expectedState)) {
      clearGoogleState(req, res);
      res.redirect("/auth?google=state_error");
      return;
    }
    let stage: "exchange" | "identity" | "account" | "session" = "exchange";
    try {
      const redirectUri = getGoogleCallbackUrl(req, signedState.redirectUri);
      const idToken = await exchangeGoogleCode(code, redirectUri);
      stage = "identity";
      const identity = await verifyGoogleIdentity(idToken);
      stage = "account";
      const userId = await findOrCreateGoogleUser(identity);
      if (!userId) throw new Error("Unable to create Google account");
      clearGoogleState(req, res);
      // Write the authenticated session after clearing the short-lived OAuth state.
      // This preserves the session in deployments that retain only the final Set-Cookie header.
      stage = "session";
      await setLocalSession(req, res, userId);
      res.redirect("/app");
    } catch (error) {
      clearGoogleState(req, res);
      const failure = `${stage}_error`;
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

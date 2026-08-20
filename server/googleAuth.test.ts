import express, { type Request, type Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createRemoteJWKSet: vi.fn(() => ({})),
  jwtVerify: vi.fn(),
  getDb: vi.fn(),
  createLocalOpenId: vi.fn(() => "local_google_user"),
  createLocalSession: vi.fn(async () => "native-session-token"),
  setLocalSession: vi.fn(),
  getSessionCookieOptions: vi.fn(() => ({ httpOnly: true })),
  getRequestBaseUrl: vi.fn(() => "https://app.example.com"),
}));

vi.mock("jose", () => ({ createRemoteJWKSet: mocks.createRemoteJWKSet, jwtVerify: mocks.jwtVerify }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./localAuth", () => ({ createLocalOpenId: mocks.createLocalOpenId, createLocalSession: mocks.createLocalSession, setLocalSession: mocks.setLocalSession }));
vi.mock("./_core/cookies", () => ({ getSessionCookieOptions: mocks.getSessionCookieOptions }));
vi.mock("./publicUrl", () => ({ getRequestBaseUrl: mocks.getRequestBaseUrl }));

import { buildGoogleAuthorizationUrl, createGoogleState, registerGoogleAuthRoutes } from "./googleAuth";

function getCallbackHandler() {
  const app = express();
  registerGoogleAuthRoutes(app);
  const layer = (app as unknown as { _router: { stack: Array<{ route?: { path?: string; stack: Array<{ handle: (req: Request, res: Response) => Promise<void> }> } }> } })._router.stack
    .find(item => item.route?.path === "/api/auth/google/callback");
  if (!layer?.route) throw new Error("Google callback route was not registered");
  return layer.route.stack[0].handle;
}

function getStartHandler() {
  const app = express();
  registerGoogleAuthRoutes(app);
  const layer = (app as unknown as { _router: { stack: Array<{ route?: { path?: string; stack: Array<{ handle: (req: Request, res: Response) => Promise<void> }> } }> } })._router.stack
    .find(item => item.route?.path === "/api/auth/google");
  if (!layer?.route) throw new Error("Google start route was not registered");
  return layer.route.stack[0].handle;
}

function getNativeHandler() {
  const app = express();
  registerGoogleAuthRoutes(app);
  const layer = (app as unknown as { _router: { stack: Array<{ route?: { path?: string; stack: Array<{ handle: (req: Request, res: Response) => Promise<void> }> } }> } })._router.stack
    .find(item => item.route?.path === "/api/auth/google/native");
  if (!layer?.route) throw new Error("Google native route was not registered");
  return layer.route.stack[0].handle;
}

function responseRecorder() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    redirect: vi.fn(),
    set: vi.fn(),
    status: vi.fn(function status() { return this; }),
    json: vi.fn(),
  } as unknown as Response;
}

function callbackRequest(input: { state?: string; code?: string; cookie?: string }) {
  return {
    query: { ...(input.state ? { state: input.state } : {}), ...(input.code ? { code: input.code } : {}) },
    headers: { cookie: input.cookie ?? "" },
    protocol: "https",
  } as unknown as Request;
}

function signedState(redirectUri = "https://app.example.com/api/auth/google/callback") {
  return createGoogleState({ nonce: "a".repeat(43), redirectUri });
}

describe("Google OAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-client-secret";
  });

  it("builds an OpenID authorization request with state and a matching callback URI", () => {
    const url = new URL(buildGoogleAuthorizationUrl({ clientId: "test-client-id", redirectUri: "https://app.example.com/api/auth/google/callback", state: "csrf-state" }));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.com/api/auth/google/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toContain("openid");
    expect(url.searchParams.get("state")).toBe("csrf-state");
  });

  it("uses a short-lived Lax state cookie so the callback receives state on Google top-level navigation", async () => {
    const handler = getStartHandler();
    const res = responseRecorder();
    await handler({ protocol: "https", headers: {} } as Request, res);
    const call = vi.mocked(res.cookie).mock.calls.find(([name]) => name === "app_builder_google_state");
    expect(call?.[2]).toMatchObject({ sameSite: "lax", maxAge: 10 * 60 * 1000 });
    expect(JSON.parse(String(call?.[1]))).toMatchObject({ redirectUri: "https://app.example.com/api/auth/google/callback" });
  });

  it("rejects a callback with a mismatched state cookie before exchanging the code", async () => {
    const handler = getCallbackHandler();
    const res = responseRecorder();

    await handler(callbackRequest({ state: signedState(), code: "code", cookie: "app_builder_google_state=wrong-state" }), res);

    expect(res.redirect).toHaveBeenCalledWith("/auth?google=state_error");
    expect(res.clearCookie).toHaveBeenCalledWith("app_builder_google_state", expect.any(Object));
  });

  it("redirects safely when Google rejects the authorization-code exchange", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const handler = getCallbackHandler();
    const res = responseRecorder();
    const state = signedState();

    await handler(callbackRequest({ state, code: "rejected-code", cookie: `app_builder_google_state=${state}` }), res);

    expect(fetch).toHaveBeenCalledWith("https://oauth2.googleapis.com/token", expect.objectContaining({ method: "POST" }));
    expect(res.redirect).toHaveBeenCalledWith("/auth?google=exchange_error");
    expect(mocks.setLocalSession).not.toHaveBeenCalled();
  });

  it("uses the exact callback URL stored at authorization start during code exchange", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    mocks.getRequestBaseUrl.mockReturnValue("https://different.example.com");
    const handler = getCallbackHandler();
    const res = responseRecorder();

    const state = signedState("https://app.example.com/api/auth/google/callback");
    const stateCookie = encodeURIComponent(JSON.stringify({ state, redirectUri: "https://app.example.com/api/auth/google/callback" }));
    await handler(callbackRequest({ state, code: "rejected-code", cookie: `app_builder_google_state=${stateCookie}` }), res);

    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    expect((request?.body as URLSearchParams).get("redirect_uri")).toBe("https://app.example.com/api/auth/google/callback");
  });

  it("reports identity verification separately after a successful code exchange", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id_token: "unverified-token" }) }));
    mocks.jwtVerify.mockRejectedValueOnce(new Error("invalid token"));
    const handler = getCallbackHandler();
    const res = responseRecorder();
    const state = signedState();

    await handler(callbackRequest({ state, code: "valid-code", cookie: `app_builder_google_state=${state}` }), res);

    expect(res.redirect).toHaveBeenCalledWith("/auth?google=identity_error");
  });

  it("creates a local session only after a verified Google identity is returned", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id_token: "verified-token" }) }));
    mocks.jwtVerify.mockResolvedValueOnce({ payload: { sub: "google-subject", email: "owner@example.com", email_verified: true, name: "Owner" } });
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 7 }]);
    mocks.getDb.mockResolvedValueOnce({
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })),
      insert: vi.fn(() => ({ values: insertValues })),
    });
    const handler = getCallbackHandler();
    const res = responseRecorder();
    const state = signedState();

    await handler(callbackRequest({ state, code: "valid-code", cookie: `app_builder_google_state=${state}` }), res);

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ openId: "google_google-subject", email: "owner@example.com", loginMethod: "google" }));
    expect(mocks.setLocalSession).toHaveBeenCalledWith(expect.any(Object), res, 7);
    expect(res.redirect).toHaveBeenCalledWith("/app");
  });

  it("completes a verified callback when a privacy-focused browser omits the temporary state cookie", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id_token: "verified-token" }) }));
    mocks.jwtVerify.mockResolvedValueOnce({ payload: { sub: "cookie-free-subject", email: "cookie-free@example.com", email_verified: true, name: "Cookie Free" } });
    mocks.getDb.mockResolvedValueOnce({
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })),
      insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([{ insertId: 33 }]) })),
    });
    const res = responseRecorder();
    await getCallbackHandler()(callbackRequest({ state: signedState(), code: "valid-code" }), res);
    expect(mocks.setLocalSession).toHaveBeenCalledWith(expect.any(Object), res, 33);
    expect(res.redirect).toHaveBeenCalledWith("/app");
  });

  it("labels Google access_denied as an OAuth audience configuration problem", async () => {
    const res = responseRecorder();
    await getCallbackHandler()({ query: { error: "access_denied" }, headers: {} } as Request, res);
    expect(res.redirect).toHaveBeenCalledWith("/auth?google=audience_error");
  });

  it("verifies a native Google ID token and returns a signed session capability to the APK", async () => {
    mocks.jwtVerify.mockResolvedValueOnce({ payload: { sub: "native-google-subject", email: "native@example.com", email_verified: true, name: "Native Owner" } });
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 19 }]);
    mocks.getDb.mockResolvedValueOnce({
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })),
      insert: vi.fn(() => ({ values: insertValues })),
    });
    const handler = getNativeHandler();
    const res = responseRecorder();

    await handler({ body: { idToken: "native-id-token" } } as Request, res);

    expect(mocks.createLocalSession).toHaveBeenCalledWith(19);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sessionToken: "native-session-token" });
  });
});

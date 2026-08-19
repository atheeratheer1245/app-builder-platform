import express, { type Request, type Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createRemoteJWKSet: vi.fn(() => ({})),
  jwtVerify: vi.fn(),
  getDb: vi.fn(),
  createLocalOpenId: vi.fn(() => "local_google_user"),
  setLocalSession: vi.fn(),
  getSessionCookieOptions: vi.fn(() => ({ httpOnly: true })),
  getRequestBaseUrl: vi.fn(() => "https://app.example.com"),
}));

vi.mock("jose", () => ({ createRemoteJWKSet: mocks.createRemoteJWKSet, jwtVerify: mocks.jwtVerify }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./localAuth", () => ({ createLocalOpenId: mocks.createLocalOpenId, setLocalSession: mocks.setLocalSession }));
vi.mock("./_core/cookies", () => ({ getSessionCookieOptions: mocks.getSessionCookieOptions }));
vi.mock("./publicUrl", () => ({ getRequestBaseUrl: mocks.getRequestBaseUrl }));

import { buildGoogleAuthorizationUrl, registerGoogleAuthRoutes } from "./googleAuth";

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

function responseRecorder() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    redirect: vi.fn(),
    set: vi.fn(),
  } as unknown as Response;
}

function callbackRequest(input: { state?: string; code?: string; cookie?: string }) {
  return {
    query: { ...(input.state ? { state: input.state } : {}), ...(input.code ? { code: input.code } : {}) },
    headers: { cookie: input.cookie ?? "" },
    protocol: "https",
  } as unknown as Request;
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
    expect(res.cookie).toHaveBeenCalledWith("app_builder_google_state", expect.any(String), expect.objectContaining({ sameSite: "lax", maxAge: 10 * 60 * 1000 }));
  });

  it("rejects a callback with a mismatched state cookie before exchanging the code", async () => {
    const handler = getCallbackHandler();
    const res = responseRecorder();

    await handler(callbackRequest({ state: "wrong-state", code: "code", cookie: "app_builder_google_state=expected-state" }), res);

    expect(res.redirect).toHaveBeenCalledWith("/auth?google=state_error");
    expect(res.clearCookie).toHaveBeenCalledWith("app_builder_google_state", expect.any(Object));
  });

  it("redirects safely when Google rejects the authorization-code exchange", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const handler = getCallbackHandler();
    const res = responseRecorder();

    await handler(callbackRequest({ state: "expected-state", code: "rejected-code", cookie: "app_builder_google_state=expected-state" }), res);

    expect(fetch).toHaveBeenCalledWith("https://oauth2.googleapis.com/token", expect.objectContaining({ method: "POST" }));
    expect(res.redirect).toHaveBeenCalledWith("/auth?google=exchange_error");
    expect(mocks.setLocalSession).not.toHaveBeenCalled();
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

    await handler(callbackRequest({ state: "expected-state", code: "valid-code", cookie: "app_builder_google_state=expected-state" }), res);

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ openId: "google_google-subject", email: "owner@example.com", loginMethod: "google" }));
    expect(mocks.setLocalSession).toHaveBeenCalledWith(expect.any(Object), res, 7);
    expect(res.redirect).toHaveBeenCalledWith("/app");
  });
});

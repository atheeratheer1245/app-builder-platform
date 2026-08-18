import type { Request } from "express";

/** Returns a validated user-facing origin for OAuth callbacks and server-side email links. */
export function getRequestBaseUrl(req: Request) {
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProtocol === "string" ? forwardedProtocol.split(",")[0].trim() : req.protocol;
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = typeof forwardedHost === "string" ? forwardedHost.split(",")[0].trim() : req.get("host");
  if (!host || !/^[a-zA-Z0-9.:_-]+$/.test(host)) throw new Error("Unable to determine a safe application origin");
  return `${protocol === "https" ? "https" : "http"}://${host}`;
}

export const getPublicBaseUrl = getRequestBaseUrl;

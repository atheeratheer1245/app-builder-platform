import type { Express } from "express";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { createLocalOpenId, createLocalSession, hashPassword, normalizeEmail, verifyPassword } from "./localAuth";

type Credentials = { email?: unknown; password?: unknown; name?: unknown };

function readCredentials(body: Credentials, requireName: boolean) {
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || (requireName && name.length < 2)) return null;
  return { email, password, name };
}

async function issueNativeSession(userId: number, email: string) {
  return { sessionToken: await createLocalSession(userId), email };
}

export function registerMobileNativeAuthRoutes(app: Express) {
  app.post("/api/mobile/auth/sign-in", async (req, res) => {
    const input = readCredentials(req.body as Credentials, false);
    if (!input) return res.status(400).json({ error: "invalid_input" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "service_unavailable" });
    const user = (await db.select().from(users).where(eq(users.email, input.email)).limit(1))[0];
    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) return res.status(401).json({ error: "invalid_credentials" });
    await db.update(users).set({ lastSignedIn: new Date(), loginMethod: "email" }).where(eq(users.id, user.id));
    return res.status(200).json(await issueNativeSession(user.id, input.email));
  });

  app.post("/api/mobile/auth/sign-up", async (req, res) => {
    const input = readCredentials(req.body as Credentials, true);
    if (!input) return res.status(400).json({ error: "invalid_input" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "service_unavailable" });
    const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (duplicate.length) return res.status(409).json({ error: "email_exists" });
    const inserted = await db.insert(users).values({ openId: createLocalOpenId(), name: input.name, email: input.email, passwordHash: await hashPassword(input.password), loginMethod: "email", lastSignedIn: new Date() });
    const userId = Number(inserted[0]?.insertId ?? 0);
    if (!userId) return res.status(500).json({ error: "account_creation_failed" });
    return res.status(201).json(await issueNativeSession(userId, input.email));
  });
}

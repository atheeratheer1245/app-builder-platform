import { TRPCError } from "@trpc/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { passwordResetTokens, users } from "../../drizzle/schema";
import { getRequiredDb } from "../appBuilderDb";
import { clearLocalSession, createLocalOpenId, createResetToken, getLocalAuthenticatedUser, hashPassword, hashResetToken, normalizeEmail, setLocalSession, verifyPassword } from "../localAuth";
import { sendPasswordResetEmail } from "../mailer";
import { getPublicBaseUrl } from "../publicUrl";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

function invalidCredentials() {
  throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
}

export const localAuthRouter = router({
  me: publicProcedure.query(async ({ ctx }) => getLocalAuthenticatedUser(ctx.req)),
  profile: protectedProcedure.query(({ ctx }) => ctx.user),
  updateProfile: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120), mobile: z.union([z.literal(""), z.string().trim().regex(/^(?:05\d{8}|\+?9665\d{8})$/, "Enter a valid Saudi mobile number")]).optional() })).mutation(async ({ ctx, input }) => {
    const db = await getRequiredDb();
    await db.update(users).set({ name: input.name, mobile: input.mobile || null }).where(eq(users.id, ctx.user.id));
    return { success: true };
  }),
  admin: router({
    listAccounts: adminProcedure.query(async () => {
      const db = await getRequiredDb();
      return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).limit(100);
    }),
  }),
  signUp: publicProcedure.input(credentialsSchema.extend({ name: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
    const db = await getRequiredDb();
    const email = normalizeEmail(input.email);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "An account already exists for this email" });
    const passwordHash = await hashPassword(input.password);
    const result = await db.insert(users).values({
      openId: createLocalOpenId(),
      name: input.name,
      email,
      passwordHash,
      loginMethod: "email",
      lastSignedIn: new Date(),
    });
    const userId = Number(result[0]?.insertId ?? 0);
    if (!userId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Account creation failed" });
    await setLocalSession(ctx.req, ctx.res, userId);
    return { success: true };
  }),
  signIn: publicProcedure.input(credentialsSchema).mutation(async ({ ctx, input }) => {
    const db = await getRequiredDb();
    const email = normalizeEmail(input.email);
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = result[0];
    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) invalidCredentials();
    await db.update(users).set({ lastSignedIn: new Date(), loginMethod: "email" }).where(eq(users.id, user.id));
    await setLocalSession(ctx.req, ctx.res, user.id);
    return { success: true };
  }),
  signOut: publicProcedure.mutation(({ ctx }) => {
    clearLocalSession(ctx.req, ctx.res);
    return { success: true };
  }),
  requestPasswordReset: publicProcedure.input(z.object({ email: z.string().trim().email().max(320) })).mutation(async ({ ctx, input }) => {
    const db = await getRequiredDb();
    const user = (await db.select().from(users).where(eq(users.email, normalizeEmail(input.email))).limit(1))[0];
    if (!user) return { success: true };
    const { rawToken, expiresAt } = createResetToken();
    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash: hashResetToken(rawToken), expiresAt });
    const resetUrl = `${getPublicBaseUrl(ctx.req)}/auth?mode=reset&token=${encodeURIComponent(rawToken)}`;
    try {
      await sendPasswordResetEmail({ recipient: user.email!, recipientName: user.name, resetUrl });
    } catch (error) {
      console.error("[LocalAuth] Password-reset email could not be delivered", error);
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Password-reset email delivery is currently unavailable" });
    }
    return { success: true };
  }),
  resetPassword: publicProcedure.input(z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128) })).mutation(async ({ input }) => {
    const db = await getRequiredDb();
    const tokenHash = hashResetToken(input.token);
    const reset = (await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1))[0];
    if (!reset) throw new TRPCError({ code: "BAD_REQUEST", message: "Reset link is invalid or expired" });
    await db.update(users).set({ passwordHash: await hashPassword(input.password), loginMethod: "email" }).where(eq(users.id, reset.userId));
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, reset.id));
    return { success: true };
  }),
});

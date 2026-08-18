import { describe, expect, it } from "vitest";
import { isMailerConfigured, verifyMailerConnection } from "./mailer";

describe("SMTP credentials", () => {
  it.skipIf(process.env.SMTP_VERIFY_TEST !== "1" || !isMailerConfigured())("connects and authenticates without sending email", async () => {
    await expect(verifyMailerConnection()).resolves.toBeUndefined();
  }, 20_000);
});

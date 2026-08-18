import { describe, expect, it } from "vitest";
import { hashPassword, normalizeEmail, verifyPassword } from "./localAuth";

describe("local email authentication helpers", () => {
  it("normalizes email addresses consistently", () => {
    expect(normalizeEmail("  User.Name@Example.COM ")).toBe("user.name@example.com");
  });

  it("hashes passwords with a unique salt and verifies correct passwords", async () => {
    const firstHash = await hashPassword("A-secure-password-123");
    const secondHash = await hashPassword("A-secure-password-123");

    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword("A-secure-password-123", firstHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", firstHash)).resolves.toBe(false);
  });

  it("rejects a malformed stored password representation", async () => {
    await expect(verifyPassword("A-secure-password-123", "malformed")).resolves.toBe(false);
  });
});

import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyMetaWebhookSignature } from "./webhook-signature";

const SECRET = process.env.META_APP_SECRET!;

function signedHeader(body: string, secret: string = SECRET): string {
  const hex = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hex}`;
}

describe("verifyMetaWebhookSignature", () => {
  it("accepts a request signed with the correct secret", () => {
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    expect(verifyMetaWebhookSignature(body, signedHeader(body))).toBe(true);
  });

  it("rejects a signature computed with a different secret", () => {
    const body = "{}";
    expect(verifyMetaWebhookSignature(body, signedHeader(body, "wrong"))).toBe(
      false,
    );
  });

  it("rejects when the body has been tampered with after signing", () => {
    const original = '{"entry":[]}';
    const header = signedHeader(original);
    const tampered = '{"entry":[{"id":"injected"}]}';
    expect(verifyMetaWebhookSignature(tampered, header)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifyMetaWebhookSignature("anything", null)).toBe(false);
  });

  it("rejects a header without the sha256= prefix", () => {
    const body = "{}";
    const hex = crypto
      .createHmac("sha256", SECRET)
      .update(body)
      .digest("hex");
    expect(verifyMetaWebhookSignature(body, hex)).toBe(false);
    expect(verifyMetaWebhookSignature(body, `sha512=${hex}`)).toBe(false);
  });

  it("rejects a header of the wrong length without throwing", () => {
    // timingSafeEqual would throw on length mismatch — the guard inside
    // the verifier should catch this and return false instead.
    expect(verifyMetaWebhookSignature("{}", "sha256=tooshort")).toBe(false);
  });

  describe("multi-secret support", () => {
    const originalSecret = process.env.META_APP_SECRET;
    const SECRET_A = "secret_app_a_12345678901234567890";
    const SECRET_B = "secret_app_b_09876543210987654321";

    beforeEach(() => {
      process.env.META_APP_SECRET = `${SECRET_A}, ${SECRET_B}`;
    });
    afterEach(() => {
      process.env.META_APP_SECRET = originalSecret;
    });

    it("accepts a request signed with the first secret", () => {
      const body = JSON.stringify({ event: "from_app_a" });
      expect(verifyMetaWebhookSignature(body, signedHeader(body, SECRET_A))).toBe(true);
    });

    it("accepts a request signed with the second secret", () => {
      const body = JSON.stringify({ event: "from_app_b" });
      expect(verifyMetaWebhookSignature(body, signedHeader(body, SECRET_B))).toBe(true);
    });

    it("rejects a request signed with an unknown secret", () => {
      const body = JSON.stringify({ event: "from_unknown" });
      expect(verifyMetaWebhookSignature(body, signedHeader(body, "unknown_secret"))).toBe(false);
    });
  });

  describe("fail-closed when secret is missing", () => {
    const originalSecret = process.env.META_APP_SECRET;
    beforeEach(() => {
      delete process.env.META_APP_SECRET;
    });
    afterEach(() => {
      process.env.META_APP_SECRET = originalSecret;
    });

    it("rejects even a correctly-formed signature when no secret is configured", () => {
      const body = "{}";
      // Use the original secret to produce the header so we can verify
      // the rejection is solely due to missing config.
      const header = signedHeader(body, originalSecret!);
      expect(verifyMetaWebhookSignature(body, header)).toBe(false);
    });
  });
});

import { normalizeMsisdn, normalizePhoneNumber } from "@/utils/phone";

describe("phone utilities", () => {
  describe("normalizePhoneNumber", () => {
    it("removes formatting but preserves leading plus", () => {
      expect(normalizePhoneNumber("+260 97-123 4567")).toBe("+260971234567");
    });

    it("returns digits only when plus is missing", () => {
      expect(normalizePhoneNumber("097 123 4567")).toBe("0971234567");
    });

    it("returns null for empty values", () => {
      expect(normalizePhoneNumber("")).toBeNull();
      expect(normalizePhoneNumber(null)).toBeNull();
      expect(normalizePhoneNumber(undefined)).toBeNull();
    });
  });

  describe("normalizeMsisdn", () => {
    it("normalizes phone numbers to E.164 format", () => {
      expect(normalizeMsisdn(" +260 97 123 4567 ")).toBe("+260971234567");
      expect(normalizeMsisdn("260971234567")).toBe("+260971234567");
    });

    it("returns null when length is outside allowed range", () => {
      expect(normalizeMsisdn("1234")).toBeNull();
      expect(normalizeMsisdn("+12345678901234567890")).toBeNull();
    });
  });
});

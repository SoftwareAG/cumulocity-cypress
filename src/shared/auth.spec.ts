/// <reference types="jest" />

import { isAuthOptions } from "./auth";

describe("auth", () => {
  describe("isAuthOptions", function () {
    it("isAuthOptions validates undefined", function () {
      expect(isAuthOptions(undefined)).toBe(false);
      expect(isAuthOptions(null)).toBe(false);
    });

    it("isAuthOptions validates object with user and password", function () {
      expect(
        isAuthOptions({ user: "test", password: "test", userAlias: "admin" })
      ).toBe(true);
      expect(
        isAuthOptions({ user: "test", password: "test", type: "CookieAuth" })
      ).toBe(true);
      expect(isAuthOptions({ user: "test", type: "CookieAuth" })).toBe(true);
    });

    it("isAuthOptions does not validate string", function () {
      expect(isAuthOptions("test")).toBe(false);
    });

    it("isAuthOptions does not validate object without user", function () {
      expect(isAuthOptions({ password: "test" })).toBe(false);
    });

    it("isAuthOptions does not validate object without type or userAlias", function () {
      expect(isAuthOptions({ user: "test" })).toBe(false);
    });
  });
});

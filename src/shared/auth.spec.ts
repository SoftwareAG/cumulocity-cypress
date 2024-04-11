/// <reference types="jest" />

import { isAuthOptions, isPactAuthObject, toPactAuthObject } from "./auth";

describe("auth", () => {
  describe("isAuthOptions", function () {
    it("isAuthOptions fails for undefined", function () {
      expect(isAuthOptions(undefined)).toBe(false);
      expect(isAuthOptions(null)).toBe(false);
    });

    it("isAuthOptions fails for string", function () {
      expect(isAuthOptions("test")).toBe(false);
    });

    it("isAuthOptions fails empty object", function () {
      expect(isAuthOptions({})).toBe(false);
    });

    it("isAuthOptions validates object with user and password", function () {
      expect(isAuthOptions({ user: "test", password: "test" })).toBe(true);
      expect(
        isAuthOptions({ user: "test", password: "test", userAlias: "admin" })
      ).toBe(true);
      expect(
        isAuthOptions({ user: "test", password: "test", type: "CookieAuth" })
      ).toBe(true);
    });

    it("isAuthOptions fails without user and as password", function () {
      expect(isAuthOptions({ user: "test" })).toBe(false);
      expect(isAuthOptions({ user: "test", type: "CookieAuth" })).toBe(false);
      expect(isAuthOptions({ password: "test}" })).toBe(false);
    });

    it("isAuthOptions does not validate object without user", function () {
      expect(isAuthOptions({ password: "test" })).toBe(false);
    });
  });

  describe("isPactAuthObject", function () {
    it("isPactAuthObject fails for undefined", function () {
      expect(isPactAuthObject(undefined)).toBe(false);
      expect(isPactAuthObject(null)).toBe(false);
    });

    it("isPactAuthObject fails for string", function () {
      expect(isPactAuthObject("test")).toBe(false);
    });

    it("isPactAuthObject fails empty object", function () {
      expect(isPactAuthObject({})).toBe(false);
    });

    it("isPactAuthObject validates object with user", function () {
      expect(isPactAuthObject({ user: "test" })).toBe(false);
      expect(isPactAuthObject({ user: "test", userAlias: "admin" })).toBe(true);
      expect(isPactAuthObject({ user: "test", type: "CookieAuth" })).toBe(true);
      expect(
        isPactAuthObject({
          user: "test",
          type: "CookieAuth",
          userAlias: "admin",
        })
      ).toBe(true);
      expect(
        isPactAuthObject({
          user: "test",
          type: "CookieAuth",
          userAlias: "admin",
          password: "test",
        })
      ).toBe(false);
      expect(
        isPactAuthObject({
          user: "test",
          userAlias: "admin",
          password: "test",
        })
      ).toBe(false);
    });

    it("isPactAuthObject fails without user", function () {
      expect(isPactAuthObject({})).toBe(false);
      expect(isPactAuthObject({ userAlias: "admin" })).toBe(false);
    });
  });

  describe("toPactAuthObject", function () {
    it("toPactAuthObject returns object with user, type and userAlias", function () {
      expect(
        toPactAuthObject({ user: "test", password: "test", tenant: "test" })
      ).toEqual({
        user: "test",
      });
      expect(
        toPactAuthObject({
          user: "test",
          password: "test",
          tenant: "test",
          type: "CookieAuth",
          userAlias: "admin",
        })
      ).toEqual({
        user: "test",
        type: "CookieAuth",
        userAlias: "admin",
      });
    });
  });
});

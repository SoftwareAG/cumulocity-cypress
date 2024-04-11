/// <reference types="jest" />

import { isURL, relativeURL, removeBaseUrlFromString } from "./url";

describe("url", () => {
  it("isUrl", () => {
    expect(isURL(new URL("http://example.com"))).toBeTruthy();
    expect(isURL("http://example.com")).toBeFalsy();
    expect(isURL("")).toBeFalsy();
    expect(isURL(null)).toBeFalsy();
    expect(isURL(undefined)).toBeFalsy();
  });

  it("relativeURL", () => {
    expect(relativeURL(new URL("http://example.com"))).toBe("/");
    expect(relativeURL("http://example.com/my/path")).toBe("/my/path");
    expect(relativeURL("http://example.com/my/path?x=y")).toBe("/my/path?x=y");
    expect(relativeURL("http://example.com/my/path?x")).toBe("/my/path?x");
    expect(relativeURL("")).toBeFalsy();
  });

  it("removeBaseUrlFromString", () => {
    const _r = removeBaseUrlFromString;
    expect(_r("http://example.com/my/path", "http://example.com")).toBe(
      "/my/path"
    );
    expect(_r("http://example.com/my/path", "http://example.com////")).toBe(
      "/my/path"
    );
    expect(_r("http://example.com", "http://example.com")).toBe("/");
    expect(_r("http://example.com/my/path", undefined)).toBe(
      "http://example.com/my/path"
    );
    expect(_r("http://example.com/my/path", "http://example.com/my/path")).toBe(
      "/"
    );
  });
});

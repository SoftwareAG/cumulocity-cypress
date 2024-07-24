/// <reference types="jest" />

import {
  getMinSatisfyingVersion,
  getMinSatisfyingVersions,
  getMinimizedVersionString,
  getRangesSatisfyingVersion,
  isVersionSatisfyingRequirements,
  toSemverVersion,
} from "./versioning";

import * as semver from "semver";

function p(v: string) {
  return semver.parse(v);
}

describe("versioning", () => {
  describe("isVersionSatisfyingRequirements", function () {
    it("should return true for undefined version", function () {
      const v1 = isVersionSatisfyingRequirements(undefined, undefined);
      expect(v1).toBe(true);
    });

    it("should return true for undefined requires", function () {
      const v1 = isVersionSatisfyingRequirements("1.2.3", undefined);
      expect(v1).toBe(true);
    });

    it("should return true for version with empty requires", function () {
      const v1 = isVersionSatisfyingRequirements("1.2.3", []);
      expect(v1).toBe(true);
    });

    it("should return true for undefined version with empty requires", function () {
      const v1 = isVersionSatisfyingRequirements(undefined, []);
      expect(v1).toBe(true);
    });

    it("should return false undefined for version with requires", function () {
      const v1 = isVersionSatisfyingRequirements(undefined, ["1.2.3"]);
      expect(v1).toBe(false);
    });

    it("should return true for version matching requires", function () {
      const v1 = isVersionSatisfyingRequirements("1.2.3", ["1.2.3"]);
      expect(v1).toBe(true);
      const v2 = isVersionSatisfyingRequirements("1.2.3", ["^1.2.2"]);
      expect(v2).toBe(true);
      const v3 = isVersionSatisfyingRequirements("1.2.3", ["1.2.x"]);
      expect(v3).toBe(true);
    });

    it("should return true for version matching one of multiple requires", function () {
      const v1 = isVersionSatisfyingRequirements("1.2.3", [
        ">=2.2.4",
        "1.2.3",
        "1.2.x",
      ]);
      expect(v1).toBe(true);
      const v2 = isVersionSatisfyingRequirements("1.2.3", ["1.2.4", "1.2.x"]);
      expect(v2).toBe(true);
    });

    it("should return false for version not matching requires", function () {
      const v1 = isVersionSatisfyingRequirements("1.2.3", ["1.2.4"]);
      expect(v1).toBe(false);
    });

    it("should return false for version not matching any of multiple requires", function () {
      const v1 = isVersionSatisfyingRequirements("1.2.3", [
        "1.2.4",
        "1.3.x",
        "2",
      ]);
      expect(v1).toBe(false);
    });

    it("should return true if requires includes null", function () {
      const v1 = isVersionSatisfyingRequirements(undefined, [null]);
      expect(v1).toBe(true);
      const v2 = isVersionSatisfyingRequirements("1.2.3", [null]);
      expect(v2).toBe(true);
      const v3 = isVersionSatisfyingRequirements(undefined, ["1.2.4", null]);
      expect(v3).toBe(true);
    });
  });

  describe("getRequiredMinVersions", function () {
    it("should return empty object required input is undefined", function () {
      const versions = getMinSatisfyingVersions(
        undefined as any,
        undefined as any
      );
      expect(versions).toStrictEqual([]);
    });

    it("should return empty object required input is empty object", function () {
      const v1 = getMinSatisfyingVersions({} as any, {} as any);
      expect(v1).toStrictEqual([]);
      const v2 = getMinSatisfyingVersions("1.2.3", {} as any);
      expect(v2).toStrictEqual([]);
    });

    it("should work with empty ranges", function () {
      const v1 = getMinSatisfyingVersions("", []);
      expect(v1).toStrictEqual([]);
      const v2 = getMinSatisfyingVersions("1.2.3", []);
      expect(v2).toStrictEqual([p("1.2.3")]);
      // should coerce non-semver versions
      const v3 = getMinSatisfyingVersions("1", []);
      expect(v3).toStrictEqual([p("1.0.0")]);
    });

    it("should work with single range", function () {
      const v1 = getMinSatisfyingVersions("1.2.3", ["1.2.3"]);
      expect(v1).toStrictEqual([p("1.2.3")]);
      const v2 = getMinSatisfyingVersions("1.2.3", ["1.2.4"]);
      expect(v2).toStrictEqual([]);
      const v3 = getMinSatisfyingVersions("1.2.3", ["^1.2.2"]);
      expect(v3).toStrictEqual([p("1.2.2")]);
      const v4 = getMinSatisfyingVersions("1.2.3", ["1.2.x"]);
      expect(v4).toStrictEqual([p("1.2.0")]);
    });

    it("should work with multiple ranges", function () {
      const v1 = getMinSatisfyingVersions("1.2.3", ["^2.0.0", "1.2.x"]);
      expect(v1).toStrictEqual([p("1.2.0")]);
      const v2 = getMinSatisfyingVersions("1.2.3", ["^2.0.0", "1.2.x"]);
      expect(v2).toStrictEqual([p("1.2.0")]);
      const v3 = getMinSatisfyingVersions("1.2.3", ["^1.0.1", "1.2.x"]);
      expect(v3).toStrictEqual([p("1.0.1"), p("1.2.0")]);
    });

    it("should sort multiple ranges", function () {
      const v4 = getMinSatisfyingVersions("1.2.3", [
        "1.2.x",
        "^1.0.1",
        "1.x.x",
      ]);
      expect(v4).toStrictEqual([p("1.0.0"), p("1.0.1"), p("1.2.0")]);
    });

    // it("should return unique versions", function () {
    //   const v1 = getMinSatisfyingVersions("1.2.3", ["1.2.x", "1.2.x"]);
    //   expect(v1).toBe([p("1.2.0")]);
    // });

    it("should support ranges with major version only", function () {
      const v1 = getMinSatisfyingVersions("1.2.3", ["1"]);
      expect(v1).toStrictEqual([p("1.0.0")]);
      const v2 = getMinSatisfyingVersions("1.2.3", ["2"]);
      expect(v2).toStrictEqual([]);
    });
  });

  describe("getMinVersion", function () {
    it("should return undefined if for invalid input", function () {
      const v1 = getMinSatisfyingVersion(undefined as any, ["1.2.3"]);
      expect(v1).toBe(undefined);
      const v2 = getMinSatisfyingVersion("1.2.3", undefined as any);
      expect(v2).toBe(undefined);
    });

    it("should return min version from multiple ranges", function () {
      const v4 = getMinSatisfyingVersion("1.2.3", ["1.2.x", "^1.0.1", "1.x.x"]);
      expect(v4).toStrictEqual(p("1.0.0"));
    });
  });

  describe("getRangesSatisfyingVersion", function () {
    it("should return empty array for invalid input", function () {
      const v1 = getRangesSatisfyingVersion(undefined as any, ["1.2.3"]);
      expect(v1).toStrictEqual([]);
      const v2 = getRangesSatisfyingVersion("1.2.3", undefined as any);
      expect(v2).toStrictEqual([]);
    });

    it("should return empty array if no ranges satisfy version", function () {
      const v1 = getRangesSatisfyingVersion("1.2.3", ["1.2.4"]);
      expect(v1).toStrictEqual([]);
    });

    it("should return ranges that satisfy version", function () {
      const v1 = getRangesSatisfyingVersion("1.2.3", ["1.2.3"]);
      expect(v1).toStrictEqual(["1.2.3"]);
      const v2 = getRangesSatisfyingVersion("1.2.3", ["^1.2.2"]);
      expect(v2).toStrictEqual(["^1.2.2"]);
      const v3 = getRangesSatisfyingVersion("1.2.3", ["1.2.x"]);
      expect(v3).toStrictEqual(["1.2.x"]);
      const v4 = getRangesSatisfyingVersion("1.2.3", [
        "1.2.x",
        "^1.0.1",
        "1.x.x",
      ]);
      expect(v4).toStrictEqual(["1.2.x", "^1.0.1", "1.x.x"]);
      const v5 = getRangesSatisfyingVersion("1.2.3", [
        "1.2.x",
        "^2.0.0",
        "1.3.x",
      ]);
      expect(v5).toStrictEqual(["1.2.x"]);
    });

    it("should support ranges with major version only", function () {
      const v1 = getRangesSatisfyingVersion("1.2.3", ["1"]);
      expect(v1).toStrictEqual(["1"]);
      const v2 = getRangesSatisfyingVersion("1.2.3", ["2"]);
      expect(v2).toStrictEqual([]);
    });

    it("should support ranges with major and minor version only", function () {
      const v1 = getRangesSatisfyingVersion("1.2.3", ["1.2"]);
      expect(v1).toStrictEqual(["1.2"]);
      const v2 = getRangesSatisfyingVersion("1.2.3", ["1.3"]);
      expect(v2).toStrictEqual([]);
    });
  });

  describe("getMinimizedVersionString", function () {
    it("should return undefined for invalid input", function () {
      const v1 = getMinimizedVersionString(undefined as any);
      expect(v1).toBe(undefined);
      const v2 = getMinimizedVersionString("1.2ss.3a");
      expect(v2).toBe(undefined);
      const v3 = getMinimizedVersionString({} as any);
      expect(v3).toBe(undefined);
      const v4 = getMinimizedVersionString({ major: "1" } as any);
      expect(v4).toBe(undefined);
    });

    it("should return minimized version string", function () {
      const v1 = getMinimizedVersionString("1.2.3");
      expect(v1).toBe("1.2.3");
      const v2 = getMinimizedVersionString("1.2.0");
      expect(v2).toBe("1.2");
      const v3 = getMinimizedVersionString("1.0.0");
      expect(v3).toBe("1");
    });
  });

  describe("toSemverVersion", function () {
    it("should return undefined", function () {
      const v1 = toSemverVersion(undefined as any);
      expect(v1).toBe(undefined);
      const v2 = toSemverVersion({} as any);
      expect(v2).toBe(undefined);
    });

    it("should return coerced semver version", function () {
      const v1 = toSemverVersion("1.2.3");
      expect(v1).toBe("1.2.3");
      const v2 = toSemverVersion("1.2");
      expect(v2).toBe("1.2.0");
      const v3 = toSemverVersion("1");
      expect(v3).toBe("1.0.0");
    });

    it("should return coerced semver version for number", function () {
      const v1 = toSemverVersion(1 as any);
      expect(v1).toBe("1.0.0");
    });
  });
});

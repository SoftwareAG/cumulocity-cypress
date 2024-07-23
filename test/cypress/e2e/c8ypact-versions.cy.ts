import {
  getMinSatisfyingVersion,
  getMinSatisfyingVersions,
  getMinimizedVersionString,
  getRangesSatisfyingVersion,
  getSystemVersion,
} from "cumulocity-cypress";
import { stubEnv } from "cypress/support/testutils";

const { _, semver } = Cypress;

function p(v: string) {
  return semver.parse(v);
}

// required as the tested methods are protected / private
describe("c8ypact versions", function () {
  context("isSystemVersionSatisfyingCurrentTestRequirements", function () {
    before(() => {
      Cypress.env("C8Y_SYSTEM_VERSION", "1.2.3");
      Cypress.env("C8Y_PACT_IGNORE_VERSION_SKIP", "1");
    });

    after(() => {
      Cypress.env("C8Y_SYSTEM_VERSION", undefined);
    });

    it(
      "should return true if version is satisfied",
      { c8ypact: { requires: ["1.2"] } },
      function () {
        expect(
          Cypress.c8ypact.isSystemVersionSatisfyingCurrentTestRequirements()
        ).to.be.true;
      }
    );

    it(
      "should return true if version is satisfied with multiple ranges",
      { c8ypact: { requires: ["2.3.4", "1"] } },
      function () {
        expect(
          Cypress.c8ypact.isSystemVersionSatisfyingCurrentTestRequirements()
        ).to.be.true;
      }
    );

    it(
      "should return false if version is not satisfied",
      { c8ypact: { requires: ["1.3"] } },
      function () {
        expect(
          Cypress.c8ypact.isSystemVersionSatisfyingCurrentTestRequirements()
        ).to.be.false;
      }
    );

    it(
      "should return true if no version is required",
      { c8ypact: {} },
      function () {
        expect(
          Cypress.c8ypact.isSystemVersionSatisfyingCurrentTestRequirements()
        ).to.be.true;
      }
    );

    it(
      "should return false if no system version is set",
      { c8ypact: { requires: ["1.3"] } },
      function () {
        stubEnv({ C8Y_SYSTEM_VERSION: undefined });
        expect(
          Cypress.c8ypact.isSystemVersionSatisfyingCurrentTestRequirements()
        ).to.be.false;
      }
    );

    it(
      "should return true if no system version is set and null is defined in required versions",
      { c8ypact: { requires: ["1.3", null] } },
      function () {
        stubEnv({ C8Y_SYSTEM_VERSION: undefined });
        expect(
          Cypress.c8ypact.isSystemVersionSatisfyingCurrentTestRequirements()
        ).to.be.true;
      }
    );
  });

  context("getCurrentTestId", function () {
    beforeEach(() => {
      stubEnv({ C8Y_SYSTEM_VERSION: "1.2.3" });
    });

    it(
      "should add min version to pact id",
      { c8ypact: { requires: ["1.2"] } },
      function () {
        expect(Cypress.c8ypact.getCurrentTestId()).to.eq(
          "1_2__c8ypact_versions__getCurrentTestId__should_add_min_version_to_pact_id"
        );
      }
    );

    it(
      "should add min version to pact id using c8ypact id",
      { c8ypact: { requires: ["1.2"], id: "my_pact" } },
      function () {
        expect(Cypress.c8ypact.getCurrentTestId()).to.eq("1_2__my_pact");
      }
    );
  });

  context("getRequiredMinVersions", function () {
    it("should return empty object required input is undefined", function () {
      const versions = getMinSatisfyingVersions(
        undefined as any,
        undefined as any
      );
      expect(versions).to.deep.eq([]);
    });

    it("should return empty object required input is empty object", function () {
      const v1 = getMinSatisfyingVersions({} as any, {} as any);
      expect(v1).to.deep.eq([]);
      const v2 = getMinSatisfyingVersions("1.2.3", {} as any);
      expect(v2).to.deep.eq([]);
    });

    it("should work with empty ranges", function () {
      const v1 = getMinSatisfyingVersions("", []);
      expect(v1).to.deep.eq([]);
      const v2 = getMinSatisfyingVersions("1.2.3", []);
      expect(v2).to.deep.eq([p("1.2.3")]);
      // should coerce non-semver versions
      const v3 = getMinSatisfyingVersions("1", []);
      expect(v3).to.deep.eq([p("1.0.0")]);
    });

    it("should work with single range", function () {
      const v1 = getMinSatisfyingVersions("1.2.3", ["1.2.3"]);
      expect(v1).to.deep.eq([p("1.2.3")]);
      const v2 = getMinSatisfyingVersions("1.2.3", ["1.2.4"]);
      expect(v2).to.deep.eq([]);
      const v3 = getMinSatisfyingVersions("1.2.3", ["^1.2.2"]);
      expect(v3).to.deep.eq([p("1.2.2")]);
      const v4 = getMinSatisfyingVersions("1.2.3", ["1.2.x"]);
      expect(v4).to.deep.eq([p("1.2.0")]);
    });

    it("should work with multiple ranges", function () {
      const v1 = getMinSatisfyingVersions("1.2.3", ["^2.0.0", "1.2.x"]);
      expect(v1).to.deep.eq([p("1.2.0")]);
      const v2 = getMinSatisfyingVersions("1.2.3", ["^2.0.0", "1.2.x"]);
      expect(v2).to.deep.eq([p("1.2.0")]);
      const v3 = getMinSatisfyingVersions("1.2.3", ["^1.0.1", "1.2.x"]);
      expect(v3).to.deep.eq([p("1.0.1"), p("1.2.0")]);
    });

    it("should sort multiple ranges", function () {
      const v4 = getMinSatisfyingVersions("1.2.3", [
        "1.2.x",
        "^1.0.1",
        "1.x.x",
      ]);
      expect(v4).to.deep.eq([p("1.0.0"), p("1.0.1"), p("1.2.0")]);
    });

    // it("should return unique versions", function () {
    //   const v1 = getMinSatisfyingVersions("1.2.3", ["1.2.x", "1.2.x"]);
    //   expect(v1).to.deep.eq([p("1.2.0")]);
    // });

    it("should support ranges with major version only", function () {
      const v1 = getMinSatisfyingVersions("1.2.3", ["1"]);
      expect(v1).to.deep.eq([p("1.0.0")]);
      const v2 = getMinSatisfyingVersions("1.2.3", ["2"]);
      expect(v2).to.deep.eq([]);
    });
  });

  context("getMinVersion", function () {
    it("should return undefined if for invalid input", function () {
      const v1 = getMinSatisfyingVersion(undefined as any, ["1.2.3"]);
      expect(v1).to.be.undefined;
      const v2 = getMinSatisfyingVersion("1.2.3", undefined as any);
      expect(v2).to.be.undefined;
    });

    it("should return min version from multiple ranges", function () {
      const v4 = getMinSatisfyingVersion("1.2.3", ["1.2.x", "^1.0.1", "1.x.x"]);
      expect(v4).to.deep.eq(p("1.0.0"));
    });
  });

  context("getRangesSatisfyingVersion", function () {
    it("should return empty array for invalid input", function () {
      const v1 = getRangesSatisfyingVersion(undefined as any, ["1.2.3"]);
      expect(v1).to.deep.eq([]);
      const v2 = getRangesSatisfyingVersion("1.2.3", undefined as any);
      expect(v2).to.deep.eq([]);
    });

    it("should return empty array if no ranges satisfy version", function () {
      const v1 = getRangesSatisfyingVersion("1.2.3", ["1.2.4"]);
      expect(v1).to.deep.eq([]);
    });

    it("should return ranges that satisfy version", function () {
      const v1 = getRangesSatisfyingVersion("1.2.3", ["1.2.3"]);
      expect(v1).to.deep.eq(["1.2.3"]);
      const v2 = getRangesSatisfyingVersion("1.2.3", ["^1.2.2"]);
      expect(v2).to.deep.eq(["^1.2.2"]);
      const v3 = getRangesSatisfyingVersion("1.2.3", ["1.2.x"]);
      expect(v3).to.deep.eq(["1.2.x"]);
      const v4 = getRangesSatisfyingVersion("1.2.3", [
        "1.2.x",
        "^1.0.1",
        "1.x.x",
      ]);
      expect(v4).to.deep.eq(["1.2.x", "^1.0.1", "1.x.x"]);
      const v5 = getRangesSatisfyingVersion("1.2.3", [
        "1.2.x",
        "^2.0.0",
        "1.3.x",
      ]);
      expect(v5).to.deep.eq(["1.2.x"]);
    });

    it("should support ranges with major version only", function () {
      const v1 = getRangesSatisfyingVersion("1.2.3", ["1"]);
      expect(v1).to.deep.eq(["1"]);
      const v2 = getRangesSatisfyingVersion("1.2.3", ["2"]);
      expect(v2).to.deep.eq([]);
    });

    it("should support ranges with major and minor version only", function () {
      const v1 = getRangesSatisfyingVersion("1.2.3", ["1.2"]);
      expect(v1).to.deep.eq(["1.2"]);
      const v2 = getRangesSatisfyingVersion("1.2.3", ["1.3"]);
      expect(v2).to.deep.eq([]);
    });
  });

  context("getSystemVersion", function () {
    it("should return undefined if no version is set", function () {
      stubEnv({ C8Y_SYSTEM_VERSION: undefined, C8Y_VERSION: undefined });
      const v1 = getSystemVersion();
      expect(v1).to.be.undefined;
    });
    it("should return C8Y_SYSTEM_VERSION if set", function () {
      stubEnv({ C8Y_SYSTEM_VERSION: "1.2.3", C8Y_VERSION: undefined });
      const v1 = getSystemVersion();
      expect(v1).to.eq("1.2.3");
    });

    it("should return C8Y_VERSION if set", function () {
      stubEnv({ C8Y_SYSTEM_VERSION: undefined, C8Y_VERSION: "1.2.3" });
      const v1 = getSystemVersion();
      expect(v1).to.deep.eq("1.2.3");
    });

    it("should prefer C8Y_SYSTEM_VERSION over C8Y_VERSION", function () {
      stubEnv({ C8Y_SYSTEM_VERSION: "1.2.3", C8Y_VERSION: "1.2.4" });
      const v1 = getSystemVersion();
      expect(v1).to.deep.eq("1.2.3");
    });

    it("should coerce non-semver versions", function () {
      stubEnv({ C8Y_SYSTEM_VERSION: "1", C8Y_VERSION: undefined });
      const v1 = getSystemVersion();
      expect(v1).to.deep.eq("1.0.0");
    });
  });

  context("getMinimizedVersionString", function () {
    it("should return undefined for invalid input", function () {
      const v1 = getMinimizedVersionString(undefined as any);
      expect(v1).to.be.undefined;
      const v2 = getMinimizedVersionString("1.2ss.3a");
      expect(v2).to.be.undefined;
      const v3 = getMinimizedVersionString({} as any);
      expect(v3).to.be.undefined;
      const v4 = getMinimizedVersionString({ major: "1" } as any);
      expect(v4).to.be.undefined;
    });

    it("should return minimized version string", function () {
      const v1 = getMinimizedVersionString("1.2.3");
      expect(v1).to.eq("1.2.3");
      const v2 = getMinimizedVersionString("1.2.0");
      expect(v2).to.eq("1.2");
      const v3 = getMinimizedVersionString("1.0.0");
      expect(v3).to.eq("1");
    });
  });
});

import { isSystemVersionSatisfyingCurrentTestRequirements } from "cumulocity-cypress/lib/commands/requires";
import { stubEnv } from "cypress/support/testutils";

const { _, semver } = Cypress;

function p(v: string) {
  return semver.parse(v);
}

// required as the tested methods are protected / private
describe("c8ypact versions", function () {
  before(() => {
    // do not skip tests with unsatisfied version requirements
    Cypress.env("C8Y_PACT_IGNORE_VERSION_SKIP", "1");
  });

  context("semver", function () {
    it("should register Cypress.semver", function () {
      expect(Cypress.semver).to.not.be.undefined;
    });
  });

  context("isSystemVersionSatisfyingCurrentTestRequirements", function () {
    before(() => {
      Cypress.env("C8Y_SYSTEM_VERSION", "1.2.3");
    });

    after(() => {
      Cypress.env("C8Y_SYSTEM_VERSION", undefined);
    });

    it(
      "should return true if version is satisfied",
      { requires: ["1.2"] },
      function () {
        expect(isSystemVersionSatisfyingCurrentTestRequirements()).to.be.true;
      }
    );

    it(
      "should return true if version is satisfied with multiple ranges",
      { requires: ["2.3.4", "1"] },
      function () {
        expect(isSystemVersionSatisfyingCurrentTestRequirements()).to.be.true;
      }
    );

    it(
      "should return false if version is not satisfied",
      { requires: ["1.3"] },
      function () {
        expect(isSystemVersionSatisfyingCurrentTestRequirements()).to.be.false;
      }
    );

    it(
      "should return true if no version is required",
      { requires: [] },
      function () {
        expect(isSystemVersionSatisfyingCurrentTestRequirements()).to.be.true;
      }
    );

    it(
      "should return false if no system version is set",
      { requires: ["1.3"] },
      function () {
        stubEnv({ C8Y_SYSTEM_VERSION: undefined });
        expect(isSystemVersionSatisfyingCurrentTestRequirements()).to.be.false;
      }
    );

    it(
      "should return true if no system version is set and null is defined in required versions",
      { requires: ["1.3", null] },
      function () {
        stubEnv({ C8Y_SYSTEM_VERSION: undefined });
        expect(isSystemVersionSatisfyingCurrentTestRequirements()).to.be.true;
      }
    );
  });
});

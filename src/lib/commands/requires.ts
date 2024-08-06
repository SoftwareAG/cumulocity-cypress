import {
  C8yRequireConfigOption,
  isVersionSatisfyingRequirements,
} from "cumulocity-cypress";

import * as semver from "semver";
import { getSystemVersionFromEnv } from "../utils";

interface C8yRequire {
  /**
   * System versions required to run the test. System version is taken from C8Y_SYSTEM_VERSION
   * or C8Y_VERSION environment variables. If the system version is not satisfying the requirements,
   * the test is skipped. Required versions are defined in semver format and can be any semver range as
   * for example `1.2.3`, `^1.2.3`, `1.2.x`, `>=1 <=2.3.4`, etc.
   *
   * Tests are skipped if a version requirement is added and system version is not defined. To also run
   * the test when no system version is defined, add `null` to the list of required versions.
   *
   * Use `C8Y_PACT_IGNORE_VERSION_SKIP` environment variable to disable skipping tests for unsatisfied
   * version requirements.
   */
  requires?: C8yRequireConfigOption;
}

declare global {
  namespace Cypress {
    interface Cypress extends C8yRequire {
      semver: typeof semver;
    }

    // use interface C8yRequire so doc is used and to avoid duplication

    interface SuiteConfigOverrides extends C8yRequire {}

    interface TestConfigOverrides extends C8yRequire {}

    interface RuntimeConfigOptions extends C8yRequire {}
  }
}

if (Cypress.semver == null) {
  Cypress.semver = semver;
}

beforeEach(function () {
  if (
    Cypress.env("C8Y_PACT_IGNORE_VERSION_SKIP") == null &&
    isSystemVersionSatisfyingCurrentTestRequirements() === false
  ) {
    this.skip();
  }
});

/**
 * Checks if `C8Y_SYSTEM_VERSION` or `C8Y_VERSION` satisfy the requirements of the current test.
 * @returns `true` if the system version satisfies the requirements of the current test, `false` otherwise.
 */
export function isSystemVersionSatisfyingCurrentTestRequirements(): boolean {
  return isVersionSatisfyingRequirements(
    getSystemVersionFromEnv(),
    Cypress.config().requires
  );
}

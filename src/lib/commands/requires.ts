import {
  isVersionSatisfyingRequirements,
  toSemverVersion,
} from "cumulocity-cypress";

import * as semver from "semver";

type C8yRequireConfigOption = (string | null)[];

declare global {
  namespace Cypress {
    interface Cypress {
      semver: typeof semver;
    }

    interface SuiteConfigOverrides {
      requires?: C8yRequireConfigOption;
    }

    interface TestConfigOverrides {
      requires?: C8yRequireConfigOption;
    }

    interface RuntimeConfigOptions {
      requires?: C8yRequireConfigOption;
    }
  }
}

if (Cypress.semver == null) {
  Cypress.semver = semver;
}

beforeEach(function () {
  if (isSystemVersionSatisfyingCurrentTestRequirements() === false) {
    this.skip();
  }
});

export function isSystemVersionSatisfyingCurrentTestRequirements(): boolean {
  return isVersionSatisfyingRequirements(
    toSemverVersion(
      Cypress.env("C8Y_SYSTEM_VERSION") || Cypress.env("C8Y_VERSION")
    ),
    Cypress.config().requires
  );
}

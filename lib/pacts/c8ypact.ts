import { Client } from "@c8y/client";
import { C8yDefaultPactMatcher } from "./matcher";
import { C8yPactDefaultPreprocessor } from "./preprocessor";
import { C8yDefaultPactRunner } from "./runner";
const { _ } = Cypress;

declare global {
  namespace Cypress {
    interface Cypress {
      c8ypact: C8yPact;
    }

    interface SuiteConfigOverrides {
      c8ypact?: C8yPactConfigOptions;
    }

    interface TestConfigOverrides {
      c8ypact?: C8yPactConfigOptions;
    }

    interface RuntimeConfigOptions {
      c8ypact?: C8yPactConfigOptions;
    }
  }

  interface C8yPactConfigOptions {
    id?: string;
    log?: boolean;
    matcher?: C8yPactMatcher;
    producer?: string;
    consumer?: string;
    tags?: string[];
    description?: string;
    ignore?: boolean;
  }

  interface C8yPact {
    matcher: C8yPactMatcher;
    preprocessor: C8yPactPreprocessor;
    currentPactIdentifier: () => string;
    currentPactFilename: () => string;
    currentNextPact: <T = any>() => Cypress.Chainable<{
      pact: Cypress.Response<T>;
      info: any;
    } | null>;
    currentPacts: () => Cypress.Chainable<Cypress.Response<any>[] | null>;
    currentMatcher: () => C8yPactMatcher;
    savePact: (response: Cypress.Response<any>) => void;
    isEnabled: () => boolean;
    isRecordingEnabled: () => boolean;
    failOnMissingPacts: boolean;
    strictMatching: boolean;
    pactRunner: C8yPactRunner;
    debugLog: boolean;
  }
}

Cypress.c8ypact = {
  currentPactIdentifier: pactIdentifier,
  currentMatcher,
  currentPacts,
  currentPactFilename,
  currentNextPact: getNextPact,
  isRecordingEnabled,
  savePact,
  isEnabled,
  matcher: new C8yDefaultPactMatcher(),
  preprocessor: new C8yPactDefaultPreprocessor(),
  pactRunner: new C8yDefaultPactRunner(),
  failOnMissingPacts: true,
  strictMatching: true,
  debugLog: false,
};

function debugLogger(): Cypress.Loggable {
  return { log: Cypress.c8ypact.debugLog };
}

before(() => {
  const pacter = Cypress.c8ypact;
  if (!pacter.isRecordingEnabled()) {
    cy.task("c8ypact:load", Cypress.config().fixturesFolder, debugLogger());
  }
});

beforeEach(() => {
  if (Cypress.c8ypact.isRecordingEnabled()) {
    cy.task(
      "c8ypact:remove",
      Cypress.c8ypact.currentPactIdentifier(),
      debugLogger()
    );
  }
});

function pactIdentifier(): string {
  let key = Cypress.currentTest?.titlePath?.join("__");
  if (key == null) {
    key = Cypress.spec?.relative?.split("/").slice(-2).join("__");
  }
  const pact = Cypress.config().c8ypact;
  return (pact && pact.id) || key.replace(/ /g, "_");
}

function currentMatcher(): C8yPactMatcher {
  const pact = Cypress.config().c8ypact;
  return (pact && pact.matcher) || Cypress.c8ypact.matcher;
}

function isEnabled(): boolean {
  return Cypress.env("C8Y_PACT_ENABLED") != null;
}

function isRecordingEnabled(): boolean {
  return isEnabled() && Cypress.env("C8Y_PACT_MODE") === "recording";
}

function savePact(response: Cypress.Response<any>, client?: Client) {
  if (!isEnabled()) return;

  const pact = Cypress.c8ypact.currentPactIdentifier();
  if (!pact) return;

  const info = {
    title: Cypress.currentTest?.titlePath || [],
    id: pact,
    preprocessor: {
      obfuscate: Cypress.env("C8Y_PACT_OBFUSCATE") || [],
      ignore: Cypress.env("C8Y_PACT_IGNORE") || [],
      obfuscationPattern:
        Cypress.c8ypact.preprocessor.defaultObfuscationPattern,
    },
    consumer: Cypress.config().c8ypact?.consumer,
    producer: Cypress.config().c8ypact?.producer,
    description: Cypress.config().c8ypact?.description,
    tags: Cypress.config().c8ypact?.tags,
    tenant: client.core.tenant || Cypress.env("C8Y_TENANT"),
    baseUrl: Cypress.config().baseUrl,
    version: Cypress.env("C8Y_VERSION") && {
      system: Cypress.env("C8Y_VERSION"),
    },
  };

  const folder = Cypress.config().fixturesFolder;
  const preprocessedResponse = _.cloneDeep(response);
  Cypress.c8ypact.preprocessor.preprocess(preprocessedResponse);

  cy.task(
    "c8ypact:save",
    {
      pact,
      response: preprocessedResponse,
      folder,
      info,
    },
    debugLogger()
  );
}

function currentPacts(): Cypress.Chainable<Cypress.Response<any>[] | null> {
  return !isEnabled()
    ? cy.wrap<Cypress.Response<any>[] | null>(null, debugLogger())
    : cy.task<Cypress.Response<any>[]>(
        "c8ypact:get",
        Cypress.c8ypact.currentPactIdentifier(),
        debugLogger()
      );
}

function currentPactFilename(): string {
  const pactId = Cypress.c8ypact.currentPactIdentifier();
  return `${Cypress.config().fixturesFolder}/c8ypact/${pactId}.json`;
}

function getNextPact(): Cypress.Chainable<{
  pact: Cypress.Response<any>;
  info: any;
} | null> {
  return !isEnabled()
    ? cy.wrap<{
        pact: Cypress.Response<any>;
        info: any;
      } | null>(null)
    : cy.task(
        "c8ypact:next",
        Cypress.c8ypact.currentPactIdentifier(),
        debugLogger()
      );
}

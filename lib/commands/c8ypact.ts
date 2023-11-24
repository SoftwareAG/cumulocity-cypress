import { Client } from "@c8y/client";
import { C8yDefaultPactMatcher } from "../pacts/matcher";
import { C8yPactDefaultPreprocessor } from "../pacts/preprocessor";
import { C8yDefaultPactRunner } from "../pacts/runner";
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
    currentNextPact: <
      T = any
    >() => Cypress.Chainable<Cypress.Response<T> | null>;
    currentPacts: () => Cypress.Chainable<Cypress.Response<any>[] | null>;
    currentMatcher: () => C8yPactMatcher;
    savePact: (response: Cypress.Response<any>) => void;
    isEnabled: () => boolean;
    isRecordingEnabled: () => boolean;
    isRunnerEnabled: () => boolean;
    failOnMissingPacts: boolean;
    strictMatching: boolean;
    pactRunner: C8yPactRunner;
  }
}

Cypress.c8ypact = {
  currentPactIdentifier: pactIdentifier,
  currentMatcher,
  currentPacts,
  currentPactFilename,
  currentNextPact: getNextPact,
  isRecordingEnabled,
  isRunnerEnabled,
  savePact,
  isEnabled,
  matcher: new C8yDefaultPactMatcher(),
  preprocessor: new C8yPactDefaultPreprocessor(),
  pactRunner: new C8yDefaultPactRunner(),
  failOnMissingPacts: true,
  strictMatching: true,
};

const logTasks = false;

before(() => {
  const pacter = Cypress.c8ypact;
  if (!pacter.isRecordingEnabled() && !pacter.isRunnerEnabled()) {
    cy.task("c8ypact:load", Cypress.config().fixturesFolder, { log: logTasks });
  }
});

beforeEach(() => {
  if (Cypress.c8ypact.isEnabled() && Cypress.c8ypact.isRecordingEnabled()) {
    cy.task("c8ypact:remove", Cypress.c8ypact.currentPactIdentifier(), {
      log: logTasks,
    });
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

function isRunnerEnabled(): boolean {
  return isEnabled() && Cypress.env("C8Y_PACT_MODE") === "runner";
}

function savePact(response: Cypress.Response<any>, client?: Client) {
  if (!isEnabled()) {
    return;
  }
  const pact = Cypress.c8ypact.currentPactIdentifier();
  if (pact) {
    const info = {
      title: Cypress.currentTest?.titlePath || [],
      id: pact,
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
      { log: logTasks }
    );
  }
}

function currentPacts(): Cypress.Chainable<Cypress.Response<any>[] | null> {
  return !isEnabled()
    ? cy.wrap<Cypress.Response<any>[] | null>(null, { log: false })
    : cy.task<Cypress.Response<any>[]>(
        "c8ypact:get",
        Cypress.c8ypact.currentPactIdentifier(),
        {
          log: logTasks,
        }
      );
}

function currentPactFilename(): string {
  const pactId = Cypress.c8ypact.currentPactIdentifier();
  return `${Cypress.config().fixturesFolder}/c8ypact/${pactId}.json`;
}

function getNextPact(): Cypress.Chainable<Cypress.Response<any> | null> {
  return !isEnabled()
    ? cy.wrap<Cypress.Response<any> | null>(null)
    : cy.task("c8ypact:next", Cypress.c8ypact.currentPactIdentifier(), {
        log: logTasks,
      });
}

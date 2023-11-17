import { C8yDefaultPactMatcher } from "../pacts/matcher";
import { C8yPactDefaultPreprocessor } from "../pacts/preprocessor";

declare global {
  namespace Cypress {
    interface Cypress {
      c8ypact: C8yPact;
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
    ignore?: boolean;
    log?: boolean;
    matcher?: C8yPactMatcher;
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
    failOnMissingPacts: boolean;
    strictMatching: boolean;
  }

  interface C8yPactMatcher {
    match: (
      obj1: unknown,
      obj2: unknown,
      loggerProps?: { [key: string]: any }
    ) => boolean;
  }

  interface C8yPactPreprocessor {
    preprocess: (obj1: unknown) => void;
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
  failOnMissingPacts: false,
  strictMatching: true,
};

before(() => {
  if (Cypress.c8ypact.isEnabled() && !Cypress.c8ypact.isRecordingEnabled()) {
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

const logTasks = true;

function pactIdentifier(): string {
  let key = Cypress.currentTest?.titlePath?.join("--");
  if (key == null) {
    key = Cypress.spec?.relative?.split("/").slice(-2).join("--");
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

function savePact(response: Cypress.Response<any>) {
  if (!isEnabled()) {
    return;
  }
  const pact = Cypress.c8ypact.currentPactIdentifier();
  if (pact) {
    const folder = Cypress.config().fixturesFolder;
    Cypress.c8ypact.preprocessor.preprocess(response);
    cy.task(
      "c8ypact:save",
      {
        pact,
        response,
        folder,
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

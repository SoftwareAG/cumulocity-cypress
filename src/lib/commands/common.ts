import { FetchClient } from "@c8y/client";
import { C8yPact } from "../../shared/c8ypact";
import { C8yAuthOptions, getC8yClientAuthentication } from "../../shared/auth";

declare global {
  interface ChainableWithState {
    state(state: string): any;
    state(state: string, value: any): void;
  }

  namespace Cypress {
    interface Cypress {
      errorMessages: any;
    }
    interface LogConfig {
      renderProps(): ObjectLike;
    }
  }
}

if (!Cypress.c8ypact) {
  Cypress.c8ypact = {
    current: null,
    getCurrentTestId: () => "-",
    isRecordingEnabled: () => false,
    savePact: () => new Promise((resolve) => resolve()),
    isEnabled: () => false,
    matcher: undefined,
    pactRunner: undefined,
    schemaGenerator: undefined,
    schemaMatcher: undefined,
    debugLog: false,
    preprocessor: undefined,
    config: {},
    getConfigValue: () => undefined,
    getConfigValues: () => ({}),
    loadCurrent: () => cy.wrap<C8yPact | null>(null, { log: false }),
    env: () => ({}),
    createFetchClient: (auth: C8yAuthOptions, baseUrl: string) =>
      new FetchClient(getC8yClientAuthentication(auth), baseUrl),
  };
}

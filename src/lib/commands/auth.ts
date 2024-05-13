import { getAuthOptions, resetClient } from "../utils";
import {
  C8yAuthOptions,
  C8yAuthentication,
  isAuthOptions,
} from "../../shared/auth";

export { C8yAuthOptions, C8yAuthentication, isAuthOptions };

declare global {
  namespace Cypress {
    interface Chainable extends ChainableWithState {
      /**
       * Get `C8yAuthOptions` from arguments or environment variables.
       *
       * @example
       * cy.getAuth("admin", "password").login();
       */
      getAuth(): Chainable<C8yAuthOptions>;
      getAuth(user: string): Chainable<C8yAuthOptions>;
      getAuth(user: string, password: string): Chainable<C8yAuthOptions>;
      getAuth(auth: C8yAuthOptions): Chainable<C8yAuthOptions>;

      /**
       * Use `C8yAuthOptions` for all commands of this library requiring authentication
       * within the current test context (it).
       *
       * @example
       * cy.useAuth("admin", "password");
       * cy.login();
       * cy.createUser(...);
       */
      useAuth(): Chainable<C8yAuthOptions>;
      useAuth(user: string): Chainable<C8yAuthOptions>;
      useAuth(user: string, password: string): Chainable<C8yAuthOptions>;
      useAuth(auth: C8yAuthOptions): Chainable<C8yAuthOptions>;
    }

    interface SuiteConfigOverrides {
      auth?: C8yAuthConfig;
    }

    interface TestConfigOverrides {
      auth?: C8yAuthConfig;
    }

    interface RuntimeConfigOptions {
      auth?: C8yAuthConfig;
    }
  }

  type C8yAuthConfig = string | C8yAuthOptions;

  type C8yAuthArgs =
    | [user: string]
    | [user: string, password: string]
    | [authOptions: C8yAuthOptions];
}

Cypress.Commands.add("getAuth", { prevSubject: "optional" }, (...args) => {
  const auth = getAuthOptions(...args);
  const consoleProps = {
    auth,
    arguments: args,
  };
  Cypress.log({
    name: "getAuth",
    message: `${auth ? auth.user : ""}`,
    consoleProps: () => consoleProps,
  });

  if (!auth) {
    throw new Error(
      `No valid C8yAuthOptions found for ${JSON.stringify(args)}.`
    );
  }

  return cy.wrap<C8yAuthOptions>(auth, { log: false });
});

Cypress.Commands.add("useAuth", { prevSubject: "optional" }, (...args) => {
  const auth = getAuthOptions(...args);
  const consoleProps = {
    auth,
    arguments: args,
  };
  Cypress.log({
    name: "useAuth",
    message: `${auth ? auth.user : ""}`,
    consoleProps: () => consoleProps,
  });
  if (auth) {
    const win: Cypress.AUTWindow = cy.state("window");
    win.localStorage.setItem("__auth", JSON.stringify(auth));
  } else {
    throw new Error(
      `No valid C8yAuthOptions found for ${JSON.stringify(args)}.`
    );
  }
  resetClient();

  return cy.wrap<C8yAuthOptions>(auth, { log: false });
});

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
      getAuth(): Chainable<C8yAuthOptions | undefined>;
      getAuth(user: string): Chainable<C8yAuthOptions | undefined>;
      getAuth(
        user: string,
        password: string
      ): Chainable<C8yAuthOptions | undefined>;
      getAuth(auth: C8yAuthOptions): Chainable<C8yAuthOptions | undefined>;

      /**
       * Use `C8yAuthOptions` for all commands of this library requiring authentication
       * within the current test context (it).
       *
       * @example
       * cy.useAuth("admin", "password");
       * cy.login();
       * cy.createUser(...);
       */
      useAuth(): Chainable<C8yAuthOptions | undefined>;
      useAuth(user: string): Chainable<C8yAuthOptions | undefined>;
      useAuth(
        user: string,
        password: string
      ): Chainable<C8yAuthOptions | undefined>;
      useAuth(auth: C8yAuthOptions): Chainable<C8yAuthOptions | undefined>;
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

const authEnvVariables = () => {
  const env = Cypress.env();
  const filteredKeysAndValues: any = {};
  Object.keys(env).forEach((key) => {
    if (
      key.endsWith("_username") ||
      key.endsWith("_password") ||
      key === "C8Y_USERNAME" ||
      key === "C8Y_PASSWORD"
    ) {
      filteredKeysAndValues[key] = env[key];
    }
  });
  return filteredKeysAndValues;
};

Cypress.Commands.add("getAuth", { prevSubject: "optional" }, (...args) => {
  const auth = getAuthOptions(...args);
  const consoleProps = {
    auth: auth || null,
    arguments: args || null,
    env: authEnvVariables() || null,
  };

  Cypress.log({
    name: "getAuth",
    message: `${auth ? auth.user : ""}`,
    consoleProps: () => consoleProps,
  });

  return cy.wrap<C8yAuthOptions | undefined>(auth, { log: false });
});

Cypress.Commands.add("useAuth", { prevSubject: "optional" }, (...args) => {
  const auth = getAuthOptions(...args);
  const consoleProps = {
    auth: auth || null,
    arguments: args || null,
    env: authEnvVariables() || null,
  };
  Cypress.log({
    name: "useAuth",
    message: `${auth ? auth.user : ""}`,
    consoleProps: () => consoleProps,
  });
  if (auth) {
    const win: Cypress.AUTWindow = cy.state("window");
    win.localStorage.setItem("__auth", JSON.stringify(auth));
  }
  resetClient();

  return cy.wrap<C8yAuthOptions | undefined>(auth, { log: false });
});

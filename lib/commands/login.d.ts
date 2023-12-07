import { ICredentials } from "@c8y/client";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login to Cumulocity.
       *
       * Uses env variables `C8Y_USERNAME` and `C8Y_PASSWORD` if no arguments or no
       * password is passed. The logged in user will be stored in `C8Y_LOGGED_IN_USER`.
       *
       * Default values for login options:
       * ```
       * {
       *   disableGainsight: true,
       *   hideCookieBanner: true,
       *   useSession: true, // for Cypress 11+
       *   validationFn: () => {
       *     cy.getCookie('XSRF-TOKEN').should('exist');
       *     cy.getCookie('authorization').should('exist');
       *   }
       * }
       * ```
       *
       * @param {string} user - the user to login to Cumulocity
       * @param {string} password - the password to login to Cumulocity
       * @param {C8yLoginOptions} options - login options to use for login to Cumulocity
       */
      login(...args: LoginAuthArgs): Chainable<C8yAuthOptions>;

      /**
       * Get `C8yAuthOptions` from arguments or environment variables.
       *
       * @example
       * cy.getAuth("admin", "password").login();
       */
      getAuth(...args: LoginAuthArgs): Chainable<C8yAuthOptions>;

      /**
       * Use `C8yAuthOptions` for all commands of this library requiring authentication
       * within the current test context (it).
       *
       * @example
       * cy.useAuth("admin", "password");
       * cy.login();
       * cy.createUser(...);
       */
      useAuth(...args: LoginAuthArgs): Chainable<C8yAuthOptions>;
    }

    interface SuiteConfigOverrides {
      auth?: C8yAuthArgs;
    }

    interface TestConfigOverrides {
      auth?: C8yAuthArgs;
    }

    interface RuntimeConfigOptions {
      auth?: C8yAuthArgs;
    }
  }

  interface C8yAuthOptions extends ICredentials {
    // support cy.request properties
    sendImmediately?: boolean;
    bearer?: (() => string) | string;
    userAlias?: string;
    type?: string;
  }

  export type C8yAuthArgs = string | C8yAuthOptions;

  export type C8yLoginOptions = {
    useSession?: boolean;
    disableGainsight?: boolean;
    hideCookieBanner?: boolean;
    validationFn?: () => boolean;
  };

  type LoginAuthArgs =
    | [options?: C8yLoginOptions]
    | [user: string, options?: C8yLoginOptions]
    | [user: string, password: string, options?: C8yLoginOptions]
    | [authOptions: C8yAuthOptions, options?: C8yLoginOptions];
}

const { _ } = Cypress;
const semver = require("semver");
import { ICredentials } from "@c8y/client";
const { getAuthOptions, isAuth, resetClient } = require("./utils");

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

export const defaultLoginOptions = () => {
  return {
    disableGainsight: Cypress.env("C8Y_DISABLE_GAINSIGHT") ?? true,
    hideCookieBanner: Cypress.env("C8Y_HIDE_COOKIEBANNER") ?? true,
    useSession: semver.gte(Cypress.version, "12.0.0"),

    validationFn: () => {
      cy.getCookie("XSRF-TOKEN").should("exist");
      cy.getCookie("authorization").should("exist");
    },
  } as C8yLoginOptions;
};

Cypress.Commands.add("login", { prevSubject: "optional" }, function (...args) {
  const auth: C8yAuthOptions = getAuthOptions(...args);
  expect(auth).to.not.be.undefined;

  const consoleProps: any = {};
  Cypress.log({
    name: "login",
    message: auth,
    consoleProps: () => consoleProps,
  });
  (Cypress.isCy(auth) ? auth : cy.wrap(auth, { log: false })).then(
    (auth: C8yAuthOptions) => {
      let options: C8yLoginOptions = args.pop();
      if (!options || !_.isObjectLike(options)) {
        options = {};
      }

      if (_.isObjectLike(options)) {
        if (isAuth(options)) {
          options = defaultLoginOptions();
        } else {
          options = _.defaults(options, defaultLoginOptions());
        }
      }

      consoleProps.auth = auth;
      consoleProps.options = options;

      const loginRequest = (tenant: string) => {
        cy.request({
          method: "POST",
          url: `/tenant/oauth?tenant_id=${tenant}`,
          body: {
            grant_type: "PASSWORD",
            username: auth.user,
            password: auth.password,
            tfa_code: undefined,
          },
          form: true,
        }).then((resp) => {
          expect(resp).to.have.property("headers");
          if (options.disableGainsight === true) {
            cy.disableGainsight();
          }
          if (options.hideCookieBanner === true) {
            cy.hideCookieBanner();
          }
        });
      };

      const tenant: string = auth.tenant || Cypress.env("C8Y_TENANT");
      consoleProps.tenant = tenant;

      if (options.useSession === true) {
        cy.session(
          auth.user,
          () => {
            loginRequest(tenant);
          },
          {
            validate() {
              options.validationFn();
              Cypress.env("C8Y_LOGGED_IN_USER", auth.user);
              Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", auth.userAlias);
            },
            cacheAcrossSpecs: true,
          }
        );
      } else {
        loginRequest(tenant);
        options.validationFn();
        Cypress.env("C8Y_LOGGED_IN_USER", auth.user);
        Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", auth.userAlias);
      }

      resetClient();
    }
  );
  cy.wrap(auth, { log: false });
});

Cypress.Commands.add(
  "getAuth",
  // @ts-ignore
  { prevSubject: "optional" },
  function (...args) {
    const auth: C8yAuthOptions = getAuthOptions(...args);
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

    return Cypress.isCy(auth) ? auth : cy.wrap(auth, { log: false });
  }
);

Cypress.Commands.add(
  "useAuth",
  // @ts-ignore
  { prevSubject: "optional" },
  function (...args) {
    const auth: C8yAuthOptions = getAuthOptions(...args);
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
      // @ts-ignore
      const win: Cypress.AUTWindow = cy.state("window");
      win.localStorage.setItem("__auth", JSON.stringify(auth));
    } else {
      throw new Error(
        `No valid C8yAuthOptions found for ${JSON.stringify(args)}.`
      );
    }
    resetClient();

    return Cypress.isCy(auth) ? auth : cy.wrap(auth, { log: false });
  }
);
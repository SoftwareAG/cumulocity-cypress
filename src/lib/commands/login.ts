import { getAuthOptions, isAuth, resetClient } from "../utils";
import { C8yAuthOptions } from "./auth";

const { _ } = Cypress;
import semver from "semver";

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
      login(options?: C8yLoginOptions): Chainable<C8yAuthOptions>;
      login(user: string, options?: C8yLoginOptions): Chainable<C8yAuthOptions>;
      login(
        user: string,
        password: string,
        options?: C8yLoginOptions
      ): Chainable<C8yAuthOptions>;
      login(
        auth: C8yAuthOptions,
        options?: C8yLoginOptions
      ): Chainable<C8yAuthOptions>;
    }
  }

  type C8yLoginOptions = {
    useSession?: boolean;
    disableGainsight?: boolean;
    hideCookieBanner?: boolean;
    validationFn?: () => boolean;
  };

  type C8yLoginAuthArgs =
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

Cypress.Commands.add("login", { prevSubject: "optional" }, (...args) => {
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
      let options: C8yLoginOptions = {};
      const lastArg: any = args.pop();
      if (isAuth(lastArg) || !_.isObjectLike(lastArg)) {
        options = defaultLoginOptions();
      } else {
        options = _.defaults(lastArg, defaultLoginOptions());
      }

      consoleProps.auth = auth;
      consoleProps.options = options;

      const loginRequest = (tenant: string) => {
        return cy
          .request({
            method: "POST",
            url: `/tenant/oauth?tenant_id=${tenant}`,
            body: {
              grant_type: "PASSWORD",
              username: auth.user,
              password: auth.password,
              tfa_code: auth.tfa,
            },
            form: true,
          })
          .then((resp) => {
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
        loginRequest(tenant).then(() => {
          options.validationFn();
          Cypress.env("C8Y_LOGGED_IN_USER", auth.user);
          Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", auth.userAlias);
        });
      }

      resetClient();
    }
  );
  cy.wrap(auth, { log: false });
});

import { C8yAuthOptions } from "./auth";

const { _ } = Cypress;
const { getAuthOptions, getBaseUrlFromEnv } = require("./../utils");

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login to Cumulocity using OAuth Internal. Returns `C8yAuthOptions` object containing
       * required login information including xsrf and authorization tokens. The user and password
       * will be read from environment and can be passed from cy.getAuth(). The authorization and
       * x-xsrf-token cookies will be set in the browser.
       *
       * Obtaining an OAI-Secure access token via /tenant/oauth/token endpoint is currently
       * not supported.
       *
       * @example
       * cy.getAuth("admin", "password").oauthLogin();
       * cy.oauthLogin("admin", "password");
       */
      oauthLogin(): Chainable<C8yAuthOptions>;
      oauthLogin(auth: C8yAuthOptions): Chainable<C8yAuthOptions>;
      oauthLogin(user: string, password: string): Chainable<C8yAuthOptions>;
      oauthLogin(userAlias: string): Chainable<C8yAuthOptions>;
    }
  }
}

Cypress.Commands.add(
  "oauthLogin",
  // @ts-ignore
  { prevSubject: "optional" },
  function (...args: C8yLoginAuthArgs) {
    const auth: C8yAuthOptions = getAuthOptions(...args);
    if (!auth) {
      const error = new Error(
        "C8yAuthOptions missing. cy.oauthLogin requires C8yAuthOptions."
      );
      error.name = "C8yPactError";
      throw error;
    }

    const consoleProps: any = {};
    const logger = Cypress.log({
      autoEnd: false,
      name: "oauthLogin",
      message: auth.userAlias || auth.user || "-",
      consoleProps: () => consoleProps,
    });

    const baseUrl = getBaseUrlFromEnv();
    cy.task<C8yAuthOptions>(
      "c8ypact:oauthLogin",
      { auth, baseUrl },
      { log: Cypress.c8ypact.debugLog }
    ).then((a) => {
      consoleProps.auth = a;

      Cypress.env("C8Y_LOGGED_IN_USER", auth.user);
      Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", auth.userAlias);

      if (a.bearer && typeof a.bearer === "string") {
        cy.setCookie("Authorization", a.bearer, {
          log: Cypress.c8ypact.debugLog,
        });
      }
      if (a.xsrfToken) {
        // must be upper case so CookieAuth does use it
        cy.setCookie("XSRF-TOKEN", a.xsrfToken, {
          log: Cypress.c8ypact.debugLog,
        });
      }
      logger.end();
    });
  }
);

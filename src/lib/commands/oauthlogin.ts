import { C8yAuthOptions, getAuthCookies, oauthLogin } from "./auth";

const { _ } = Cypress;
const { getAuthOptions, getBaseUrlFromEnv } = require("./../utils");

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login to Cumulocity using OAuth Internal. Returns `C8yAuthOptions` object containing
       * required login information including xsrf and authorization tokens. The user and password
       * will be read from environment and can be passed from cy.getAuth().
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
    expect(auth).to.not.be.undefined;

    const consoleProps: any = {};
    Cypress.log({
      name: "oauthLogin",
      message: auth,
      consoleProps: () => consoleProps,
    });

    return cy.wrap(oauthLogin(auth), { log: false }).then((auth) => {
      return auth;
    });
  }
);

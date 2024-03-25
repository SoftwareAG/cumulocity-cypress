import { C8yAuthOptions } from "./auth";

const { _ } = Cypress;
const { getAuthOptions } = require("./../utils");
var setCookieParser = require("set-cookie-parser");
const { getBaseUrlFromEnv } = require("../utils");

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

    if (Cypress.testingType === "component" && !getBaseUrlFromEnv()) {
      const error = new Error(
        "Base URL not set. Use C8Y_BASEURL env variable for component testing."
      );
      error.name = "C8yPactError";
      throw error;
    }

    const tenant: string = auth.tenant || Cypress.env("C8Y_TENANT");
    if (!tenant) {
      const error = new Error(
        "Tenant not set. Use C8Y_TENANT env variable or pass it as part of auth object."
      );
      error.name = "C8yPactError";
      throw error;
    }

    consoleProps.auth = auth;
    consoleProps.tenant = tenant;

    return (Cypress.isCy(auth) ? auth : cy.wrap(auth, { log: false })).then(
      (auth: C8yAuthOptions) => {
        cy.request({
          method: "POST",
          url: `${getBaseUrlFromEnv() || ""}/tenant/oauth?tenant_id=${tenant}`,
          body: {
            grant_type: "PASSWORD",
            username: auth.user,
            password: auth.password,
            tfa_code: undefined,
          },
          form: true,
        }).then((response) => {
          let setCookie = response.headers.getSetCookie;
          let cookieHeader: string[];
          if (_.isFunction(response.headers.getSetCookie)) {
            cookieHeader = (response.headers.getSetCookie as () => string[])();
          } else if (_.isString(setCookie)) {
            cookieHeader = [setCookie];
          } else if (_.isArray(setCookie)) {
            cookieHeader = setCookie;
          } else {
            cookieHeader = response.headers["set-cookie"] as string[];
          }

          setCookieParser(cookieHeader || []).forEach((c: any) => {
            cy.setCookie(c.name, c.value);
            if (_.isEqual(c.name.toLowerCase(), "authorization")) {
              auth.bearer = c.value;
            }
            if (_.isEqual(c.name.toLowerCase(), "xsrf-token")) {
              auth.xsrfToken = c.value;
            }
          });

          Cypress.env("C8Y_LOGGED_IN_USER", auth.user);
          Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", auth.userAlias);

          return cy.wrap(auth, { log: false });
        });
      }
    );
  }
);

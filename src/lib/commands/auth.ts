import { FetchClient, ICredentials } from "@c8y/client";
var setCookieParser = require("set-cookie-parser");

const { _ } = Cypress;
const {
  getAuthOptions,
  resetClient,
  getBaseUrlFromEnv,
} = require("./../utils");

declare global {
  namespace Cypress {
    interface Chainable {
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

export interface C8yAuthOptions extends ICredentials {
  // support cy.request properties
  sendImmediately?: boolean;
  bearer?: (() => string) | string;
  userAlias?: string;
  type?: string;
  xsfrToken?: string;
}

Cypress.Commands.add(
  "getAuth",
  // @ts-ignore
  { prevSubject: "optional" },
  function (...args: C8yAuthArgs) {
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

    cy.oauthLogin;
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
  function (...args: C8yAuthArgs) {
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

export function getAuthCookies(response: Cypress.Response | Response): {
  authorization?: string;
  xsrfToken?: string;
} {
  let setCookie = response.headers.getSetCookie;
  let cookieHeader: string[];
  if (_.isFunction(response.headers.getSetCookie)) {
    cookieHeader = response.headers.getSetCookie();
  } else if (_.isString(setCookie)) {
    cookieHeader = [setCookie];
  } else if (_.isArray(setCookie)) {
    cookieHeader = setCookie;
  } else if (_.isPlainObject(response.headers)) {
    cookieHeader = _.get(response.headers, "set-cookie");
    if (!_.isArrayLike(cookieHeader)) {
      cookieHeader = undefined;
    }
  }
  if (!cookieHeader) {
    return undefined;
  }

  let authorization: string;
  let xsrfToken: string;
  setCookieParser(cookieHeader || []).forEach((c: any) => {
    if (_.isEqual(c.name.toLowerCase(), "authorization")) {
      authorization = c.value;
    }
    if (_.isEqual(c.name.toLowerCase(), "xsrf-token")) {
      xsrfToken = c.value;
    }
  });

  // This method is intended for use on server environments (for example Node.js).
  // Browsers block frontend JavaScript code from accessing the Set-Cookie header,
  // as required by the Fetch spec, which defines Set-Cookie as a forbidden
  // response-header name that must be filtered out from any response exposed to frontend code.
  // https://developer.mozilla.org/en-US/docs/Web/API/Headers/getSetCookie
  if (!authorization) {
    authorization =
      getCookieValue("authorization") || getCookieValue("Authorization");
    if (_.isEmpty(authorization)) {
      authorization = undefined;
    }
  }
  if (!xsrfToken) {
    xsrfToken = getCookieValue("XSRF-TOKEN") || getCookieValue("xsrf-token");
    if (_.isEmpty(xsrfToken)) {
      xsrfToken = undefined;
    }
  }

  return { authorization, xsrfToken };
}

export async function oauthLogin(
  auth: C8yAuthOptions
): Promise<C8yAuthOptions> {
  const baseUrl = getBaseUrlFromEnv();
  if (!baseUrl) {
    const error = new Error(
      "No base URL configured. Use C8Y_BASEURL env variable for component testing."
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

  const fetchClient = new FetchClient(baseUrl);
  let url = `/tenant/oauth?tenant_id=${tenant}`;
  const params = new URLSearchParams({
    grant_type: "PASSWORD",
    username: auth.user,
    password: auth.password,
    tfa_code: auth.tfa,
  });

  const res = await fetchClient.fetch(url, {
    method: "POST",
    body: params.toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
  });

  if (res.status !== 200) {
    const error = new Error(
      `Logging in to ${baseUrl} failed for user "${auth.user}" with status code ${res.status}.`
    );
    error.name = "C8yPactError";
    throw error;
  }

  const cookies = getAuthCookies(res);
  if (cookies.authorization) {
    auth.bearer = cookies.authorization;
  }
  if (cookies.xsrfToken) {
    auth.xsrfToken = cookies.xsrfToken;
  }

  return auth;
}

// from c8y/client FetchClient
export function getCookieValue(name: string) {
  const value = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return value ? value.pop() : "";
}

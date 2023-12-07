const { _ } = Cypress;

const {
  isAuth,
  getAuthOptionsFromBasicAuthHeader,
  normalizedArgumentsWithAuth,
  restoreClient,
  storeClient,
  tenantFromBasicAuth,
  throwError,
} = require("./utils");

import {
  BasicAuth,
  Client,
  CookieAuth,
  FetchClient,
  IAuthentication,
  IFetchOptions,
  IFetchResponse,
  IResult,
  IResultList,
} from "@c8y/client";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Create a c8y/client `Client` to interact with Cumulocity API. Yielded
       * results are `Cypress.Response` objects as returned by `cy.request`.
       *
       * `cy.c8yclient` supports c8y/client `BasicAuth` and `CookieAuth`. To use
       * any other auth method, such as `BearerAuth`, create a custom `Client` and
       * pass it in `options`.
       *
       * Note: If there is a `X-XSRF-TOKEN` cookie, `CookieAuth` will be used as
       * auth method and basic auth credentials will be ignored. To create the
       * cookie token, call `cy.login` before using `cy.c8yclient`. To force using
       * basic auth method, pass credentials via `cy.getAuth().c8yclient()` or use
       * `preferBasicAuth` option.
       *
       * `cy.c8yclient` supports chaining of requests. By chaining the response of
       * one request will be provided as second argument to the next request.
       *
       * Using the `options` argument it is possible to overwrite the default
       * behavior or configure `cy.c8yclient`.
       *
       * @example
       * cy.getAuth("admin")
       *   .c8yclient().then((c) => {
       *     Cypress.env("C8Y_TENANT", c.core.tenant);
       * });
       *
       * cy.c8yclient((c) => c.user.delete(newuser.username), {
       *   failOnStatusCode: false,
       * }).then((deleteResponse) => {
       *   expect(deleteResponse.status).to.be.oneOf([204, 404]);
       * });
       *
       * cy.c8yclient([
       *   (c) =>
       *     c.core.fetch(
       *       "/user/" + c.core.tenant + "/groupByName/" + permission
       *     ),
       *   (c, groupResponse) =>
       *     c.userGroup.addUserToGroup(groupResponse.body.id, userId),
       *   ]);
       * });
       *
       * cy.c8yclient((c) =>
       *   c.core.fetch("/user/" + c.core.tenant + "/groupByName/" + permission)
       * ).c8yclient((c, groupResponse) =>
       *   c.userGroup.addUserToGroup(groupResponse.body.id, userId),
       * );
       */
      c8yclient<T = any, R = any>(
        serviceFn: C8yClientServiceFn<R, T> | C8yClientServiceFn<R, any>[],
        options?: C8yClientOptions
      ): Chainable<Response<T>>;

      c8yclient<T = any, R = any>(
        serviceFn:
          | C8yClientServiceArrayFn<R, T>
          | C8yClientServiceArrayFn<R, any>[],
        options?: C8yClientOptions
      ): Chainable<Response<T>[]>;

      c8yclient<T = any, R = any>(
        serviceFn: C8yClientServiceListFn<R, T>,
        options?: C8yClientOptions
      ): Chainable<Response<T[]>>;

      c8yclient(): Chainable<Client>;

      /**
       * Convenience for cy.c8yclient with failOnStatus false. Use if the request is
       * expected to fail.
       *
       * @see c8yclient
       */
      c8yclientf<T = any, R = any>(
        serviceFn: C8yClientServiceFn<R, T> | C8yClientServiceFn<R, any>[],
        options?: C8yClientOptions
      ): Chainable<Response<T>>;

      c8yclientf<T = any, R = any>(
        serviceFn:
          | C8yClientServiceArrayFn<R, T>
          | C8yClientServiceArrayFn<R, any>[],
        options?: C8yClientOptions
      ): Chainable<Response<T>[]>;

      c8yclientf<T = any, R = any>(
        serviceFn: C8yClientServiceListFn<R, T>,
        options?: C8yClientOptions
      ): Chainable<Response<T[]>>;

      c8ymatch(
        response: any,
        pact: any,
        info?: any,
        options?: C8yClientOptions
      ): Cypress.Chainable<void>;
    }

    interface Response<T = any> {
      url?: string;
    }
  }

  type C8yClientIResult<T> = IResult<T> | IResult<null> | IFetchResponse;

  type C8yClientServiceFn<R, T> = (
    client: Client,
    previousResponse?: Cypress.Response<R>
  ) => Promise<C8yClientIResult<T>>;

  type C8yClientServiceArrayFn<R, T> = (
    client: Client,
    previousResponse?: Cypress.Response<R>
  ) => Promise<C8yClientIResult<T>>[];

  type C8yClientServiceListFn<R, T> = (
    client: Client,
    previousResponse?: Cypress.Response<R>
  ) => Promise<IResultList<T>>;

  type C8yClientFnArg =
    | C8yClientServiceFn<any, any>
    | C8yClientServiceArrayFn<any, any>[]
    | C8yClientServiceListFn<any, any>;

  type C8yClientOptions = Partial<C8yOptions> &
    // Partial<Timeoutable> &
    Partial<Cypress.Loggable> &
    Partial<Cypress.Timeoutable> &
    Partial<Pick<Cypress.Failable, "failOnStatusCode">>;

  interface C8yOptions {
    auth: IAuthentication;
    baseUrl: string;
    client: Client;
    pact: any;
    preferBasicAuth: boolean;
    skipClientAuthenication: boolean;
    failOnPactValidation: boolean;
    ignorePact: boolean;
  }

  type C8yAuthentication = IAuthentication & C8yAuthOptions;

  interface Window {
    fetchStub: typeof window.fetch;
  }

  interface Response {
    data?: string | any;
    method?: string;
    responseObj?: Partial<Cypress.Response>;
    requestBody?: string | any;
  }

  interface C8yClient {
    _auth?: C8yAuthentication;
    _options?: C8yClientOptions;
    _client: Client;
  }
}

const defaultOptions: C8yClientOptions = {
  log: true,
  timeout: Cypress.config().requestTimeout,
  failOnStatusCode: true,
  preferBasicAuth: false,
  skipClientAuthenication: false,
  ignorePact: false,
  failOnPactValidation: true,
};

let logOnce = true;

window.fetchStub = window.fetch;
window.fetch = async function (url, fetchOptions) {
  let responseObj: Partial<Cypress.Response> = {};

  if (logOnce === true) {
    Cypress.log({
      name: "c8yclient",
      message: "",
      consoleProps() {
        const props: any = {};
        const cookieAuth =
          (responseObj.requestHeaders &&
            responseObj.requestHeaders["X-XSRF-TOKEN"]) ||
          undefined;
        const basicAuth =
          (responseObj.requestHeaders &&
            responseObj.requestHeaders["Authorization"]) ||
          undefined;

        // props["Options"] = options;
        if (cookieAuth) {
          const loggedInUser = Cypress.env("C8Y_LOGGED_IN_USER");
          props["CookieAuth"] = `XSRF-TOKEN ${cookieAuth} ${
            loggedInUser ? "(" + loggedInUser + ")" : ""
          }`;
        }
        if (basicAuth) {
          const auth = getAuthOptionsFromBasicAuthHeader(basicAuth);
          if (auth && auth.user) {
            props["BasicAuth"] = `${basicAuth} (${auth.user})`;
          }
        }

        props["Options"] = fetchOptions;
        props["Request"] = {
          responseBody: responseObj.body,
          responseStatus: responseObj.status,
          requestHeaders: responseObj.requestHeaders,
          requestBody: fetchOptions.body || "",
          responseHeaders: responseObj.headers || [],
          requestURL: responseObj.url || url,
        };
        props["Yielded"] = responseObj;
        return props;
      },
      // @ts-ignore
      renderProps(): {
        message: string;
        indicator: "aborted" | "pending" | "successful" | "bad";
        status: string | number;
      } {
        function getIndicator() {
          if (!responseObj) return "pending";
          if (responseObj.isOkStatusCode) return "successful";
          return "bad";
        }

        function getStatus() {
          return (
            (responseObj && !_.isEmpty(responseObj) && responseObj.status) ||
            "---"
          );
        }

        return {
          message: `${
            fetchOptions.method || "GET"
          } ${getStatus()} ${getDisplayUrl(responseObj.url || "")}`,
          indicator: getIndicator(),
          status: getStatus(),
        };
      },
    });
  } else {
    logOnce = true;
  }

  let startTime: number = Date.now();
  const fetchPromise: Promise<Response> = window.fetchStub(url, fetchOptions);

  const createFetchResponse = async (response: Response) => {
    responseObj = await responseObject(
      url,
      response || {},
      fetchOptions,
      Date.now() - startTime
    );

    let rawBody: string;
    if (response.data) {
      responseObj.body = response.data;
      rawBody = _.isObject(responseObj.body)
        ? JSON.stringify(responseObj.body)
        : responseObj.body;
    } else if (response.body) {
      try {
        rawBody = await response.text();
        responseObj.body = JSON.parse(rawBody);
      } catch {
        responseObj.body = rawBody;
      }
    }

    // empty body ("") is not allowed, make sure to use undefined instead
    if (_.isEmpty(rawBody)) {
      rawBody = undefined;
    }

    // create a new window.Response for Client. this is required as the body
    // stream can not be read more than once. as we just read it, recreate the response
    // and resolve json() and text() promises using the values we read from the stream.
    const res = new window.Response(rawBody, _.cloneDeep(response));
    try {
      res.requestBody = _.isString(fetchOptions.body)
        ? JSON.parse(fetchOptions.body)
        : fetchOptions.body;
    } catch (error) {
      res.requestBody = fetchOptions.body;
    }
    // res.ok = response.ok,
    res.method = fetchOptions.method;

    // pass the responseObj as part of the window.Response object. this way we can access
    // in the Clients response and do not need to reprocess
    res.responseObj = responseObj;
    res.json = () => Promise.resolve(responseObj.body);
    res.text = () => Promise.resolve(rawBody);

    return res;
  };

  return fetchPromise
    .then(async (response) => {
      const res = await createFetchResponse(response);
      return Promise.resolve(res);
    })
    .catch(async (response) => {
      const res = await createFetchResponse(response);
      return Promise.reject(res);
    });
};

const c8yclientFn = (...args: any[]) => {
  const prevSubjectIsAuth = args && !_.isEmpty(args) && isAuth(args[0]);
  let prevSubject =
    args && !_.isEmpty(args) && !isAuth(args[0]) ? args[0] : undefined;
  let $args = normalizedArgumentsWithAuth(
    args && prevSubject ? args.slice(1) : args
  );

  let authOptions;
  let basicAuth, cookieAuth;

  if (!isAuth($args[0]) && _.isObject($args[$args.length - 1])) {
    $args = [
      $args[$args.length - 1].auth,
      ...($args[0] === undefined ? $args.slice(1) : $args),
    ];
    if ($args[0]) {
      if ($args[0].user) {
        basicAuth = $args[0];
      } else {
        cookieAuth = $args[0];
      }
    }
  } else if (!_.isEmpty($args) && $args[0].user) {
    authOptions = $args[0];
    basicAuth = new BasicAuth({
      user: authOptions.user,
      password: authOptions.password,
      tenant: authOptions.tenant,
    });
    $args[0] = basicAuth;
  } else if (_.isFunction($args[0]) || isArrayOfFunctions($args[0])) {
    $args.unshift(undefined);
  }

  // check if there is a XSRF token to use for CookieAuth
  cookieAuth = new CookieAuth();
  const token = _.get(cookieAuth.getFetchOptions({}), "headers.X-XSRF-TOKEN");
  if (!token || _.isEmpty(token)) {
    cookieAuth = undefined;
  }

  if (
    $args.length === 2 &&
    _.isObject($args[0]) &&
    (_.isFunction($args[1]) || isArrayOfFunctions($args[1]))
  ) {
    $args.push({});
  }

  let [argAuth, clientFn, argOptions] = $args;
  const options = _.defaults(argOptions, defaultOptions);

  // force CookieAuth over BasicAuth if present and not disabled by options
  const auth: C8yAuthentication =
    cookieAuth && options.preferBasicAuth === false && !prevSubjectIsAuth
      ? cookieAuth
      : argAuth;
  const baseUrl = options.baseUrl || Cypress.config().baseUrl;
  const tenant =
    (basicAuth && tenantFromBasicAuth(basicAuth)) ||
    (authOptions && authOptions.tenant) ||
    Cypress.env("C8Y_TENANT");

  // if client is provided via options, use it
  let c8yclient: C8yClient = { _client: options.client };

  // restore client only if client is undefined and no auth is provided as previousSubject
  // previousSubject must have priority
  if (!options.client && !(args[0] && isAuth(args[0]))) {
    c8yclient = restoreClient() || { _client: undefined };
  }

  if (!c8yclient._client && clientFn && !auth) {
    throw new Error(
      "Missing authentication. Authentication or Client required."
    );
  }

  // pass userAlias into the auth so it is part of the pact recording
  if (authOptions && authOptions.userAlias) {
    auth.userAlias = authOptions.userAlias;
  } else if (Cypress.env("C8Y_LOGGED_IN_USER_ALIAS")) {
    auth.userAlias = Cypress.env("C8Y_LOGGED_IN_USER_ALIAS");
  }

  if (!c8yclient._client && !tenant && !options.skipClientAuthenication) {
    logOnce = options.log;
    authenticateClient(auth, options, baseUrl).then((c) => {
      return runClient(c, clientFn, prevSubject, baseUrl);
    });
  } else {
    if (!c8yclient._client) {
      c8yclient._client = new Client(auth, baseUrl);
      if (tenant) {
        c8yclient._client.core.tenant = tenant;
      }
    } else if ((auth && !options.client) || prevSubjectIsAuth) {
      // overwrite auth for restored clients
      c8yclient._client.setAuth(auth);
      c8yclient._auth = auth;
    }
    c8yclient._options = options;
    runClient(c8yclient, clientFn, prevSubject, baseUrl);
  }
};

function runClient(
  client: C8yClient,
  fns: C8yClientFnArg,
  prevSubject: any,
  baseUrl: string
) {
  client._client.core.defaultHeaders = {
    "content-type": "application/json",
  };
  storeClient(client);
  if (!fns) {
    // return Cypress.isCy(client) ? client : cy.wrap(client._client, { log: false });
    return cy.wrap(client._client, { log: false });
  }
  logOnce = client._options.log;
  return run(client, fns, prevSubject, client._options, baseUrl);
}

function preprocessResponseObject(
  r: any,
  client?: C8yClient,
  save: boolean = true
): void {
  let response = (r.res && r.res.responseObj) || r.responseObj || r;
  if (r.data) {
    response.body = r.data;
  }
  response.method = (r.res && r.res.method) || r.method || "GET";
  const requestBody = (r.res && r.res.requestBody) || r.requestBody;
  if (requestBody) {
    response.requestBody = requestBody;
  }
  response.options = client?._options;

  if (client?._auth) {
    response.auth = _.pick(client?._auth, ["user", "userAlias"]);
    if (!response.auth.user) {
      response.auth.user = Cypress.env("C8Y_LOGGED_IN_USER");
    }
    if (!response.auth.userAlias) {
      response.auth.userAlias = Cypress.env("C8Y_LOGGED_IN_USERALIAS");
    }
    response.auth.type = client?._auth.constructor.name;
  }

  if (response.method === "POST") {
    const newId = response.body.id;
    if (newId) {
      response.createdObject = newId;
    }
  }

  if (save) {
    Cypress.c8ypact.savePact(response, client);
  }

  return response;
}

// create client as done with Client.authenticate(), but also support
// Cookie authentication. Client.authenticate() only works with BasicAuth
function authenticateClient(
  auth: C8yAuthentication,
  options: C8yClientOptions,
  baseUrl: string
): Cypress.Chainable<C8yClient> {
  return cy.then(async () => {
    const clientCore = new FetchClient(auth, baseUrl);
    clientCore.defaultHeaders = {
      "content-type": "application/json",
    };
    const res = await clientCore.fetch("/tenant/currentTenant");
    preprocessResponseObject(res, undefined, false);
    if (res.status !== 200) {
      throwError(makeErrorMessage(res.responseObj));
    }
    const { name } = await res.json();
    const client = new Client(auth, baseUrl);
    client.core.tenant = name;
    return { _client: client, _options: options, _auth: auth } as C8yClient;
  });
}

function run(
  client: C8yClient,
  fns: C8yClientFnArg,
  prevSubject: any,
  options: C8yClientOptions,
  baseUrl: string
) {
  const clientFn = isArrayOfFunctions(fns) ? fns.shift() : fns;
  return cy.then(async () => {
    const configIgnore =
      (Cypress.config().c8ypact && Cypress.config().c8ypact.ignore) || false;
    const optionsIgnore =
      (options.ignorePact && options.ignorePact === true) || false;

    const ignore = configIgnore || optionsIgnore;
    const savePact =
      options.pact == null && !ignore && Cypress.c8ypact.isRecordingEnabled();

    const matchPact = (response: any) => {
      if (ignore) return;
      if (
        options.pact ||
        (Cypress.c8ypact.isEnabled() && !Cypress.c8ypact.isRecordingEnabled())
      ) {
        for (const r of _.isArray(response) ? response : [response]) {
          (options.pact != null
            ? cy.wrap(options.pact, { log: Cypress.c8ypact.debugLog })
            : Cypress.c8ypact.currentNextPact()
          )
            // @ts-ignore
            .then((pactObject: any) => {
              if (pactObject != null && !ignore) {
                const { pact, info } = pactObject;
                cy.c8ymatch(r, pact, info, options);
              } else {
                if (
                  pactObject == null &&
                  Cypress.c8ypact.failOnMissingPacts &&
                  !ignore
                ) {
                  throwError(
                    `${Cypress.c8ypact.currentPactIdentifier()} not found. Disable Cypress.c8ypact.failOnMissingPacts to ignore.`
                  );
                }
              }
            });
        }
      }
    };

    const response = await new Cypress.Promise(async (resolve, reject) => {
      const isErrorResponse = (resp: any) => {
        return (
          (_.isArray(resp) ? resp : [resp]).filter(
            (r) =>
              (r.isOkStatusCode !== true && options.failOnStatusCode) ||
              _.isError(r)
          ).length > 0
        );
      };

      const preprocessedResponse = async (promise: Promise<any>) => {
        let result;
        try {
          result = await promise;
        } catch (error) {
          result = error;
        }
        result = preprocessResponseObject(result, client, savePact);
        if (isErrorResponse(result)) {
          throw result;
        }
        return result;
      };

      const resultPromise = clientFn(client._client, prevSubject);
      if (_.isError(resultPromise)) {
        reject(resultPromise);
        return;
      }

      if (_.isArray(resultPromise)) {
        let toReject = false;
        let result = [];
        for (const task of resultPromise) {
          try {
            result.push(await preprocessedResponse(task));
          } catch (err) {
            result.push(err);
            toReject = true;
          }
        }
        if (toReject) {
          reject(result);
        } else {
          resolve(result);
        }
      } else {
        try {
          resolve(await preprocessedResponse(resultPromise));
        } catch (err) {
          reject(err);
        }
      }
    }).catch((err) => {
      if (_.isError(err)) {
        throw err;
      }

      matchPact(err);

      cy.then(() => {
        // @ts-ignore
        Cypress.utils.throwErrByPath("request.c8yclient_status_invalid", {
          args: err,
          stack: false,
        });
      });
    });

    matchPact(response);

    cy.then(() => {
      if (isArrayOfFunctions(fns) && !_.isEmpty(fns)) {
        run(client, fns, response, options, baseUrl);
      } else {
        cy.wrap(response, { log: Cypress.c8ypact.debugLog });
      }
    });
  });
}

// @ts-ignore
_.extend(Cypress.errorMessages.request, {
  c8yclient_status_invalid(obj: any) {
    const err = obj.args || obj.errorProps || obj;
    return {
      message: makeErrorMessage(obj),
      docsUrl: `${
        (err.body && err.body.info) ||
        "https://github.com/SoftwareAG/cumulocity-cypress"
      }`,
    };
  },
});

function makeErrorMessage(obj: any) {
  const err = obj.args || obj.errorProps || obj;
  const body = err.body || {};

  const message = [
    `c8yclient failed with: ${err.status} (${err.statusText})`,
    `${err.url}`,
    `The response we received from Cumulocity was: `,
    `${_.isObject(body) ? JSON.stringify(body, null, 2) : body.toString()}`,
    `For more information check:`,
    `${
      (err.body && err.body.info) ||
      "https://github.com/SoftwareAG/cumulocity-cypress"
    }`,
    `\n`,
  ].join(`\n`);
  return message;
}

async function responseObject(
  url: RequestInfo | URL,
  response: Partial<Response> | { res?: Partial<Response> },
  fetchOptions: IFetchOptions = {},
  duration: number = 0
): Promise<Partial<Cypress.Response<any>>> {
  const resp: Response = _.has(response, "res")
    ? { ...response, ..._.get(response, "res") }
    : response;
    debugger
  return {
    status: resp.status,
    isOkStatusCode: resp.ok,
    statusText: resp.statusText,
    headers: Object.fromEntries(resp.headers || []),
    requestHeaders: fetchOptions.headers,
    duration: duration,
    url: toUrlString(url),
  };
}

function toUrlString(url: RequestInfo | URL): string {
  if (_.isString(url)) {
    return url;
  } else if (url instanceof URL) {
    return url.toString();
  } else if (url instanceof Request) {
    return url.url;
  } else {
    throw new Error(
      `Type for URL not supported. Expected URL, string or Request, but found $'{typeof url}}'.`
    );
  }
}

// from error_utils.ts
function getDisplayUrl(
  url: string,
  baseUrl: string = Cypress.config().baseUrl
): string {
  return url.replace(baseUrl, "");
}

function isArrayOfFunctions(
  functions: C8yClientFnArg
): functions is Array<any> {
  if (!functions || !_.isArray(functions)) return false;
  return _.isEmpty(functions.filter((f) => !_.isFunction(f)));
}

Cypress.Commands.add(
  "c8yclientf",
  { prevSubject: "optional" },
  (...args: any[]) => {
    const failOnStatus = { failOnStatusCode: false };
    args = _.dropRightWhile(args, (n) => n == null);
    let options = _.last(args);
    if (!_.isObjectLike(options)) {
      options = failOnStatus;
      args.push(options);
    } else {
      args[args.length - 1] = { ...options, ...failOnStatus };
    }
    return c8yclientFn(...args);
  }
);

Cypress.Commands.add("c8yclient", { prevSubject: "optional" }, c8yclientFn);

Cypress.Commands.add("c8ymatch", (response, pact, info = {}, options = {}) => {
  const matcher = Cypress.c8ypact.matcher;
  const consoleProps = {
    response,
    pact,
    matcher,
  };
  const logger = Cypress.log({
    autoEnd: false,
    consoleProps: () => consoleProps,
    message: matcher.constructor.name || "-",
  });
  try {
    const preprocessedResponse = _.cloneDeep(response);
    Cypress.c8ypact.preprocessor.preprocess(
      preprocessedResponse,
      info.preprocessor
    );
    matcher.match(preprocessedResponse, pact, consoleProps);
    logger.end();
  } catch (error) {
    logger.end();
    if (options.failOnPactValidation) {
      throw error;
    }
  }
});
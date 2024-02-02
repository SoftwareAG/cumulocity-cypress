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
import { C8yDefaultPactRecord, isPactError } from "../pacts/c8ypact";

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

      /**
       * Compares a given Cypress.Response object with a C8yPactRecord contract or a json schema.
       * match ing fails, an C8yPactError is thrown.
       *
       * @param response - A Cypress.Response object representing the HTTP response.
       * @param record - A C8yPactRecord object representing the contract.
       * @param info - An optional C8yPactInfo object that may contain additional information for processing the contract.
       * @param options - An optional C8yClientOptions object that may contain various options for the behavior of the c8ymatch function.
       */
      c8ymatch(
        response: Cypress.Response<any>,
        record: Partial<C8yPactRecord>,
        info?: C8yPactInfo,
        options?: C8yClientOptions
      ): Cypress.Chainable<void>;
      c8ymatch(
        response: Cypress.Response<any>,
        schema: any
      ): Cypress.Chainable<void>;
    }

    interface Response<T = any> {
      url?: string;
      requestBody?: string | any;
      method?: string;
      $body?: any;
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

  type C8yClientFnArg<R = any, T = any> =
    | C8yClientServiceFn<R, T>
    | C8yClientServiceArrayFn<R, T>[]
    | C8yClientServiceListFn<R, T>;

  /**
   * Options used to configure c8yclient command.
   */
  type C8yClientOptions = Partial<Cypress.Loggable> &
    Partial<Cypress.Timeoutable> &
    Partial<Pick<Cypress.Failable, "failOnStatusCode">> &
    Partial<{
      auth: IAuthentication;
      baseUrl: string;
      client: Client;
      preferBasicAuth: boolean;
      skipClientAuthentication: boolean;
      failOnPactValidation: boolean;
      ignorePact: boolean;
      schema: any;
    }>;

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

  /**
   * Wrapper for Client to pass auth and options without extending Client.
   * Using underscore to avoid name clashes with Client and misunderstandings reading the code.
   */
  interface C8yClient {
    _auth?: C8yAuthentication;
    _options?: C8yClientOptions;
    _client: Client;
  }

  /**
   * Covert a given object to a Cypress.Response object.
   *
   * @param obj The object to convert.
   * @param duration Additional duration to add to the response.
   * @param fetchOptions Additional fetch options to use for conversion. Required for requestHeaders for example.
   * @param url Additional url to add to the response.
   */
  function toCypressResponse<T = any>(
    obj:
      | Partial<Response>
      | IFetchResponse
      | IResult<any>
      | IResultList<any>
      | C8yPactRecord,
    duration?: number,
    fetchOptions?: IFetchOptions,
    url?: RequestInfo | URL
  ): Cypress.Response<T>;

  /**
   * Checks if the given object is a Cypress.Response.
   *
   * @param obj The object to check.
   * @returns True if the object is a Cypress.Response, false otherwise.
   */
  function isCypressResponse(obj: any): obj is Cypress.Response<any>;
}

export const defaultClientOptions: C8yClientOptions = {
  log: true,
  timeout: Cypress.config().requestTimeout,
  failOnStatusCode: true,
  preferBasicAuth: false,
  skipClientAuthentication: false,
  ignorePact: false,
  failOnPactValidation: true,
  schema: undefined,
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

  // client.tenant.current() does add content-type header for some reason. probably mistaken accept header.
  // as this is not required, remove it to avoid special handling in pact matching against recordings
  // not created by c8y/client.
  if (_.endsWith(toUrlString(url), "/tenant/currentTenant")) {
    // @ts-ignore
    fetchOptions.headers = _.omit(fetchOptions.headers, ["content-type"]);
  } else {
    // add json content type if body is present and content-type is not set
    const method = fetchOptions?.method || "GET";
    if (fetchOptions?.body && method !== "GET" && method != "HEAD") {
      fetchOptions.headers = {
        "content-type": "application/json",
        ...fetchOptions.headers,
      };
    }
  }

  let startTime: number = Date.now();
  const fetchPromise: Promise<Response> = window.fetchStub(url, fetchOptions);

  const createFetchResponse = async (response: Response) => {
    const duration = Date.now() - startTime;
    responseObj = await (async () => {
      return toCypressResponse(response, duration, fetchOptions, url);
    })();

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
      responseObj.requestBody = _.isString(fetchOptions.body)
        ? JSON.parse(fetchOptions.body)
        : fetchOptions.body;
    } catch (error) {
      responseObj.requestBody = fetchOptions.body;
    }
    // res.ok = response.ok,
    responseObj.method = fetchOptions?.method || res?.method || "GET";

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
  let prevSubject: Cypress.Chainable<any> =
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
  const options = _.defaults(argOptions, defaultClientOptions);

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

  if (!c8yclient._client && !tenant && !options.skipClientAuthentication) {
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
    if (!c8yclient._auth) {
      c8yclient._auth = auth;
    }
    runClient(c8yclient, clientFn, prevSubject, baseUrl);
  }
};

function runClient(
  client: C8yClient,
  fns: C8yClientFnArg,
  prevSubject: any,
  baseUrl: string
) {
  storeClient(client);
  if (!fns) {
    // return Cypress.isCy(client) ? client : cy.wrap(client._client, { log: false });
    return cy.wrap(client._client, { log: false });
  }
  logOnce = client._options.log;
  return run(client, fns, prevSubject, client._options, baseUrl);
}

// create client as Client.authenticate() does, but also support
// Cookie authentication as Client.authenticate() only works with BasicAuth
function authenticateClient(
  auth: C8yAuthentication,
  options: C8yClientOptions,
  baseUrl: string
): Cypress.Chainable<C8yClient> {
  return cy.then(async () => {
    const clientCore = new FetchClient(auth, baseUrl);
    const res = await clientCore.fetch("/tenant/currentTenant");
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
      Cypress.c8ypact.current == null &&
      !ignore &&
      Cypress.c8ypact.isRecordingEnabled();

    const matchPact = (response: any, schema: any) => {
      if (schema) {
        cy.c8ymatch(response, schema);
      } else {
        if (ignore) return;
        if (
          Cypress.c8ypact.current ||
          (Cypress.c8ypact.isEnabled() && !Cypress.c8ypact.isRecordingEnabled())
        ) {
          for (const r of _.isArray(response) ? response : [response]) {
            const record = Cypress.c8ypact.current?.nextRecord();
            const info = Cypress.c8ypact.current?.info;
            if (record != null && info != null && !ignore) {
              cy.c8ymatch(r, record, info, options);
            } else {
              if (
                record == null &&
                Cypress.c8ypact.getConfigValue("failOnMissingPacts", true) &&
                !ignore
              ) {
                throwError(
                  `${Cypress.c8ypact.getCurrentTestId()} not found. Disable Cypress.c8ypact.failOnMissingPacts to ignore.`
                );
              }
            }
          }
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
        result = toCypressResponse(result);
        result.$body = options.schema;
        if (savePact) {
          await Cypress.c8ypact.savePact(result, client);
        }
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

      matchPact(err, options.schema);

      cy.then(() => {
        // @ts-ignore
        Cypress.utils.throwErrByPath("request.c8yclient_status_invalid", {
          args: err,
          stack: false,
        });
      });
    });

    matchPact(response, options.schema);

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
  const p = Cypress.config().c8ypact;
  let matcher = Cypress.c8ypact.matcher;

  const isSchemaMatching =
    !("request" in pact) && !("response" in pact) && _.isObjectLike(pact);
  if (isSchemaMatching) {
    matcher = Cypress.c8ypact.schemaMatcher;
    options.failOnPactValidation = true;
  }

  const consoleProps: any = { response, matcher };
  const logger = Cypress.log({
    autoEnd: false,
    consoleProps: () => consoleProps,
    message: matcher.constructor.name || "-",
  });

  try {
    if (isSchemaMatching) {
      const schema = pact;
      _.extend(consoleProps, { response }, { schema });
      matcher.match(response.body, schema);
    } else {
      const matchingProperties = ["request", "response"];
      const pactToMatch = _.pick(pact, matchingProperties);
      const responseAsRecord = _.pick(
        C8yDefaultPactRecord.from(response),
        matchingProperties
      );

      Cypress.c8ypact.preprocessor?.apply(responseAsRecord, info.preprocessor);
      _.extend(
        consoleProps,
        { responseAsRecord },
        { response },
        { pact: pactToMatch }
      );

      matcher.match(responseAsRecord, pactToMatch, consoleProps);
    }
  } catch (error: any) {
    if (options.failOnPactValidation) {
      if (isCypressError(error) || isPactError(error)) {
        throw error;
      } else {
        throwError(`Matching schema failed. Error: ${error}`);
      }
    }
  } finally {
    logger.end();
  }
});

globalThis.toCypressResponse = toCypressResponse;
function toCypressResponse(
  obj:
    | Partial<Response>
    | IFetchResponse
    | IResult<any>
    | IResultList<any>
    | C8yPactRecord,
  duration: number = 0,
  fetchOptions: IFetchOptions = {},
  url?: RequestInfo | URL,
  schema?: any
): Cypress.Response<any> {
  if (!obj) return undefined;

  if (isPactRecord(obj)) {
    return obj.toCypressResponse();
  }
  let fetchResponse: Partial<Response>;
  if (isIResult(obj)) {
    fetchResponse = obj.res;
  } else if (isWindowFetchResponse(obj)) {
    fetchResponse = obj;
  } else {
    fetchResponse = obj;
  }
  if ("responseObj" in fetchResponse) {
    return _.get(fetchResponse, "responseObj") as Cypress.Response<any>;
  }
  return {
    status: fetchResponse.status,
    isOkStatusCode:
      fetchResponse.ok ||
      (fetchResponse.status > 199 && fetchResponse.status < 300),
    statusText: fetchResponse.statusText,
    headers: Object.fromEntries(fetchResponse.headers || []),
    requestHeaders: fetchOptions.headers,
    duration: duration,
    url: toUrlString(url),
    allRequestResponses: [],
    body: fetchResponse.data,
    requestBody: fetchResponse.requestBody,
    method: fetchResponse.method || "GET",
    $body: schema,
  };
}

globalThis.isCypressResponse = isCypressResponse;
function isCypressResponse(obj: any): obj is Cypress.Response {
  return (
    _.isObjectLike(obj) &&
    "body" in obj &&
    "status" in obj &&
    "headers" in obj &&
    "requestHeaders" in obj &&
    "duration" in obj &&
    "url" in obj &&
    "isOkStatusCode" in obj &&
    // not a window.Response or Client.FetchResponse
    !("ok" in obj || "arrayBuffer" in obj)
  );
}

/**
 * Checks if the given object is an array only containing functions.
 * @param obj The object to check.
 */
export function isArrayOfFunctions<T>(
  functions: C8yClientFnArg | Array<Function>
): functions is Array<Function> {
  if (!functions || !_.isArray(functions) || _.isEmpty(functions)) return false;
  return _.isEmpty(functions.filter((f) => !_.isFunction(f)));
}

/**
 * Checks if the given object is a window.Response.
 * @param obj The object to check.
 */
export function isWindowFetchResponse(obj: any): obj is Partial<Response> {
  return (
    obj != null &&
    _.isObjectLike(obj) &&
    "status" in obj &&
    "statusText" in obj &&
    "headers" in obj &&
    "body" in obj &&
    "url" in obj &&
    _.isFunction(_.get(obj, "json")) &&
    _.isFunction(_.get(obj, "arrayBuffer"))
  );
}

/**
 * Checks if the given object is an IResult.
 * @param obj The object to check.
 */
export function isIResult(obj: any): obj is IResult<any> {
  return (
    obj != null &&
    _.isObjectLike(obj) &&
    "data" in obj &&
    "res" in obj &&
    isWindowFetchResponse(obj.res)
  );
}

/**
 * Checks if the given object is a CypressError.
 * @param error The object to check.
 * @returns True if the object is a CypressError, false otherwise.
 */
export function isCypressError(error: any): boolean {
  return _.isError(error) && _.get(error, "name") === "CypressError";
}

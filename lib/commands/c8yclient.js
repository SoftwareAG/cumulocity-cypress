import { BasicAuth, Client, CookieAuth, FetchClient } from "@c8y/client";
import {
  isAuth,
  getAuthOptionsFromBasicAuthHeader,
  normalizedArgumentsWithAuth,
  restoreClient,
  storeClient,
  tenantFromBasicAuth,
  throwError,
} from "./utils";

const { _ } = Cypress;

const defaultOptions = {
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
  let responseObj = {};

  if (logOnce === true) {
    Cypress.log({
      name: "c8yclient",
      message: "",
      consoleProps() {
        const props = {};
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
          props["BasicAuth"] = `${basicAuth} (${auth.user})`;
        }

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

      renderProps() {
        function getIndicator() {
          // returns 'aborted' | 'pending' | 'successful' | 'bad'
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

  let startTime = Date.now();
  const fetchPromise = window.fetchStub(url, fetchOptions);

  const createFetchResponse = async (response) => {
    responseObj = await responseObject(
      url,
      response || {},
      fetchOptions,
      Date.now() - startTime
    );

    let rawBody;
    if (response.data) {
      responseObj.body = response.data;
      rawBody = _.isObject(body) ? JSON.stringify(body) : body;
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
    const res = new window.Response(rawBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      ok: response.ok,
      redirected: response.redirected,
      type: response.type,
      url: response.url,
    });
    try {
      res.requestBody = JSON.parse(fetchOptions.body);
    } catch (error) {
      res.requestBody = fetchOptions.body;
    }
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

const c8yclientFn = (...args) => {
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
  const auth =
    cookieAuth && options.preferBasicAuth === false && !prevSubjectIsAuth
      ? cookieAuth
      : argAuth;
  const baseUrl = options.baseUrl || Cypress.config().baseUrl;
  const tenant =
    (basicAuth && tenantFromBasicAuth(basicAuth)) ||
    (authOptions && authOptions.tenant) ||
    Cypress.env("C8Y_TENANT");

  // if client is provided via options, use it
  let client = options.client;
  // restore client only if client is undefined and no auth is provided as previousSubject
  // previousSubject must have priority
  if (!client && !(args[0] && isAuth(args[0]))) {
    client = restoreClient();
  }

  if (!client && clientFn && !auth) {
    throw new Error(
      "Missing authentication. Authentication or Client required."
    );
  }

  if (!client && !tenant && !options.skipClientAuthenication) {
    logOnce = options.log;
    client = authenticateClient(auth, baseUrl).then((c) => {
      return runClient(c, clientFn, prevSubject, options, baseUrl);
    });
  } else {
    if (!client) {
      client = new Client(auth, baseUrl);
      if (tenant) {
        client.core.tenant = tenant;
      }
    }

    runClient(client, clientFn, prevSubject, options, baseUrl);
  }
};

function runClient(client, fns, prevSubject, options, baseUrl) {
  client.core.defaultHeaders = {
    "content-type": "application/json",
  };
  storeClient(client);
  if (!fns) {
    return Cypress.isCy(client) ? client : cy.wrap(client);
  }
  logOnce = options.log;
  return run(client, fns, prevSubject, options, baseUrl);
}

function preprocessResponseObject(r, save = true) {
  let response = (r.res && r.res.responseObj) || r.responseObj || r;
  if (r.data) {
    response.body = r.data;
  }
  response.method = (r.res && r.res.method) || r.method || "GET";
  const requestBody = (r.res && r.res.requestBody) || r.requestBody;
  if (requestBody) {
    response.requestBody = requestBody;
  }
  if (Cypress.c8ypact.isRecordingEnabled() && save) {
    Cypress.c8ypact.savePact(response);
  }
  return response;
}

// create client as done with Client.authenticate(), but also support
// Cookie authentication. Client.authenticate() only works with BasicAuth
function authenticateClient(auth, baseUrl) {
  return cy.then(async () => {
    const clientCore = new FetchClient(auth, baseUrl);
    clientCore.defaultHeaders = {
      "content-type": "application/json",
    };
    const res = await clientCore.fetch("/tenant/currentTenant");
    preprocessResponseObject(res, false);
    if (res.status !== 200) {
      throwError(makeErrorMessage(res.responseObj));
    }
    const { name } = await res.json();
    const client = new Client(auth, baseUrl);
    client.core.tenant = name;
    return client;
  });
}

function run(client, fns, prevSubject, options, baseUrl) {
  const clientFn = isArrayOfFunctions(fns) ? fns.shift() : fns;
  return cy.then(async () => {
    const response = await new Cypress.Promise(async (resolve, reject) => {
      const isErrorResponse = (resp) => {
        return (
          (_.isArray(resp) ? resp : [resp]).filter(
            (r) =>
              (r.isOkStatusCode !== true && options.failOnStatusCode) ||
              _.isError(r)
          ).length > 0
        );
      };

      const preprocessedResponse = async (promise) => {
        let result;
        try {
          result = await promise;
        } catch (error) {
          result = error;
        }
        result = preprocessResponseObject(result);
        if (isErrorResponse(result)) {
          throw result;
        }
        return result;
      };

      const resultPromise = clientFn(client, prevSubject);
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

      Cypress.utils.throwErrByPath("request.c8yclient_status_invalid", {
        args: err,
        stack: false,
      });
    });

    if (Cypress.c8ypact.isEnabled() && !Cypress.c8ypact.isRecordingEnabled()) {
      for (const r of _.isArray(response) ? response : [response]) {
        Cypress.c8ypact.currentNextPact().then((pact) => {
          if (!pact && Cypress.c8ypact.failOnMissingPacts) {
            throwError(
              `Pact ${Cypress.c8ypact.currentPactIdentifier()} not found and Cypress.c8ypact.failOnMissingPacts is enabled.`
            );
          }
          if (pact && !options.ignorePact) {
            try {
              Cypress.c8ypact.matcher.match(r, pact);
            } catch (error) {
              if (options.failOnPactValidation) {
                throw error;
              }
            }
          }
        });
      }
    }
    cy.then(() => {
      if (isArrayOfFunctions(fns) && !_.isEmpty(fns)) {
        run(client, fns, response, options, baseUrl);
      } else {
        cy.wrap(response, { log: false });
      }
    });
  });
}

_.extend(Cypress.errorMessages.request, {
  c8yclient_status_invalid(obj) {
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

function makeErrorMessage(obj) {
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
  url,
  c8yresponse,
  fetchOptions = {},
  duration = 0
) {
  const resp = {
    res: {},
  };
  _.extend(resp, c8yresponse);
  return {
    status: resp.res.status || resp.status,
    isOkStatusCode: resp.res.ok || resp.ok,
    statusText: resp.res.statusText || resp.statusText,
    headers: Object.fromEntries(resp.res.headers || c8yresponse.headers || []),
    requestHeaders: fetchOptions.headers,
    duration: duration,
    url,
  };
}

// from error_utils.ts
function getDisplayUrl(url, baseUrl = Cypress.config().baseUrl) {
  return url.replace(baseUrl, "");
}

function isArrayOfFunctions(functions) {
  if (!functions || !_.isArray(functions)) return false;
  return _.isEmpty(functions.filter((f) => !_.isFunction(f)));
}

Cypress.Commands.add("c8yclientf", { prevSubject: "optional" }, (...args) => {
  const failOnStatus = { failOnStatusCode: false };
  let options = _.last(args);
  if (!_.isObjectLike(options)) {
    options = failOnStatus;
    args.push(options);
  } else {
    args[args.length - 1] = { ...options, ...failOnStatus };
  }
  return c8yclientFn(...args);
});

Cypress.Commands.add("c8yclient", { prevSubject: "optional" }, c8yclientFn);

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
          props["CookieAuth"] = `XSRF-TOKEN ${cookieAuth}`;
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

Cypress.Commands.add("c8yclient", { prevSubject: "optional" }, (...args) => {
  let prevSubject =
    args && args.length > 0 && !isAuth(args[0]) ? args[0] : undefined;
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
    cookieAuth && options.preferBasicAuth === false ? cookieAuth : argAuth;
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
      return prepareAndRunClient(c, clientFn, prevSubject, options, baseUrl);
    });
  } else {
    if (!client) {
      client = new Client(auth, baseUrl);
      if (tenant) {
        client.core.tenant = tenant;
      }
    }

    prepareAndRunClient(client, clientFn, prevSubject, options, baseUrl);
  }
});

function prepareAndRunClient(client, fns, prevSubject, options, baseUrl) {
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

// create client as done with Client.authenticate(), but also support
// Cookie authentication. Client.authenticate() only works with BasicAuth
function authenticateClient(auth, baseUrl) {
  return cy.then(async () => {
    const clientCore = new FetchClient(auth, baseUrl);
    clientCore.defaultHeaders = {
      "content-type": "application/json",
    };
    const res = await clientCore.fetch("/tenant/currentTenant");
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
    const response = await new Cypress.Promise((resolve, reject) => {
      const resolver = async (response) => {
        if (_.isError(response)) {
          reject(response);
          return;
        }
        let result;
        if (_.isArray(response)) {
          result = response.map((r) => {
            const responseObj = (r.res && r.res.responseObj) || r;
            if (r.data) {
              responseObj.body = r.data;
            }
            return responseObj;
          });
        } else {
          result =
            (response.res && response.res.responseObj) ||
            response.responseObj ||
            response;
          if (response.data) {
            result.body = response.data;
          }
        }

        if (
          options.failOnStatusCode &&
          (_.isArray(result) ? result : [result]).filter(
            (r) => r.isOkStatusCode !== true
          ).length > 0
        ) {
          reject(result);
        } else {
          resolve(result);
        }
      };

      const resultPromise = clientFn(client, prevSubject);
      if (_.isArray(resultPromise)) {
        Promise.all(resultPromise).then(resolver).catch(resolver);
      } else {
        resultPromise.then(resolver).catch(resolver);
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

    if (isArrayOfFunctions(fns) && !_.isEmpty(fns)) {
      run(client, fns, response, options, baseUrl);
    } else {
      return cy.wrap(response, { log: false });
    }
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

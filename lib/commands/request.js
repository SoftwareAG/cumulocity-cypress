import { getAuthOptionsFromEnv, normalizedArgumentsWithAuth } from "./utils";
const { _ } = Cypress;

const methods = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
  "TRACE",
  "COPY",
  "LOCK",
  "MKCOL",
  "MOVE",
  "PURGE",
  "PROPFIND",
  "PROPPATCH",
  "UNLOCK",
  "REPORT",
  "MKACTIVITY",
  "CHECKOUT",
  "MERGE",
  "M-SEARCH",
  "NOTIFY",
  "SUBSCRIBE",
  "UNSUBSCRIBE",
  "SEARCH",
  "CONNECT",
];

function retryRequest(...args) {
  const $args = normalizedArgumentsWithAuth(args);
  if (!$args || $args.length !== 3) {
    throw new Error(
      "Missing argument. Requiring authentication, request options and test function."
    );
  }

  let [auth, options, testFn] = $args;
  const orgOptions = _.cloneDeep(options);
  const retryOptions = _.pick(options, ["retryDelay", "retries"]);
  options = _.omit(options, ["retryDelay", "retries"]);
  testFn =
    testFn && _.isFunction(testFn)
      ? testFn
      : function () {
          return false;
        };

  const consoleProps = {
    auth: auth,
    retryOptions: retryOptions,
    requestOptions: options,
  };
  Cypress.log({
    name: "retryRequest",
    message: "",
    consoleProps: () => consoleProps,
  });

  const lastRetry = retryOptions.retries <= 0;
  const fixedOptions = lastRetry
    ? options
    : { ...options, failOnStatusCode: false };
  cy.getAuth(auth)
    .request(fixedOptions)
    .then((resp) => {
      if (testFn(resp) || lastRetry) return cy.wrap(resp);

      cy.wait(retryOptions.retryDelay).then(() => {
        return retryRequest(
          auth,
          { ...orgOptions, retries: retryOptions.retries - 1 },
          testFn
        );
      });
    });
}
Cypress.Commands.add("retryRequest", { prevSubject: "optional" }, retryRequest);

// we can not just simply overwrite cy.request and add authentication if needed as
// test code might use overwriting of requests. In this case our extension would be overwritten again.
// current solution uses a wrapper for the default request function that adds the authentication
// from environment.

const requestCommandWrapper = (wrappedFn) => {
  return function (...args) {
    const options = {};

    const originalFn = _.isFunction(args[0]) ? args[0] : undefined;
    const $args = originalFn ? args.slice(1) : args;

    const auth = getAuthOptionsFromEnv(...$args);

    if (_.isObjectLike($args[0])) {
      _.extend(options, $args[0]);
    } else if ($args.length === 1) {
      options.url = $args[0];
    } else if ($args.length === 2) {
      if (methods.includes($args[0].toUpperCase())) {
        options.method = $args[0];
        options.url = $args[1];
      } else {
        options.url = $args[0];
        options.body = $args[1];
      }
    } else if ($args.length === 3) {
      options.method = $args[0];
      options.url = $args[1];
      options.body = $args[2];
    }

    if (!options.auth && auth) {
      options.auth = _.omit(auth, "tenant");
    }

    const wrappedArgs = originalFn ? [args[0], options] : [options];
    return wrappedFn(...wrappedArgs);
  };
};

const requestFn = Cypress.cy["request"];
Cypress.cy.addCommand({
  name: "request",
  fn: requestCommandWrapper(requestFn),
  type: "parent",
  prevSubject: null,
});

const overwriteFn = Cypress.Commands.overwrite;
Cypress.Commands.overwrite = (name, fn) => {
  if (name === "request") {
    overwriteFn(name, requestCommandWrapper(fn));
  } else {
    overwriteFn(name, fn);
  }
};

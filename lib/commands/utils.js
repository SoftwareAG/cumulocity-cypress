const { _ } = Cypress;

/**
 * Helper to normalize any given arguments and Cypress `prevSubject`.
 *
 * When chaining commands, Cypress will pass result from previous subject
 * (parent) as first argument. In case of optional `prevSubject` Cypress will pass
 * `null` as first argument if previous command did not yield a result value.
 *
 * Depending on the hierarchy of chained commands, the structure of the
 * `prevSubject` argument will be different.
 *
 * Supported options
 * 1. [<prevSubject>, arguments]
 * 2. {"<index>": [<prevSubject>, arguments], "<index>": arguments }
 *
 * Structure of 2) depends on the command chainer.
 */
export function normalizedArguments(args) {
  if (!args) return [];

  let result = [];
  if (_.isArray(args)) {
    result = args;
    if (args[0] != null && _.isArray(result[0])) {
      const subjects = _.flatten(result[0]);
      result = subjects.concat(result.slice(1));
    }
  } else if (_.isObject(args)) {
    const values = Object.values(args);
    result = _.flatten(values[0]).concat(values.slice(1));
  }
  return _.dropWhile(result, (a) => !a);
}

/**
 * Get `normalizedArguments` and insert auth options from
 * env variables at the beginning of the arguments.
 */
export function normalizedArgumentsWithAuth(args) {
  const normalized = normalizedArguments(args);
  if (
    _.isEmpty(normalized) ||
    (!_.isEmpty(normalized) && !isAuth(normalized[0]))
  ) {
    const auth = getAuthOptionsFromEnv();
    if (auth) {
      normalized.unshift(auth);
    } else {
      if (!args[0]) {
        normalized.unshift(undefined);
      }
    }
  }
  return normalized;
}

export function getAuthOptionsFromEnv(...args) {
  // check first environment variables
  const user = Cypress.env(`C8Y_USERNAME`);
  const password = Cypress.env(`C8Y_PASSWORD`);
  if (!_.isEmpty(user) && !_.isEmpty(password)) {
    return authWithTenant({
      user,
      password,
    });
  }

  // check window.localStorage for __auth item
  const win = cy.state("window");
  const authString = win.localStorage.getItem("__auth");
  if (authString && _.isString(authString) && !_.isEmpty(authString)) {
    const authObj = getAuthOptionsFromArgs(JSON.parse(authString));
    if (isAuth(authObj)) {
      return authObj;
    }
  }

  // check auth options configured via it("...", {auth: {...}}, ...)
  const auth = getAuthOptionsFromArgs(Cypress.config().auth);
  if (isAuth(auth)) {
    return auth;
  }
  return undefined;
}

export function getAuthOptions(...args) {
  if (!args || !args.length || (args[0] == null && args.length === 1)) {
    return getAuthOptionsFromEnv(...args);
  }

  if (args[0] && Cypress.isCy(args[0])) {
    return args[0];
  }

  // first args are null for every { prevSubject: option } command in the
  // call hierarchy. remove all null args from the beginning.
  if (args[0] == null) {
    args = _.dropWhile(args, (a) => !a);
  } else if (_.isArray(args[0])) {
    args = _.flatten(args[0]);
  }

  const auth = getAuthOptionsFromArgs(...args);
  if (isAuth(auth)) {
    return authWithTenant(auth);
  }

  return getAuthOptionsFromEnv(...args);
}

export function isAuth(obj) {
  return obj && _.isObject(obj) && obj.user && obj.password;
}

function getAuthOptionsFromArgs(...args) {
  // do not call getAuthOptionsFromEnv() in here!

  // getAuthOptions("admin")
  // return envs admin_username | admin, admin_password
  if (!_.isEmpty(args) && _.isString(args[0])) {
    const user = Cypress.env(`${args[0]}_username`) || args[0];
    const password = Cypress.env(`${args[0]}_password`);
    if (user && password) {
      return authWithTenant({
        user,
        password,
      });
    }
  }

  // getAuthOptions({user: "abc", password: "abc"}, ...)
  if (!_.isEmpty(args) && _.isObject(args[0])) {
    if (isAuth(args[0])) {
      return authWithTenant(_.pick(args[0], ["user", "password", "tenant"]));
    }
  }

  // getAuthOptions({user: "abc", password: "abc"}, ...)
  if (!_.isEmpty(args) && _.isObject(args[0])) {
    if (args[0].username && args[0].password) {
      let auth = _.pick(args[0], ["username", "password", "tenantId"]);
      delete Object.assign(auth, { user: auth.username })["username"];
      if (auth.tenantId) {
        delete Object.assign(auth, { tenant: auth.tenantId })["tenantId"];
      }
      return authWithTenant(auth);
    }
  }

  // getAuthOptions("abc", "abc")
  if (args.length >= 2 && _.isString(args[0]) && _.isString(args[1])) {
    return authWithTenant({
      user: args[0],
      password: args[1],
    });
  }

  return undefined;
}

export function getAuthOptionsFromBasicAuthHeader(authHeader) {
  if (
    !authHeader ||
    !_.isString(authHeader) ||
    !authHeader.startsWith("Basic ")
  ) {
    return undefined;
  }

  const base64Credentials = authHeader.slice("Basic ".length);
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "utf-8"
  );

  const components = credentials.split(":");
  if (!components || components.length < 2) {
    return undefined;
  }

  return { user: components[0], password: components.slice(1).join(":") };
}

export function persistAuth(auth) {
  const win = cy.state("window");
  if (auth) {
    win.localStorage.setItem("__auth", JSON.stringify(auth));
  }
}

export function tenantFromBasicAuth(auth) {
  if (!auth || !_.isObject(auth)) return;

  const components = auth.user.split("/");
  if (!components || components.length < 2) return;

  return components[0];
}

function authWithTenant(options) {
  const tenant = Cypress.env(`C8Y_TENANT`);
  if (tenant && !options.tenant) {
    _.extend(options, { tenant });
  }
  return options;
}

export function storeClient(client) {
  cy.state("ccs.client", client);
}

export function restoreClient() {
  return cy.state("ccs.client");
}

export function resetClient(client) {
  cy.state("ccs.client", undefined);
}

export function throwError(message) {
  const newErr = new Error(message);
  newErr.name = "CypressError";
  throw newErr;
}

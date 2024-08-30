import {
  getShellVersionFromEnv,
  getSystemVersionFromEnv,
  normalizedC8yclientArguments,
  throwError,
} from "../utils";
import {
  IUser,
  IApplication,
  ICurrentTenant,
  IDeviceCredentials,
} from "@c8y/client";
import { C8yAuthOptions } from "../../shared/auth";
import { C8yClientOptions } from "../../shared/c8yclient";
import { toSemverVersion } from "../../shared/versioning";

const { _ } = Cypress;

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Create a new user in Cumulocity. Assigns requested permissions and subcribes to
       * applications with given names.
       *
       * Uses cy.c8yclient internally. Will fail if user already exists.
       *
       * Pass auth if required or call `cy.login()` before to use `XSRF-TOKEN`cookie for
       * authentication.
       *
       * @example
       * cy.createUser({
       *   userName: "newuser",
       *   password: "newpassword",
       *   email: "newuser@example.com",
       *   displayName: "New User",
       * });
       *
       * @param {C8yAuthOptions} authOptions the C8yAuthOptions authentication options including username and password
       * @param {IUser} userOptions the user options defining the user to be created
       * @param {string[]} permissions the permissions to be assigned to the user
       * @param {string[] | IApplication[]} applications the name of applications to subscribe the user to
       * @param {C8yClientOptions} c8yoptions the C8yClientOptions options passed to cy.c8yclient
       *
       * @returns {[C8yAuthOptions, string]} the auth options and id of the user created for chaining
       */
      createUser(
        ...args:
          | [
              authOptions: C8yAuthOptions,
              userOptions: IUser,
              permissions?: string[],
              applications?: string[] | IApplication[],
              c8yoptions?: C8yClientOptions
            ]
          | [
              userOptions: IUser,
              permissions?: string[],
              applications?: string[] | IApplication[],
              c8yoptions?: C8yClientOptions
            ]
      ): Chainable<Cypress.Response<IUser>>;

      /**
       * Delete a user from Cumulocity. Will automatically deal with response status codes
       * to check if the user was deleted or did not exist. Will return success in both cases.
       *
       * Pass auth if required or call `cy.login()` before to use `XSRF-TOKEN`cookie for
       * authentication.
       *
       * @example
       * cy.deleteUser("newuser");
       *
       * @param {C8yAuthOptions} authOptions the C8yAuthOptions authentication options including username and password
       * @param {string} username the name of the user to be deleted
       * @param {C8yClientOptions} c8yoptions the C8yClientOptions options passed to cy.c8yclient
       *
       * @returns {C8yAuthOptions} the auth options for chaining
       */
      deleteUser(
        ...args:
          | [username: string | IUser, c8yoptions?: C8yClientOptions]
          | [
              authOptions: C8yAuthOptions,
              username: string | IUser,
              c8yoptions?: C8yClientOptions
            ]
      ): Chainable<Cypress.Response<null>>;

      /**
       * Clear all roles currently assigned to a user.
       *
       * Pass auth if required or call `cy.login()` before to use `XSRF-TOKEN`cookie for
       * authentication.
       *
       * @example
       * cy.clearUserRoles("user");
       *
       * @param {C8yAuthOptions} authOptions the C8yAuthOptions authentication options including username and password
       * @param {string} username the name of the user to be deleted
       * @param {C8yClientOptions} c8yoptions the C8yClientOptions options passed to cy.c8yclient
       *
       * @returns {C8yAuthOptions} the auth options for chaining
       */
      clearUserRoles(
        ...args:
          | [username: string | IUser, c8yoptions?: C8yClientOptions]
          | [
              authOptions: C8yAuthOptions,
              username: string | IUser,
              c8yoptions?: C8yClientOptions
            ]
      ): Chainable<C8yAuthOptions>;

      /**
       * Assign roles to a user.
       *
       * Pass auth if required or call `cy.login()` before to use `XSRF-TOKEN`cookie for
       * authentication.
       *
       * @example
       * cy.assignUserRoles("user", ["role1", "role2"]);
       *
       * @param {C8yAuthOptions} authOptions the C8yAuthOptions authentication options including username and password
       * @param {string} username the name of the user to be deleted
       * @param {string[]} roles the roles to be assigned to the user
       * @param {C8yClientOptions} c8yoptions the C8yClientOptions options passed to cy.c8yclient
       *
       * @returns {C8yAuthOptions} the auth options for chaining
       */
      assignUserRoles(
        ...args:
          | [
              username: string | IUser,
              roles: string[],
              c8yoptions?: C8yClientOptions
            ]
          | [
              authOptions: C8yAuthOptions,
              username: string | IUser,
              roles: string[],
              c8yoptions?: C8yClientOptions
            ]
      ): Chainable<C8yAuthOptions>;

      /**
       * Gets information about the current tenant.
       *
       * If no authentication session cookie is used.
       *
       * @example
       * cy.getCurrentTenant();
       * cy.getAuth("admin").getCurrentTenant();
       *
       * @param {C8yAuthOptions} authOptions the C8yAuthOptions authentication options including username and password
       * @param {C8yClientOptions} c8yoptions the C8yClientOptions options passed to cy.c8yclient
       */
      getCurrentTenant(
        authOptions?: C8yAuthOptions,
        c8yoptions?: C8yClientOptions
      ): Chainable<Cypress.Response<ICurrentTenant>>;

      /**
       * Convenience getter for name of the current tenant.
       *
       * If no authentication session cookie is used.
       *
       * Tenant id is stored in C8Y_TENANT environment variable. C8Y_TENANT is used
       * internally and checked before quering current tenant for it's id.
       *
       * @example
       * cy.getTenantId();
       * cy.getAuth("admin").getTenantId();
       *
       * @param {C8yAuthOptions} options - The authentication options including username and password
       * @returns {Chainable<string>}
       */
      getTenantId(authOptions?: C8yAuthOptions): Chainable<string>;

      /**
       * Get Cumulocity system version. System version is loaded from `/tenant/system/options` endpoint.
       *
       * The system version is stored automatically in `C8Y_SYSTEM_VERSION` environment variable. If
       * the `C8Y_SYSTEM_VERSION` is set, the value is returned from the environment variable without requesting
       * the system version from the backend.
       *
       * @example
       * cy.getSystemVersion();
       * cy.log(Cypress.env("C8Y_SYSTEM_VERSION"));
       *
       * cy.getAuth("admin").getSystemVersion().then((version) => {
       *  cy.log(version);
       * });
       *
       * @param {C8yAuthOptions} options - The authentication options including username and password
       * @param {C8yClientOptions} clientOptions - The options passed to c8yclient for loading the version
       * @returns {Chainable<string>} The system version of Cumulocity backend
       */
      getSystemVersion(
        authOptions?: C8yAuthOptions,
        clientOptions?: C8yClientOptions
      ): Chainable<string | undefined>;

      /**
       * Get Cumulocity shell version. The shell version is differrent to the system version and defining
       * the UI application being used as shell in the application tested. This is typically `cockpit`,
       * `devicemanagement` or `administration`. The shell version is loaded from
       * `/apps/{shellName}/cumulocity.json`.
       *
       * Shell name can be set as `C8Y_SHELL_NAME` environment variable. If no shell name is provided
       * `cockpit` is used as default.
       *
       * The shell version is stored automatically in `C8Y_SHELL_VERSION` environment variable. If
       * `C8Y_SHELL_VERSION` is set, the value is returned from the environment variable without requesting
       * the shell version from the backend.
       *
       * @example
       * cy.getShellVersion("cockpit").then((version) => {
       *   cy.log(version);
       * });
       *
       * cy.getAuth("admin").getShellVersion("cockpit");
       * cy.log(Cypress.env("C8Y_SHELL_VERSION"));
       *
       * @param {C8yAuthOptions} options - The authentication options including username and password
       * @param {string} shellName - The name of the shell to get the version for
       * @param {C8yClientOptions} clientOptions - The options passed to c8yclient for loading the version
       * @returns {Chainable<string>} The shekk
       */
      getShellVersion(
        ...args:
          | [shellName?: string, clientOptions?: C8yClientOptions]
          | [
              authOptions?: C8yAuthOptions,
              shellName?: string,
              clientOptions?: C8yClientOptions
            ]
      ): Chainable<string | undefined>;

      /**
       * Bootstrap device credentials. Doing the same as c.deviceRegistration.bootstrap(), but works
       * with getAuth(). Requires bootstrap credentials to be passed via getAuth().
       *
       * @example
       * cy.getAuth("devicebootstrap")
       *   .bootstrapDeviceCredentials(id)
       *   .useAuth()
       *
       * @param {C8yAuthOptions} options - The authentication options including username and password
       * @returns {Chainable<IDeviceCredentials | undefined>}
       */
      bootstrapDeviceCredentials(
        ...args:
          | [id: string | IUser, c8yoptions?: C8yClientOptions]
          | [
              authOptions: C8yAuthOptions,
              id: string,
              c8yoptions?: C8yClientOptions
            ]
      ): Chainable<IDeviceCredentials>;
    }
  }
}

Cypress.Commands.add("createUser", { prevSubject: "optional" }, (...args) => {
  const $args = normalizedC8yclientArguments(args);
  const [auth, userOptions, permissions, applications, clientOptions] = $args;

  const consoleProps: any = {
    args: args || null,
    auth: auth || null,
    userOptions: userOptions || null,
    permissions: permissions || null,
    applications: applications || null,
    clientOptions: clientOptions || null,
  };

  const logger = Cypress.log({
    autoEnd: false,
    name: "createUser",
    message: userOptions?.userName || null,
    consoleProps: () => consoleProps,
  });

  logger.end();
  if (!userOptions) {
    logger.end();
    throw new Error("Missing argument. Requiring user options argument.");
  }

  // use cy.wrap(auth) to pass auth from createUser to c8yclient
  // note auth might be undefined which means c8yclient will choose auth.
  return cy
    .wrap(auth, { log: false })
    .c8yclient((c) => c.user.create(userOptions), clientOptions)
    .then((userResponse) => {
      const userId = userResponse.body.id;
      consoleProps.userId = userId;
      expect(userId).to.not.be.undefined;
      if (permissions && !_.isEmpty(permissions)) {
        consoleProps.permissions = permissions;
        cy.wrap(permissions, { log: false }).each((permission) => {
          cy.wrap(auth, { log: false }).c8yclient(
            [
              (c) =>
                c.core.fetch(
                  "/user/" + c.core.tenant + "/groupByName/" + permission
                ),
              (c, groupResponse) => {
                const childId = userResponse?.body?.self;
                const groupId = groupResponse?.body?.id;
                if (!childId || !groupId) {
                  throwError(
                    `Failed to add user ${childId} to group ${childId}.`
                  );
                }
                return c.userGroup.addUserToGroup(groupId, childId);
              },
            ],
            clientOptions
          );
        });
      }
      if (applications && !_.isEmpty(applications)) {
        consoleProps.applications = applications;
        cy.wrap(applications, { log: false }).each((appName) => {
          cy.wrap(auth, { log: false }).c8yclient(
            [
              (c) =>
                c.core.fetch("/application/applicationsByName/" + appName, {
                  headers: {
                    accept:
                      "application/vnd.com.nsn.cumulocity.applicationcollection+json",
                  },
                }),
              (c, applicationResponse) => {
                const applications =
                  applicationResponse?.body?.applications ||
                  applicationResponse?.body;
                if (!applications || !_.isArrayLike(applications)) {
                  throwError(
                    `Application ${appName} not found. No or empty response.`
                  );
                }
                const apps = applications.map((a: any) => {
                  if (_.isString(a)) {
                    return {
                      type: "HOSTED",
                      id: a,
                    };
                  } else if (_.isObjectLike(a) && a.id) {
                    return _.pick(_.defaults(a, { type: "HOSTED" }), [
                      "id",
                      "type",
                    ]);
                  }
                  return undefined;
                });
                return c.user.update({ id: userId, applications: apps });
              },
            ],
            clientOptions
          );
        });
      }
      logger.end();
      return cy.wrap(userResponse);
    });
});

Cypress.Commands.add("deleteUser", { prevSubject: "optional" }, (...args) => {
  const $args = normalizedC8yclientArguments(args);
  const [auth, user, clientOptions] = $args;

  const options = { ...clientOptions, ...{ failOnStatusCode: false } };
  const username = _.isObjectLike(user) ? user.userName : user;
  const consoleProps = {
    auth: auth || null,
    clientOptions: options || null,
    user: user || null,
    username: username || null,
  };

  const logger = Cypress.log({
    autoEnd: false,
    name: "deleteUser",
    consoleProps: () => consoleProps,
  });

  if (!username || !_.isString(username)) {
    logger.end();
    throwError(
      "Missing argument. deleteUser() requires IUser object with userName or username string argument."
    );
  }

  return cy
    .wrap(auth, { log: false })
    .c8yclient((c) => c.user.delete(username), options)
    .then((deleteResponse) => {
      logger.end();
      expect(deleteResponse.status).to.be.oneOf([204, 404]);
      return cy.wrap(deleteResponse);
    });
});

Cypress.Commands.add(
  "clearUserRoles",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedC8yclientArguments(args);
    const [auth, user, clientOptions] = $args;

    const options = { ...clientOptions };
    const userIdentifier =
      _.isObjectLike(user) && user.userName ? user.userName : user;

    const consoleProps: any = {
      args: args || null,
      auth: auth || null,
      clientOptions: options,
      user: user || null,
    };

    const logger = Cypress.log({
      autoEnd: false,
      name: "clearUserRoles",
      message: userIdentifier,
      consoleProps: () => consoleProps,
    });

    if (!user || (_.isObjectLike(user) && !user.userName)) {
      logger.end();
      return throwError(
        "Missing argument. Requiring IUser object with userName or username argument."
      );
    }

    return cy
      .wrap(auth, { log: false })
      .c8yclient((client) => client.user.detail(userIdentifier), options)
      .then((response) => {
        const assignedRoles: any = response.body.groups.references;
        consoleProps.assignedRoles = assignedRoles || null;

        if (!assignedRoles || assignedRoles.length === 0) {
          return cy.wrap<C8yAuthOptions>(auth, { log: false });
        }

        cy.wrap(assignedRoles, { log: false }).each((assingedRole: any) => {
          cy.wrap(auth, { log: false }).c8yclient(
            (client) =>
              client.userGroup.removeUserFromGroup(
                assingedRole.group.id,
                userIdentifier
              ),
            options
          );
        });
        logger.end();
        return cy.wrap<C8yAuthOptions>(auth, { log: false });
      });
  }
);

Cypress.Commands.add(
  "assignUserRoles",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedC8yclientArguments(args);
    const [auth, user, roles, clientOptions] = $args;

    const options = { ...clientOptions };
    const consoleProps = {
      args: args || null,
      auth: auth || null,
      user: user || null,
      roles: roles || null,
      clientOptions: options,
    };

    const userIdentifier =
      _.isObjectLike(user) && user?.userName ? user?.userName : user;

    const logger = Cypress.log({
      autoEnd: false,
      name: "assignUserRoles",
      message: userIdentifier,
      consoleProps: () => consoleProps,
    });

    if (!user || (_.isObjectLike(user) && !user.userName)) {
      logger.end();
      return throwError(
        "Missing argument. Requiring IUser object with userName or username argument."
      );
    }

    if (!roles || roles.length === 0) {
      logger.end();
      return throwError(
        "Missing argument. Requiring an string array with roles."
      );
    }

    return cy
      .wrap(auth, { log: false })
      .c8yclient((client) => client.user.detail(userIdentifier), options)
      .then((response) => {
        cy.wrap(roles, { log: false }).each((role) => {
          cy.wrap(auth, { log: false }).c8yclient(
            [
              (client) =>
                client.core.fetch(
                  `/user/${client.core.tenant}/groupByName/${role}`
                ),
              (client, groupResponse) => {
                const childId = response?.body?.self;
                const groupId = groupResponse?.body?.id;
                if (childId == null || !groupId) {
                  logger.end();
                  throwError(
                    `Failed to add user ${childId} to group ${childId}.`
                  );
                }
                return client.userGroup.addUserToGroup(groupId, childId);
              },
            ],
            options
          );
        });
        logger.end();
        return cy.wrap<C8yAuthOptions>(auth, { log: false });
      });
  }
);

Cypress.Commands.add(
  "getCurrentTenant",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedC8yclientArguments(args);
    const [auth, clientOptions] = $args;

    const consoleProps = {
      args: args || null,
      auth: auth || null,
      clientOptions: clientOptions || null,
    };
    Cypress.log({
      name: "getCurrentTenant",
      consoleProps: () => consoleProps,
    });

    cy.wrap(auth, { log: false }).c8yclient(
      (c) => c.tenant.current(),
      clientOptions
    );
  }
);

Cypress.Commands.add("getTenantId", { prevSubject: "optional" }, (...args) => {
  const $args = normalizedC8yclientArguments(args);
  const [auth] = $args;
  const consoleProps: any = {
    args: args || null,
    auth: auth || null,
  };

  Cypress.log({
    name: "getTenantId",
    consoleProps: () => consoleProps,
  });

  if (Cypress.env("C8Y_TENANT") && !auth.tenant) {
    consoleProps.C8Y_TENANT = Cypress.env("C8Y_TENANT");
    return cy.wrap<string>(Cypress.env("C8Y_TENANT"));
  }

  // isMockingEnabled() also includes apply for matching of pacts with cy.c8ymatch
  // for matching we might not want use tenant id from recordings
  if (
    Cypress.c8ypact?.isEnabled() === true &&
    Cypress.c8ypact.mode() === "mock"
  ) {
    const tenant =
      Cypress.env("C8Y_TENANT") || Cypress.c8ypact.current?.info.tenant;
    Cypress.env("C8Y_TENANT", tenant);
    return cy.wrap<string>(tenant);
  }

  cy.wrap(auth, { log: false })
    .c8yclient()
    .then((c) => {
      expect(c.core.tenant).to.not.be.undefined;
      Cypress.env("C8Y_TENANT", c.core.tenant);
      cy.wrap(c.core.tenant);
    });
});

Cypress.Commands.add(
  "getSystemVersion",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedC8yclientArguments(args);
    const [auth, clientOptions] = $args;

    const consoleProps: any = {
      args: args || null,
      auth: auth || null,
      clientOptions: clientOptions || null,
      C8Y_SYSTEM_VERSION: Cypress.env("C8Y_SYSTEM_VERSION") || null,
      C8Y_VERSION: Cypress.env("C8Y_VERSION") || null,
      pactSystemVersion: Cypress.c8ypact.current?.info.version?.system || null,
    };
    Cypress.log({
      name: "getSystemVersion",
      consoleProps: () => consoleProps,
    });

    const systemVersion = getSystemVersionFromEnv();
    if (systemVersion) {
      consoleProps.Yields = systemVersion;
      if (Cypress.env("C8Y_SYSTEM_VERSION") == null) {
        Cypress.env("C8Y_SYSTEM_VERSION", systemVersion);
      }
      // set C8Y_VERSION for backward compatibility
      if (Cypress.env("C8Y_VERSION") == null) {
        Cypress.env("C8Y_VERSION", systemVersion);
      }
      return cy.wrap<string | undefined>(systemVersion);
    }

    cy.wrap(auth, { log: false })
      .c8yclient((c) => c.core.fetch("/tenant/system/options"), clientOptions)
      .then((systemOptions) => {
        const options = systemOptions.body && systemOptions.body.options;
        consoleProps.systemOptions = options || null;
        if (options) {
          const versionOptions: any[] = options.filter(
            (o: any) => o.category === "system" && o.key === "version"
          );
          if (!_.isEmpty(versionOptions)) {
            const version: string | undefined = _.first(versionOptions).value;
            consoleProps.Yields = version || null;
            Cypress.env("C8Y_SYSTEM_VERSION", version);
            Cypress.env("C8Y_VERSION", version);
            return cy.wrap<string | undefined>(version);
          }
        }
        cy.wrap(undefined);
      });
  }
);

Cypress.Commands.add(
  "getShellVersion",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedC8yclientArguments(args);
    // eslint-disable-next-line prefer-const
    let [auth, shellName, clientOptions] = $args;
    if (_.isObjectLike(shellName)) {
      shellName = undefined;
      clientOptions = shellName;
    }

    const consoleProps: any = {
      args: args || null,
      auth: auth || null,
      shellName: shellName || null,
      clientOptions: clientOptions || null,
      C8Y_SHELL_NAME: Cypress.env("C8Y_SHELL_NAME") || null,
    };
    Cypress.log({
      name: "getShellVersion",
      message: shellName || "cockpit",
      consoleProps: () => consoleProps,
    });

    const version = getShellVersionFromEnv();
    if (version) {
      consoleProps.Yields = version;
      return cy.wrap<string | undefined>(version);
    }

    const myShell = shellName || Cypress.env("C8Y_SHELL_NAME") || "cockpit";
    cy.wrap(auth, { log: false })
      .c8yclient(
        (c) => c.core.fetch(`/apps/${myShell}/cumulocity.json`),
        clientOptions
      )
      .then((response: any) => {
        consoleProps.response = response || null;
        const shellVersion = toSemverVersion(response?.body?.version);
        consoleProps.Yields = version || null;
        Cypress.env("C8Y_SHELL_VERSION", shellVersion);
        if (shellVersion != null && !Cypress.env("C8Y_SHELL_NAME")) {
          Cypress.env("C8Y_SHELL_NAME", myShell);
        }
        cy.wrap<string | undefined>(shellVersion);
      });
  }
);

Cypress.Commands.add(
  "bootstrapDeviceCredentials",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedC8yclientArguments(args);
    const [auth, id, clientOptions] = $args;

    const consoleProps: any = {
      args: args || null,
      auth: auth || null,
      clientOptions: clientOptions || null,
      id: id || null,
    };
    Cypress.log({
      name: "bootstrapDeviceCredentials",
      id,
      consoleProps: () => consoleProps,
    });

    const success = 201;
    const failure = 404;

    cy.wrap(auth, { log: false })
      .c8yclientf(
        (c) =>
          c.core.fetch("/devicecontrol/deviceCredentials", {
            method: "POST",
            headers: {
              accept:
                "application/vnd.com.nsn.cumulocity.devicecredentials+json",
            },
            body: JSON.stringify({ id }),
          }),
        clientOptions
      )
      .then((response) => {
        expect(response.status).to.be.oneOf([success, failure]);
        let result: IDeviceCredentials | undefined = undefined;
        if (
          response.status === success &&
          response.body &&
          response.body.username
        ) {
          result = response.body;
        }
        consoleProps.Yielded = result;
        cy.wrap(result);
      });
  }
);

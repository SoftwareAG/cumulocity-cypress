import { normalizedArgumentsWithAuth, throwError } from "../utils";
import {
  IUser,
  IApplication,
  ICurrentTenant,
  IDeviceCredentials,
} from "@c8y/client";
import { C8yAuthOptions } from "./auth";
import { C8yClientOptions } from "../../shared/c8yclient";
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
       * Get Cumulocity system version. Requires bootstrap credentials.
       *
       * @param {C8yAuthOptions} options - The authentication options including username and password
       * @returns {Chainable<string>}
       */
      getSystemVersion(
        authOptions?: C8yAuthOptions,
        c8yoptions?: C8yClientOptions
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
  const $args = normalizedArgumentsWithAuth(args);
  const [auth, userOptions, permissions, applications, clientOptions] = $args;

  const consoleProps = {
    auth,
    userOptions,
    permissions,
    applications,
    clientOptions,
  };

  Cypress.log({
    name: "createUser",
    message: userOptions.userName,
    consoleProps: () => consoleProps,
  });

  if (!userOptions) {
    throw new Error("Missing argument. Requiring user options argument.");
  }

  // use cy.wrap(auth) to pass auth from createUser to c8yclient
  // note auth might be undefined which means c8yclient will choose auth.
  return cy
    .wrap(auth, { log: false })
    .c8yclient((c) => c.user.create(userOptions), clientOptions)
    .then((userResponse) => {
      const userId = userResponse.body.id;
      expect(userId).to.not.be.undefined;
      if (permissions && !_.isEmpty(permissions)) {
        cy.wrap(permissions, { log: false }).each((permission) => {
          cy.wrap(auth, { log: false }).c8yclient(
            [
              (c) =>
                c.core.fetch(
                  "/user/" + c.core.tenant + "/groupByName/" + permission
                ),
              (c, groupResponse) =>
                c.userGroup.addUserToGroup(
                  groupResponse.body.id,
                  userResponse.body.self
                ),
            ],
            clientOptions
          );
        });
      }
      if (applications && !_.isEmpty(applications)) {
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
                expect(applicationResponse.body).to.not.be.empty;
                const applications =
                  applicationResponse.body.applications ||
                  applicationResponse.body;
                if (_.isArray(applications)) {
                  const apps = applications.map((a) => {
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
                }
              },
            ],
            clientOptions
          );
        });
      }
      return cy.wrap(userResponse);
    });
});

Cypress.Commands.add("deleteUser", { prevSubject: "optional" }, (...args) => {
  const $args = normalizedArgumentsWithAuth(args);
  const [auth, user, clientOptions] = $args;

  const options = { ...clientOptions, ...{ failOnStatusCode: false } };
  const consoleProps = {
    auth: auth,
    clientOptions: options,
  };
  Cypress.log({
    name: "deleteUser",
    message: _.isObjectLike(user) ? user.userName : user,
    consoleProps: () => consoleProps,
  });

  if (!user || (_.isObjectLike(user) && !user.userName)) {
    return throwError(
      "Missing argument. Requiring IUser object with userName or username argument."
    );
  }

  return cy
    .wrap(auth, { log: false })
    .c8yclient(
      (c) => c.user.delete(_.isObjectLike(user) ? user.userName : user),
      options
    )
    .then((deleteResponse) => {
      expect(deleteResponse.status).to.be.oneOf([204, 404]);
      return cy.wrap(deleteResponse);
    });
});

Cypress.Commands.add(
  "clearUserRoles",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedArgumentsWithAuth(args);
    const [auth, user, clientOptions] = $args;

    const options = { ...clientOptions };
    const consoleProps = {
      auth: auth,
      clientOptions: options,
    };

    Cypress.log({
      name: "clearUserRoles",
      message: _.isObjectLike(user) ? user.userName : user,
      consoleProps: () => consoleProps,
    });

    if (!user || (_.isObjectLike(user) && !user.userName)) {
      return throwError(
        "Missing argument. Requiring IUser object with userName or username argument."
      );
    }

    const userIdentifier = _.isObjectLike(user) ? user.userName : user;

    return cy
      .wrap(auth, { log: false })
      .c8yclient((client) => client.user.detail(userIdentifier), options)
      .then((response) => {
        const assignedRoles: any = response.body.groups.references;
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

        return cy.wrap<C8yAuthOptions>(auth, { log: false });
      });
  }
);

Cypress.Commands.add(
  "assignUserRoles",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedArgumentsWithAuth(args);
    const [auth, user, roles, clientOptions] = $args;

    const options = { ...clientOptions };
    const consoleProps = {
      auth: auth,
      clientOptions: options,
    };

    Cypress.log({
      name: "assignUserRoles",
      message: _.isObjectLike(user) ? user.userName : user,
      consoleProps: () => consoleProps,
    });

    if (!user || (_.isObjectLike(user) && !user.userName)) {
      return throwError(
        "Missing argument. Requiring IUser object with userName or username argument."
      );
    }

    if (!roles || roles.length === 0) {
      return throwError(
        "Missing argument. Requiring an string array with roles."
      );
    }

    const userIdentifier = _.isObjectLike(user) ? user.userName : user;

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
              (client, groupResponse) =>
                client.userGroup.addUserToGroup(
                  groupResponse.body.id,
                  response.body.self
                ),
            ],
            options
          );
        });

        return cy.wrap<C8yAuthOptions>(auth, { log: false });
      });
  }
);

Cypress.Commands.add(
  "getCurrentTenant",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedArgumentsWithAuth(args);
    const [auth, clientOptions] = $args;

    const consoleProps = {
      auth,
      clientOptions,
    };
    Cypress.log({
      name: "getCurrentTenant",
      consoleProps: () => consoleProps,
    });

    consoleProps.auth = auth;
    return cy
      .wrap(auth, { log: false })
      .c8yclient((c) => c.tenant.current(), clientOptions)
      .then((currentTenant) => {
        return cy.wrap(currentTenant);
      });
  }
);

Cypress.Commands.add("getTenantId", { prevSubject: "optional" }, (...args) => {
  const $args = normalizedArgumentsWithAuth(args);
  const [auth] = $args;
  const consoleProps: any = {
    auth,
  };

  Cypress.log({
    name: "getTenantId",
    consoleProps: () => consoleProps,
  });
  consoleProps.auth = auth;

  if (Cypress.env("C8Y_TENANT") && !auth.tenant) {
    consoleProps.env = Cypress.env("C8Y_TENANT");
    return cy.wrap<string>(Cypress.env("C8Y_TENANT"));
  }

  return cy
    .wrap(auth, { log: false })
    .c8yclient()
    .then((c) => {
      expect(c.core.tenant).to.not.be.undefined;
      Cypress.env("C8Y_TENANT", c.core.tenant);
      return cy.wrap(c.core.tenant);
    });
});

Cypress.Commands.add(
  "getSystemVersion",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedArgumentsWithAuth(args);
    const [auth, clientOptions] = $args;

    const consoleProps: any = {
      auth,
      clientOptions,
    };
    Cypress.log({
      name: "getSystemVersion",
      consoleProps: () => consoleProps,
    });

    consoleProps.auth = auth;

    return cy
      .wrap(auth, { log: false })
      .c8yclient((c) => c.core.fetch("/tenant/system/options"), clientOptions)
      .then((systemOptions) => {
        const options = systemOptions.body && systemOptions.body.options;
        consoleProps.systemOptions = options;
        if (options) {
          const versionOptions: any[] = options.filter(
            (o: any) => o.category === "system" && o.key === "version"
          );
          if (!_.isEmpty(versionOptions)) {
            const version: string = _.first(versionOptions).value;
            Cypress.env("C8Y_VERSION", version);
            return cy.wrap(version);
          }
        }
        cy.wrap(undefined);
      });
  }
);

Cypress.Commands.add(
  "bootstrapDeviceCredentials",
  { prevSubject: "optional" },
  (...args) => {
    const $args = normalizedArgumentsWithAuth(args);
    const [auth, id, clientOptions] = $args;

    const consoleProps: any = {
      auth,
      clientOptions,
    };
    Cypress.log({
      name: "bootstrapDeviceCredentials",
      id,
      consoleProps: () => consoleProps,
    });

    consoleProps.auth = auth;

    const success = 201;
    const failure = 404;

    return cy
      .wrap(auth, { log: false })
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
        let result: IDeviceCredentials;
        if (
          response.status === success &&
          response.body &&
          response.body.username
        ) {
          result = response.body;
        }
        consoleProps.Yielded = result;
        return cy.wrap(result);
      });
  }
);

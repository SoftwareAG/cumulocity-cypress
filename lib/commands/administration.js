import { normalizedArgumentsWithAuth, throwError } from "./utils";

const { _ } = Cypress;

Cypress.Commands.add(
  "createUser",
  { prevSubject: "optional" },
  function (...args) {
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
                      } else if (_.isObject(a) && a.id) {
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
  }
);

Cypress.Commands.add(
  "deleteUser",
  { prevSubject: "optional" },
  function (...args) {
    const $args = normalizedArgumentsWithAuth(args);
    const [auth, user, clientOptions] = $args;

    const options = { ...clientOptions, ...{ failOnStatusCode: false } };
    const consoleProps = {
      auth: auth,
      clientOptions: options,
    };
    Cypress.log({
      name: "deleteUser",
      message: _.isObject(user) ? user.userName : user,
      consoleProps: () => consoleProps,
    });

    if (!user || (_.isObject(user) && !user.userName)) {
      return throwError(
        "Missing argument. Requiring IUser object with userName or username argument."
      );
    }

    return cy
      .wrap(auth, { log: false })
      .c8yclient(
        (c) => c.user.delete(_.isObject(user) ? user.userName : user),
        options
      )
      .then((deleteResponse) => {
        expect(deleteResponse.status).to.be.oneOf([204, 404]);
        return cy.wrap(deleteResponse);
      });
  }
);

Cypress.Commands.add(
  "getCurrentTenant",
  { prevSubject: "optional" },
  function (...args) {
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

Cypress.Commands.add(
  "getTenantId",
  { prevSubject: "optional" },
  function (...args) {
    const $args = normalizedArgumentsWithAuth(args);
    const [auth] = $args;
    const consoleProps = {
      auth,
    };

    Cypress.log({
      name: "getTenantId",
      consoleProps: () => consoleProps,
    });
    consoleProps.auth = auth;

    if (Cypress.env("C8Y_TENANT") && !auth.tenant) {
      consoleProps.env = Cypress.env("C8Y_TENANT");
      return cy.wrap(Cypress.env("C8Y_TENANT"));
    }

    return cy
      .wrap(auth, { log: false })
      .c8yclient()
      .then((c) => {
        expect(c.core.tenant).to.not.be.undefined;
        Cypress.env("C8Y_TENANT", c.core.tenant);
        return cy.wrap(c.core.tenant);
      });
  }
);

Cypress.Commands.add(
  "getSystemVersion",
  { prevSubject: "optional" },
  function (...args) {
    const $args = normalizedArgumentsWithAuth(args);
    const [auth, clientOptions] = $args;

    const consoleProps = {
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
          const versionOptions = options.filter(
            (o) => o.category === "system" && o.key === "version"
          );
          if (!_.isEmpty(versionOptions)) {
            const version = _.first(versionOptions).value;
            Cypress.env("C8Y_VERSION", version);
            return cy.wrap(version);
          }
        }
        cy.wrap(undefined);
      });
  }
);

import { normalizedArgumentsWithAuth } from "./utils";
const { _ } = Cypress;

Cypress.Commands.add(
  "createUser",
  { prevSubject: "optional" },
  function (...args) {
    const $args = normalizedArgumentsWithAuth(args);
    const [auth, userOptions, permissions, applications] = $args;
    if (!userOptions) {
      throw new Error("Missing argument. Requiring user options argument.");
    }

    const consoleProps = {
      auth,
      userOptions,
      permissions,
      applications,
    };

    Cypress.log({
      name: "createUser",
      message: userOptions.userName,
      permissions,
      consoleProps: () => consoleProps,
    });

    // use cy.wrap(auth) to pass auth from createUser to c8yclient
    // note auth might be undefined which means c8yclient will choose auth.
    return cy
      .wrap(auth, { log: false })
      .c8yclient((c) => c.user.create(userOptions))
      .then((userResponse) => {
        const userId = userResponse.body.id;
        expect(userId).to.not.be.undefined;
        if (permissions && !_.isEmpty(permissions)) {
          cy.wrap(permissions).each((permission) => {
            cy.wrap(auth, { log: false }).c8yclient([
              (c) =>
                c.core.fetch(
                  "/user/" + c.core.tenant + "/groupByName/" + permission
                ),
              (c, groupResponse) =>
                c.userGroup.addUserToGroup(
                  groupResponse.body.id,
                  userResponse.body.self
                ),
            ]);
          });
        }
        if (applications && !_.isEmpty(applications)) {
          cy.wrap(applications).each((appName) => {
            cy.wrap(auth, { log: false }).c8yclient([
              (c) => c.application.listByName(appName),
              (c, applicationResponse) => {
                expect(applicationResponse.body).to.not.be.empty;
                const apps = applicationResponse.body.map((a) => {
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
              },
            ]);
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
    const [auth, user] = $args;
    if (!user) {
      throw new Error("Missing argument. Requiring username argument.");
    }

    const consoleProps = {
      auth: auth,
    };
    Cypress.log({
      name: "deleteUser",
      message: _.isObject(user) ? user.userName : user,
      consoleProps: () => consoleProps,
    });

    return cy
      .wrap(auth, { log: false })
      .c8yclient(
        (c) => c.user.delete(_.isObject(user) ? user.userName : user),
        {
          failOnStatusCode: false,
        }
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
    const [auth] = $args;

    const consoleProps = {};
    Cypress.log({
      name: "getCurrentTenant",
      consoleProps: () => consoleProps,
    });

    consoleProps.auth = auth;
    return cy
      .wrap(auth, { log: false })
      .c8yclient((c) => c.tenant.current())
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

    const consoleProps = {};
    Cypress.log({
      name: "getTenantId",
      consoleProps: () => consoleProps,
    });
    consoleProps.auth = auth;

    if (Cypress.env("C8Y_TENANT")) {
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

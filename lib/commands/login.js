const { _ } = Cypress;
const semver = require("semver");
import { getAuthOptions, resetClient } from "./utils";

const C8yDefaultLoginOptions = {
  disableGainsight: true,
  hideCookieBanner: true,
  useSession: semver.gte(Cypress.version, "12.0.0"),

  validationFn: () => {
    cy.getCookie("XSRF-TOKEN").should("exist");
    cy.getCookie("authorization").should("exist");
  },
};

Cypress.Commands.add("login", { prevSubject: "optional" }, function (...args) {
  const auth = getAuthOptions(...args);
  expect(auth).to.not.be.undefined;

  const consoleProps = {};
  Cypress.log({
    name: "login",
    message: auth,
    consoleProps: () => consoleProps,
  });
  (Cypress.isCy(auth) ? auth : cy.wrap(auth, { log: false })).then((auth) => {
    let options = args.pop();
    if (!options || !_.isObjectLike(options)) {
      options = {};
    }

    if (_.isObjectLike(options)) {
      // todo: implement (better) type guard for C8yLoginOptions
      if (options.user && options.password) {
        options = C8yDefaultLoginOptions;
      } else {
        options = _.defaults(options, C8yDefaultLoginOptions);
      }
    }

    consoleProps.auth = auth;
    consoleProps.options = options;

    const loginRequest = (tenant) => {
      cy.request({
        method: "POST",
        url: `/tenant/oauth?tenant_id=${tenant}`,
        body: {
          grant_type: "PASSWORD",
          username: auth.user,
          password: auth.password,
          tfa_code: undefined,
        },
        form: true,
      }).then((resp) => {
        expect(resp).to.have.property("headers");
      });
    };

    const tenant = auth.tenant || Cypress.env("C8Y_TENANT");
    consoleProps.tenant = tenant;

    if (options.useSession === true) {
      cy.session(
        auth.user,
        () => {
          loginRequest(tenant);
        },
        {
          validate() {
            options.validationFn();
            Cypress.env("C8Y_LOGGED_IN_USER", auth.user);
            Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", auth.userAlias);
          },
          cacheAcrossSpecs: true,
        }
      );
    } else {
      loginRequest(tenant);
      options.validationFn();
      Cypress.env("C8Y_LOGGED_IN_USER", auth.user);
      Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", auth.userAlias);
    }

    resetClient();
  });
  cy.wrap(auth, { log: false });
});

Cypress.Commands.add(
  "getAuth",
  { prevSubject: "optional" },
  function (...args) {
    const auth = getAuthOptions(...args);
    const consoleProps = {
      auth,
      arguments: args,
    };
    Cypress.log({
      name: "getAuth",
      message: `${auth ? auth.user : ""}`,
      consoleProps: () => consoleProps,
    });

    if (!auth) {
      throw new Error(
        `No valid C8yAuthOptions found for ${JSON.stringify(args)}.`
      );
    }

    return Cypress.isCy(auth) ? auth : cy.wrap(auth, { log: false });
  }
);

Cypress.Commands.add(
  "useAuth",
  { prevSubject: "optional" },
  function (...args) {
    const auth = getAuthOptions(...args);
    const consoleProps = {
      auth,
      arguments: args,
    };
    Cypress.log({
      name: "useAuth",
      message: `${auth ? auth.user : ""}`,
      consoleProps: () => consoleProps,
    });
    if (auth) {
      const win = cy.state("window");
      win.localStorage.setItem("__auth", JSON.stringify(auth));
    } else {
      throw new Error(
        `No valid C8yAuthOptions found for ${JSON.stringify(args)}.`
      );
    }
    resetClient();

    return Cypress.isCy(auth) ? auth : cy.wrap(auth, { log: false });
  }
);

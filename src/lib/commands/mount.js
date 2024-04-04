import { mount } from "cypress/angular";

require("./auth");
require("./c8ypact");
require("./intercept");
require("./oauthlogin");

import { C8yPactFetchClient } from "../pact/fetchclient";
import { FetchClient } from "@c8y/client";

const { getAuthOptionsFromEnv, getBaseUrlFromEnv } = require("./../utils");

Cypress.Commands.add(
  "mount",
  { prevSubject: "optional" },
  (subject, component, options) => {
    const consoleProps = {};
    const logger = Cypress.log({
      autoEnd: false,
      name: "mount",
      message: isClass(component) ? component.name : component,
      consoleProps: () => consoleProps,
    });

    const baseUrl = getBaseUrlFromEnv();
    const auth = subject || getAuthOptionsFromEnv();
    consoleProps.baseUrl = baseUrl;
    consoleProps.auth = auth || null;
    consoleProps.options = options;

    if (!baseUrl) {
      logger.end();
      const error = new Error(
        "No base URL configured. cy.mount requires a base url. For component testing use C8Y_BASEURL env variable."
      );
      error.name = "C8yPactError";
      throw error;
    }

    if (!auth || !auth.user || !auth.password) {
      logger.end();
      const error = new Error(
        "Missing authentication. cy.mount requires C8yAuthOptions with user and password."
      );
      error.name = "C8yPactError";
      throw error;
    }

    const registerFetchClient = (auth) => {
      const fetchClient = new C8yPactFetchClient({
        cypresspact: Cypress.c8ypact,
        auth,
        baseUrl,
      });
      if (options) {
        const providers = options.providers || [];
        if (!providers.some((provider) => provider.provide === FetchClient)) {
          providers.push({
            provide: FetchClient,
            useValue: fetchClient,
          });
          options.providers = providers;
          consoleProps.providers = providers;
        }
      }
    };

    consoleProps.isRecordingEnabled = Cypress.c8ypact.isRecordingEnabled();
    consoleProps.strictMocking = Cypress.c8ypact.config.strictMocking;

    return (
      Cypress.c8ypact.isRecordingEnabled() ||
      Cypress.c8ypact.config.strictMocking === false
        ? cy.oauthLogin(auth, baseUrl)
        : cy.wrap(auth)
    ).then((a) => {
      registerFetchClient(a);
      logger.end();
      return mount(component, options);
    });
  }
);

function isClass(component) {
  return (
    component &&
    typeof component === "function" &&
    !!component.prototype &&
    component.constructor != null
  );
}

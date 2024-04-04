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
    const baseUrl = getBaseUrlFromEnv();
    if (!baseUrl) {
      const error = new Error(
        "No base URL configured. Use C8Y_BASEURL env variable for component testing."
      );
      error.name = "C8yPactError";
      throw error;
    }

    const auth = subject || getAuthOptionsFromEnv();
    if (!auth) {
      const error = new Error(
        "Missing authentication. cy.mount requires C8yAuthOptions."
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
        }
      }
    };

    return (
      Cypress.c8ypact.isRecordingEnabled() ||
      Cypress.c8ypact.config.strictMocking === false
        ? cy.oauthLogin(auth, baseUrl)
        : cy.wrap(auth)
    ).then((a) => {
      registerFetchClient(a);
      return mount(component, options);
    });
  }
);

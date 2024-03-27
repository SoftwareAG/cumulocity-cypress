const { _ } = Cypress;

import { mount } from "cypress/angular";

import "./auth";
import "./c8ypact";
import "./intercept";

import { C8yPactFetchClient } from "../pact/fetchclient";
import { FetchClient } from "@c8y/client";
import { C8yAuthOptions, oauthLogin } from "./auth";

const { getAuthOptionsFromEnv } = require("./../utils");

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add(
  "mount",
  // @ts-ignore
  { prevSubject: "optional" },
  (subject: C8yAuthOptions | undefined, component: any, options: any) => {
    const registerFetchClient = (auth: C8yAuthOptions) => {
      const fetchClient = new C8yPactFetchClient({
        cypresspact: Cypress.c8ypact,
        auth,
      });
      if (options) {
        const providers = options.providers || [];
        if (
          !providers.some((provider: any) => provider.provide === FetchClient)
        ) {
          providers.push({
            provide: FetchClient,
            useValue: fetchClient,
          });
          options.providers = providers;
        }
      }
    };

    const auth = subject || getAuthOptionsFromEnv();
    return cy
      .wrap(Cypress.c8ypact.isRecordingEnabled() ? oauthLogin(auth) : auth, {
        log: false,
      })
      .then((a: C8yAuthOptions) => {
        registerFetchClient(a);

        Cypress.env("C8Y_LOGGED_IN_USER", auth.user);
        Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", auth.userAlias);

        return mount(component, options);
      });
  }
);

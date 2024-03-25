const { _ } = Cypress;

import { mount } from "cypress/angular";

import "./auth";
import "./c8ypact";
import "./intercept";

import { C8yPactFetchClient } from "../pact/fetchclient";
import { FetchClient } from "@c8y/client";
import { C8yAuthOptions } from "./auth";

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
  mount
);

// overwrite mount command to inject fetch client and remove previous subject from passing
// to original mount command.
Cypress.Commands.overwrite(
  "mount",
  // @ts-ignore
  (
    originalFn: typeof mount,
    subject: C8yAuthOptions | undefined,
    component: any,
    options: any
  ) => {
    if (subject && _.isObjectLike(subject)) {
      const fetchClient = new C8yPactFetchClient({
        cypresspact: Cypress.c8ypact,
        auth: subject,
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
    }
    return originalFn(component, options);
  }
);

import { mount } from "cypress/angular";

import "./auth";
import "./c8ypact";
import "./intercept";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mount a Cumulocity Angular component. When mounting the component FetchClient
       * provider will be C8yPactFetchClient to enable recording and mocking of
       * requests and responses. Set base url with C8Y_BASEURL and pass authentication
       * via cy.getAuth() or cy.useAuth().
       */
      mount: typeof mount;
    }
  }
}

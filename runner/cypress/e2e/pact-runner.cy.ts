beforeEach(() => {
  Cypress.session.clearAllSavedSessions();
});

// @ts-ignore
import * as pacts from "../fixtures/c8ypact";
Cypress.c8ypact.pactRunner.run(pacts);

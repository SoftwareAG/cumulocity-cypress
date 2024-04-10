import { C8yDefaultPact } from "cumulocity-cypress";

const { _ } = Cypress;

beforeEach(() => {
  Cypress.session.clearAllSavedSessions();
});

const pacts: string[] = Cypress.env("_pacts");
if (!pacts || !_.isArray(pacts) || _.isEmpty(pacts)) {
  throw new Error("No pact records to run.");
}

const pactObjects = pacts.map((item) => {
  return C8yDefaultPact.from(item);
});

Cypress.c8ypact.pactRunner?.run(pactObjects);

import { C8yDefaultPactRecord } from "../../../lib/pacts/c8ypact";

const { _ } = Cypress;

beforeEach(() => {
  Cypress.session.clearAllSavedSessions();
});

const pacts = Cypress.env("_pacts");
if (!pacts || !_.isArray(pacts)) {
  throw new Error("No pact records to run.");
}

const records = pacts.map((item) => {
  const pact = JSON.parse(item);
  // required to map the record object to a C8yPactRecord here as this can
  // not be done in the plugin
  pact.records = pact.records?.map((record) => {
    return new C8yDefaultPactRecord(
      record.request,
      record.response,
      record.options,
      record.auth,
      record.createdObject
    );
  });

  if (!isPact(pact)) {
    throw new Error("Invalid pact record.");
  }

  return pact;
});

console.log(records);

Cypress.c8ypact.pactRunner.run(records);

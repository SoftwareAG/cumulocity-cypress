import "cumulocity-cypress/lib/commands";
import "cumulocity-cypress/lib/commands/request";

before(() => {
  // cache tenant id in C8Y_TENANT
  cy.getAuth("admin").getTenantId({ ignorePact: true });
  cy.getAuth("admin").getSystemVersion({ ignorePact: true });
});

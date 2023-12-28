import "../commands/administration"
import "../commands/c8yclient"
import '../pacts/c8ypact'
import "../commands/request"
import "../commands/login"

before(() => {
  // cache tenant id in C8Y_TENANT
  cy.getAuth("admin").getTenantId({ ignorePact: true });
  cy.getAuth("admin").getSystemVersion({ ignorePact: true });
});

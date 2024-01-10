import { url } from "../support/util";
const { $, _ } = Cypress;

describe("general", () => {
  context("disableGainsight", () => {
    it("current tenant returns gainsightEnabled false", () => {
      cy.disableGainsight()
        .as("interception")
        .then(() => {
          // json extension required to have the correct content-type delivered into
          // the interception. without res will be string instead of object
          // might be also possible by using overrideMimeType on jqXHR object
          return $.get(url(`/tenant/currentTenant.json`));
        })
        .then((response) => {
          expect(response.customProperties.gainsightEnabled).to.eq(false);
        })
        .wait("@interception");
    });

    it("gainsight api.key request will throw exception", (done) => {
      Cypress.once("fail", (err) => {
        expect(err.message).to.eq(
          "Intercepted Gainsight API key call, but Gainsight should have been disabled. Failing..."
        );
        done();
      });

      cy.disableGainsight()
        .as("interception")
        .then(() => {
          $.get(url(`/tenant/system/options/gainsight/api.key`));
        })
    });
  });
});

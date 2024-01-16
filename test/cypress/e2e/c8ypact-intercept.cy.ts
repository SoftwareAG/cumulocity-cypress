import { SinonSpy } from "cypress/types/sinon";
import { url } from "../support/util";
import { C8yDefaultPact } from "../../../lib/pacts/c8ypact";
const { $, _ } = Cypress;

describe("c8ypactintercept", () => {
  afterEach(() => {
    // delete recorded pacts after each test
    cy.task("c8ypact:remove", Cypress.c8ypact.getCurrentTestId()).then(() => {
      C8yDefaultPact.loadCurrent().then((pact) => {
        expect(pact).to.be.null;
      });
    });
  });

  context("setup", () => {
    it("should set env variable if enabled", () => {
      expect(Cypress.env("C8Y_PACT_INTERCEPT_ENABLED")).to.be.true;
    });
  });

  context("record interceptions", () => {
    const testBody = `{ test: "test" }`;
    const testResponse = {
      body: testBody,
      statusCode: 201,
      headers: { "x-test": "test" },
    };

    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", "recording");
      cy.spy(Cypress.c8ypact, "savePact").log(false);
    });

    it("should intercept static string response", () => {
      cy.intercept("/inventory/managedObjects*", testBody)
        .as("inventory")
        .then(() => {
          return $.get(url(`/inventory/managedObjects?fragmentType=abcd`));
        })
        .then((data) => {
          expect(data).to.be.an("string");
          expect(data).to.eq(testBody);
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;
          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);
          expect(args[0].body).to.have.property("managedObjects");
          expect(args[2].modifiedResponse.body).to.eq(testBody);
          expect(args[2].modifiedResponse.status).to.eq(200);
          expect(args[2].modifiedResponse.headers).to.deep.eq({});
        })
        .then(() => {
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(1);
            const r = pact.records[0];
            expect(r.request).to.not.be.undefined;
            expect(r.response.body).to.have.property("managedObjects");
            expect(r.modifiedResponse.body).to.deep.eq(testBody);
          });
        });
    });

    it("should intercept RouteHandler object", () => {
      cy.intercept("/inventory/managedObjects*", testResponse)
        .as("inventory")
        .then(() => {
          return $.get(url(`/inventory/managedObjects?fragmentType=abcd`));
        })
        .then((data) => {
          expect(data).to.be.an("string");
          expect(data).to.eq(testBody);
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;

          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);
          expect(args[0].body).to.have.property("managedObjects");
          expect(args[2].modifiedResponse.body).to.eq(testBody);
          expect(args[2].modifiedResponse.status).to.eq(201);
          expect(args[2].modifiedResponse.headers).to.deep.eq(
            testResponse.headers
          );
        })
        .then(() => {
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(1);
            const r = pact.records[0];
            expect(r.request).to.not.be.undefined;
            expect(r.response.body).to.have.property("managedObjects");
            expect(r.modifiedResponse.body).to.deep.eq(testBody);
            expect(r.modifiedResponse.status).to.eq(201);
            expect(r.modifiedResponse.headers).to.deep.eq(testResponse.headers);
          });
        });
    });

    it("should intercept static array response", () => {
      const testBody = ["a", "b", "c"];
      cy.intercept("/inventory/managedObjects*", testBody)
        .as("inventory")
        .then(() => {
          return $.get(url(`/inventory/managedObjects?fragmentType=abcd`));
        })
        .then((data) => {
          expect(data).to.be.an("array");
          expect(data).to.deep.eq(testBody);
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;

          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);
          expect(args[0].body).to.have.property("managedObjects");
          expect(args[2].modifiedResponse.body).to.eq(testBody);
        })
        .then(() => {
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(1);
            const r = pact.records[0];
            expect(r.request).to.not.be.undefined;
            expect(r.response.body).to.have.property("managedObjects");
            expect(r.modifiedResponse.body).to.deep.eq(testBody);
          });
        });
    });

    it("should intercept without a RouteHandler", () => {
      cy.intercept("/inventory/managedObjects*")
        .as("inventory")
        .then(() => {
          return $.get(url(`/inventory/managedObjects?fragmentType=abcd`));
        })
        .then((data) => {
          expect(data).to.be.an("object");
          expect(data).to.have.property("managedObjects");
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;
          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);
          expect(args[2].modifiedResponse).to.be.undefined;
          expect(args[0].body).to.have.property("managedObjects");
        })
        .then(() => {
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(1);
            const r = pact.records[0];
            expect(r.request).to.not.be.undefined;
            expect(r.response.body).to.have.property("managedObjects");
            expect(r.modifiedResponse).to.be.undefined;
          });
        });
    });

    it("should intercept with a RouteHandler function", () => {
      cy.intercept("/inventory/managedObjects*", (req) => {
        req.reply(testResponse);
      })
        .as("inventory")
        .then(() => {
          return $.get(url(`/inventory/managedObjects?fragmentType=abcd`));
        })
        .then((data) => {
          expect(data).to.eq(testBody);
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;

          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);
          expect(args[2].modifiedResponse.body).to.eq(testBody);
          expect(args[2].modifiedResponse.status).to.eq(201);
          expect(args[2].modifiedResponse.headers).to.deep.eq(
            testResponse.headers
          );
        })
        .then(() => {
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(1);
            const r = pact.records[0];
            expect(r.request).to.not.be.undefined;
            expect(r.response.body).to.have.property("managedObjects");
            expect(r.modifiedResponse.body).to.deep.eq(testBody);
          });
        });
    });

    it("should intercept with a RouteHandler reply function and modified response", () => {
      cy.intercept("/inventory/managedObjects*", (req) => {
        req.reply(testResponse);
      })
        .as("inventory")
        .then(() => {
          return $.get(url(`/inventory/managedObjects?fragmentType=abcd`));
        })
        .then((data) => {
          expect(data).to.eq(testBody);
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;

          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);

          expect(args[0].body).to.have.property("managedObjects");
          expect(args[2].modifiedResponse.body).to.deep.eq(testBody);
          expect(args[2].modifiedResponse.status).to.eq(201);
          expect(args[2].modifiedResponse.headers).to.deep.eq(
            testResponse.headers
          );
        })
        .then(() => {
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(1);
            const r = pact.records[0];
            expect(r.request).to.not.be.undefined;
            expect(r.response.body).to.have.property("managedObjects");
            expect(r.modifiedResponse.body).to.deep.eq(testBody);
          });
        });
    });

    it("should intercept with a RouteHandler continue function and modified response", () => {
      cy.intercept("/inventory/managedObjects*", (req) => {
        req.continue((res) => {
          res.body.test = "test2";
          res.statusCode = 222;
          res.send();
        });
      })
        .as("inventory")
        .then(() => {
          return $.get(url(`/inventory/managedObjects?fragmentType=abcd`));
        })
        .then((data) => {
          expect(data).to.be.an("object");
          expect(data).to.have.property("managedObjects");
          expect(data.test).to.eq("test2");
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;
          const args = spy.getCall(0).args;
          cy.wrap(spy.getCall(0).args).then(() => {
            expect(args).to.have.length(3);
            expect(args[2].modifiedResponse.body.test).to.eq("test2");
            expect(args[2].modifiedResponse.status).to.eq(222);
          });
        })
        .then(() => {
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(1);
            const r = pact.records[0];
            expect(r.request).to.not.be.undefined;
            expect(r.response.body).to.have.property("managedObjects");
            expect(r.response.body).to.not.have.property("test");
            expect(r.modifiedResponse.body).to.have.property("managedObjects");
            expect(r.modifiedResponse.body).to.have.property("test");
            expect(r.modifiedResponse.status).to.eq(222);
          });
        });
    });
  });

  it("should intercept with RouteHandler from fixture", () => {});
});

import { SinonSpy } from "cypress/types/sinon";
import { url } from "../support/util";
import { C8yDefaultPact } from "../../../lib/pacts/c8ypact";
const { $, _ } = Cypress;

describe("c8ypactintercept", () => {
  // use inventory mock from app/inventory/manageObjects.json
  function fetchInventory() {
    return $.get(url(`/inventory/managedObjects?fragmentType=abcd`));
  }

  function expectSavePactNotCalled() {
    const spy = Cypress.c8ypact.savePact as SinonSpy;
    expect(spy).to.have.not.been.called;
  }

  afterEach(() => {
    // delete recorded pacts after each test
    cy.task("c8ypact:remove", Cypress.c8ypact.getCurrentTestId()).then(() => {
      C8yDefaultPact.loadCurrent().then((pact) => {
        expect(pact).to.be.null;
      });
    });
  });

  // NOTE!!, jquery $.get() will automatically parse the body if body is a string,
  // so it will be returned as an object. consider for assertions.
  //
  // modified responses will however use the body as sent in the interception

  context("setup", () => {
    it("should set env variable if enabled", () => {
      expect(Cypress.env("C8Y_PACT_INTERCEPT_ENABLED")).to.be.true;
    });
  });

  context("record interceptions", () => {
    const testBody = { test: "test" };
    const testResponse = {
      body: JSON.stringify(testBody),
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
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.be.an("object");
          expect(data).to.deep.eq(testBody);
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;
          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);
          expect(args[0].body).to.have.property("managedObjects");
          expect(args[2].modifiedResponse.body).to.deep.eq(testBody);
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
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.be.an("object");
          expect(data).to.deep.eq(testBody);
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;

          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);
          expect(args[0].body).to.have.property("managedObjects");
          expect(args[2].modifiedResponse.body).to.eq(testResponse.body);
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
            expect(r.modifiedResponse.body).to.eq(testResponse.body);
            expect(r.modifiedResponse.status).to.eq(201);
            expect(r.modifiedResponse.headers).to.deep.eq(testResponse.headers);
          });
        });
    });

    it("should intercept static array response", () => {
      const testBody = ["a", "b", "c"];
      cy.intercept("/inventory/managedObjects*", testBody)
        .as("inventory")
        .then(fetchInventory)
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
        .then(fetchInventory)
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
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.deep.eq(testBody);
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;

          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);
          expect(args[2].modifiedResponse.body).to.eq(testResponse.body);
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
            expect(r.modifiedResponse.body).to.eq(testResponse.body);
          });
        });
    });

    it("should intercept with a RouteHandler reply function and modified response", () => {
      cy.intercept("/inventory/managedObjects*", (req) => {
        req.reply(testResponse);
      })
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.deep.eq(testBody);
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;

          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);

          expect(args[0].body).to.have.property("managedObjects");
          expect(args[2].modifiedResponse.body).to.eq(testResponse.body);
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
            expect(r.modifiedResponse.body).to.eq(testResponse.body);
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
        .then(fetchInventory)
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

    it("should intercept with RouteHandler from fixture", () => {
      cy.intercept("/inventory/managedObjects*", {
        fixture: "c8ypact-managedObject-02.json",
      })
        .as("inventory")
        .then(() => {
          return $.get(url(`/inventory/managedObjects?fragmentType=abcd`));
        })
        .then((data) => {
          expect(data).to.be.an("object");
          expect(data).to.have.property("fixtureTest");
          expect(data).to.not.have.property("managedObjects");
        })
        .wait("@inventory")
        .then(() => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;
          const args = spy.getCall(0).args;
          expect(args).to.have.length(3);
          expect(args[2].modifiedResponse.body).to.have.property("fixtureTest");
        })
        .then(() => {
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(1);
            const r = pact.records[0];
            expect(r.request).to.not.be.undefined;
            expect(r.response.body).to.have.property("managedObjects");
            expect(r.modifiedResponse.body).to.have.property("fixtureTest");
          });
        });
    });
  });

  context("recording disabled", () => {
    const testBody = { test: "test" };
    const testResponse = {
      body: JSON.stringify(testBody),
      statusCode: 201,
      headers: { "x-test": "test" },
    };

    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", undefined);
      cy.spy(Cypress.c8ypact, "savePact").log(false);
    });

    it("should intercept but not record static string response", () => {
      cy.intercept("/inventory/managedObjects*", testBody)
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.deep.eq(testBody);
        })
        .wait("@inventory")
        .then(expectSavePactNotCalled);
    });

    it("should intercept but not record RouteHandler object", () => {
      cy.intercept("/inventory/managedObjects*", testResponse)
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          // body is not parsed by jquery as it is part of a response object
          expect(data).to.deep.eq(testResponse.body);
        })
        .wait("@inventory")
        .then(expectSavePactNotCalled);
    });

    it("should intercept but not record static array response", () => {
      const testBody = ["a", "b", "c"];
      cy.intercept("/inventory/managedObjects*", testBody)
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.deep.eq(testBody);
        })
        .wait("@inventory")
        .then(expectSavePactNotCalled);
    });

    it("should intercept but not record without a RouteHandler", () => {
      cy.intercept("/inventory/managedObjects*")
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.be.an("object");
          expect(data).to.have.property("managedObjects");
        })
        .wait("@inventory")
        .then(expectSavePactNotCalled);
    });

    it("should intercept but not record with a RouteHandler function", () => {
      cy.intercept("/inventory/managedObjects*", (req) => {
        req.reply(testResponse);
      })
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.deep.eq(testResponse.body);
        })
        .wait("@inventory")
        .then(expectSavePactNotCalled);
    });

    it("should intercept but not record with a RouteHandler reply function and modified response", () => {
      cy.intercept("/inventory/managedObjects*", (req) => {
        req.reply(testResponse);
      })
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.deep.eq(testResponse.body);
        })
        .wait("@inventory")
        .then(expectSavePactNotCalled);
    });

    it("should intercept but not record with a RouteHandler continue function and modified response", () => {
      cy.intercept("/inventory/managedObjects*", (req) => {
        req.continue((res) => {
          res.body.test = "test2";
          res.statusCode = 222;
          res.send();
        });
      })
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.be.an("object");
          expect(data).to.have.property("managedObjects");
          expect(data).to.have.property("test", "test2");
        })
        .wait("@inventory")
        .then(expectSavePactNotCalled);
    });

    it("should intercept but not record with RouteHandler from fixture", () => {
      cy.intercept("/inventory/managedObjects*", {
        fixture: "c8ypact-managedObject-02.json",
      })
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.be.an("object");
          expect(data).to.have.property("fixtureTest");
          expect(data).to.not.have.property("managedObjects");
        })
        .wait("@inventory")
        .then(expectSavePactNotCalled);
    });
  });

  context("mock interceptions", () => {
    const response: Cypress.Response<any> = {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      body: { name: "t123456789" },
      duration: 100,
      requestHeaders: { "content-type": "application/json2" },
      requestBody: { id: "abc123124" },
      allRequestResponses: [],
      isOkStatusCode: false,
      method: "PUT",
      url:
        Cypress.config().baseUrl +
        "/inventory/managedObjects?fragmentType=abcd",
    };

    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", undefined);
      cy.spy(Cypress.c8ypact, "savePact").log(false);
    });

    it("should return response from pact with static string response", () => {
      Cypress.c8ypact.current = C8yDefaultPact.from(response);
      cy.intercept("/inventory/managedObjects*", "test")
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.deep.eq(response.body);
        })
        .wait("@inventory")
        .then(expectSavePactNotCalled);
    });

    it("should return response from pact with empty response", () => {
      Cypress.c8ypact.current = C8yDefaultPact.from(response);
      cy.intercept("/inventory/managedObjects*")
        .as("inventory")
        .then(fetchInventory)
        .then((data) => {
          expect(data).to.deep.eq(response.body);
        })
        .wait("@inventory")
        .then(expectSavePactNotCalled);
    });
  });
});

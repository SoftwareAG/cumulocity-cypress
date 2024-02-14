import { C8yDefaultPact } from "@shared/c8ypact";
import { C8yPactFetchClient } from "@lib/pact/c8ypactclient";
import { BasicAuth, IFetchResponse } from "@c8y/client";

const { _ } = Cypress;

describe("c8ypact fetchclient", () => {
  beforeEach(() => {
    Cypress.env("C8Y_PACT_MODE", undefined);
  });

  afterEach(() => {
    // delete recorded pacts after each test
    cy.then(() => {
      cy.task("c8ypact:remove", Cypress.c8ypact.getCurrentTestId()).then(() => {
        Cypress.c8ypact.loadCurrent().then((pact) => {
          expect(pact).to.be.null;
        });
      });
    });
  });

  const auth = new BasicAuth({ user: "test", password: "test" });

  context("fetching", () => {
    it("should fetch if fetchStub is enabled", () => {
      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
      const spy = cy.spy(window, "fetchStub");
      client.fetch("/inventory/managedObjects?fragmentType=abcd").then(() => {
        expect(spy).to.be.calledOnce;
      });
    });

    it("should fetch if fetchStub is disabled", () => {
      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
      const fs = _.get(window, "fetchStub");
      const fetch = window.fetch;
      _.set(window, "fetch", fs);
      delete window.fetchStub;

      const spy = cy.spy(window, "fetch");
      client.fetch("/inventory/managedObjects?fragmentType=abcd").then(() => {
        expect(spy).to.be.calledOnce;
        window.fetch = fetch;
        _.set(window, "fetchStub", fs);
      });
    });
  });

  context("recording", () => {
    it("should record if enabled", () => {
      Cypress.env("C8Y_PACT_MODE", "recording");
      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
      cy.spy(client, "fetch");

      cy.wrap(client.fetch("/inventory/managedObjects?fragmentType=abcd")).then(
        () => {
          Cypress.c8ypact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(1);
            const r = pact.records[0];
            expect(r.request).to.not.be.undefined;
            expect(r.response.body).to.have.property("managedObjects");
          });
        }
      );
    });
  });

  context("mocking", () => {
    const response: Cypress.Response<any> = {
      status: 201,
      statusText: "OK",
      headers: { "content-type": "application/json1" },
      body: { name: "t123456789" },
      duration: 100,
      requestHeaders: { "content-type": "application/json2" },
      requestBody: { id: "abc123124" },
      allRequestResponses: [],
      isOkStatusCode: false,
      method: "POST",
      url:
        Cypress.config().baseUrl +
        "/inventory/managedObjects?fragmentType=abcd",
    };

    it("should return recorded response", () => {
      Cypress.env("C8Y_PACT_MODE", "mocking");
      Cypress.c8ypact.current = C8yDefaultPact.from(response, { id: "123" });

      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
      cy.wrap(client.fetch("/inventory/managedObjects?fragmentType=abcd")).then(
        // @ts-ignore
        async (response: IFetchResponse) => {
          expect(response.status).to.eq(201);
          expect(await response.json()).to.deep.eq({ name: "t123456789" });
          expect(response.headers.get("content-type")).to.eq(
            "application/json1"
          );
        }
      );
    });
  });
});

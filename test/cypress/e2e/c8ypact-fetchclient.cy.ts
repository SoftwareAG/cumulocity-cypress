import { C8yDefaultPact, C8yPact } from "../../../src/shared/c8ypact";
import { C8yPactFetchClient } from "../../../src/lib/pact/fetchclient";
import { IFetchResponse } from "@c8y/client";
import { initRequestStub, stubResponse, url } from "cypress/support/util";
import { encodeBase64 } from "../../../src/shared/c8yclient";

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

  const auth = { user: "test", password: "test", userAlias: "admin" };
  const basicAuth = `Basic ${encodeBase64(auth.user + ":" + auth.password)}`;

  context("recording", { auth }, () => {
    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", "recording");
    });

    it("should record pact objects", () => {
      const client = new C8yPactFetchClient({ cypresspact: Cypress.c8ypact });
      cy.wrap(
        client.fetch("/inventory/managedObjects?fragmentType=abcd", {
          log: false,
        })
      ).then(() => {
        Cypress.c8ypact.loadCurrent().then((pact) => {
          expect(pact.info).to.have.property(
            "baseUrl",
            Cypress.config("baseUrl")
          );

          expect(pact.records).to.have.length(1);
          const r = pact.records[0];
          expect(r.request).to.not.be.undefined;
          expect(r.request).to.have.property("method", "GET");
          expect(r.request).to.have.property(
            "url",
            new URL(
              "/inventory/managedObjects?fragmentType=abcd",
              Cypress.config("baseUrl")
            ).toString()
          );
          expect(r.response).to.not.be.undefined;
          expect(r.response).to.have.property("status", 200);
          expect(r.response).to.have.property("headers");
          expect(r.auth).to.deep.eq({
            user: auth.user,
            userAlias: "admin",
            type: "BasicAuth",
          });
          expect(r.response.body).to.have.property("managedObjects");
          expect(r.response.$body).to.not.be.undefined;
        });
      });
    });

    it("should record failing requests", () => {
      initRequestStub();
      stubResponse(
        new window.Response("Resource not found", {
          status: 404,
          statusText: "Not Found",
        })
      );

      const client = new C8yPactFetchClient({ cypresspact: Cypress.c8ypact });
      cy.wrap(
        client.fetch("/inventory/notfound").catch((failure) => {
          return failure;
        })
      ).then(() => {
        Cypress.c8ypact.loadCurrent().then((pact: C8yPact) => {
          expect(pact.records).to.have.length(1);
          expect(pact.info).to.have.property(
            "baseUrl",
            Cypress.config("baseUrl")
          );

          const r = pact.records[0];
          expect(r.request).to.not.be.undefined;
          expect(r.request).to.have.property(
            "url",
            new URL("/inventory/notfound", Cypress.config("baseUrl")).toString()
          );
          expect(r.request).to.have.property("method", "GET");
          expect(r.request).to.have.property("headers");
          expect(r.request.headers).to.have.property("Authorization");
          expect(r.response.status).to.eq(404);
          expect(r.response).to.have.property("headers");
          expect(r.response.headers).to.have.property("content-type");
          expect(r.response.statusText).to.eq("Not Found");
          expect(r.response.body).to.eq("Resource not found");
        });
      });
    });
  });

  context("mocking", { auth }, () => {
    it("should return recorded response", () => {
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
        url: url("/inventory/managedObjects?fragmentType=abcd"),
      };

      Cypress.env("C8Y_PACT_MODE", "mocking");
      Cypress.c8ypact.current = C8yDefaultPact.from(response, { id: "123" });

      const client = new C8yPactFetchClient({ cypresspact: Cypress.c8ypact });
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

    it("should return failed response", () => {
      const response: Cypress.Response<any> = {
        status: 404,
        statusText: "Not Found",
        headers: { "content-type": "application/json1" },
        body: "Resource not found",
        duration: 100,
        requestHeaders: { "content-type": "application/json2" },
        allRequestResponses: [],
        isOkStatusCode: false,
        method: "GET",
        url: url("/inventory/notfound"),
      };

      Cypress.env("C8Y_PACT_MODE", "mocking");
      Cypress.c8ypact.current = C8yDefaultPact.from(response, { id: "123" });

      const client = new C8yPactFetchClient({ cypresspact: Cypress.c8ypact });
      cy.wrap(client.fetch("/inventory/notfound")).then(
        // @ts-ignore
        async (response: IFetchResponse) => {
          expect(response.status).to.eq(404);
          expect(await response.text()).to.eq("Resource not found");
          expect(response.headers.get("content-type")).to.eq(
            "application/json1"
          );
          expect(response.statusText).to.eq("Not Found");
        }
      );
    });

    it("should return resource not found if there is no recorded response for request", (done) => {
      Cypress.env("C8Y_PACT_MODE", "mocking");

      Cypress.once("fail", (err) => {
        expect(err.name).to.eq("C8yPactError");
        expect(err.message).to.contain("Mocking failed in C8yPactFetchClient.");
        done();
      });

      const client = new C8yPactFetchClient({ cypresspact: Cypress.c8ypact });
      cy.wrap(client.fetch("/inventory/notfound"));
    });
  });
});

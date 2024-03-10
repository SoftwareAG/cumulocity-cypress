import { C8yDefaultPact } from "../../../shared/c8ypact";
import { C8yPactFetchClient } from "../../../lib/pact/c8ypactclient";
import { BasicAuth, IFetchResponse } from "@c8y/client";
import { initRequestStub, stubResponse, url } from "cypress/support/util";

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

  const creds = { user: "test", password: "test" };
  const auth = new BasicAuth(creds);
  const basicAuth = `Basic ${Buffer.from(
    creds.user + ":" + creds.password
  ).toString("base64")}`;

  context("fetch using fetchStub", () => {
    it("should fetch url and pass authentication", () => {
      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
      const spy = cy.spy(window, "fetchStub");
      client
        .fetch("/inventory/managedObjects?fragmentType=abcd")
        .then(async (response) => {
          expect(response).to.not.be.undefined;
          expect(response.status).to.eq(200);
          expect(await response.json()).to.have.property("managedObjects");

          expect(spy).to.be.calledOnce;
          expect(spy.args).to.be.an("array");
          expect(spy.args[0]).to.have.length(2);
          // should be a valid absolute URL
          expect(new URL(spy.args[0][0])).to.not.throw;
          expect(spy.args[0][0]).to.eq(
            url("/inventory/managedObjects?fragmentType=abcd")
          );
          const headers = spy.args[0][1].headers;
          expect(headers).to.deep.eq({
            Authorization: basicAuth,
            UseXBasic: true,
          });
        });
    });

    it("should fetch relative url without leading /", () => {
      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
      const spy = cy.spy(window, "fetchStub");
      client.fetch("inventory/managedObjects?fragmentType=abcd").then(() => {
        expect(spy).to.be.calledOnce;
        expect(spy.args).to.be.an("array");
        expect(spy.args[0]).to.have.length(2);
        // should be a valid absolute URL
        expect(new URL(spy.args[0][0])).to.not.throw;
        expect(spy.args[0][0]).to.eq(
          url("/inventory/managedObjects?fragmentType=abcd")
        );
      });
    });

    it("should work for failing requests", (done) => {
      initRequestStub();
      stubResponse(
        new window.Response("Resource not found", {
          status: 404,
          statusText: "Not Found",
        })
      );

      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
      client.fetch("/inventory/notfound").catch(async (response) => {
        expect(response.status).to.eq(404);
        expect(response.statusText).to.eq("Not Found");
        expect(await response.text()).to.eq("Resource not found");
        done();
      });
    });

    it("should log url, status", () => {
      const spy = cy.spy(Cypress, "log").log(false);
      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
      client.fetch("/inventory/managedObjects?fragmentType=abcd").then(() => {
        // last log is the one from fetchStub, get the last c8yclient log
        const args: any = _.findLast(
          _.flatten(spy.args),
          (arg: any) => arg.name === "c8yclient"
        );

        expect(args?.consoleProps).to.not.be.undefined;
        expect(_.isFunction(args.consoleProps)).to.be.true;
        const consoleProps = args.consoleProps.call();
        expect(consoleProps).to.have.property("Yielded");
        expect(consoleProps).to.have.property("Options");
        expect(consoleProps).to.have.property("Request");
        expect(consoleProps).to.have.property(
          "BasicAuth",
          `${basicAuth} (${creds.user})`
        );

        const renderProps = args.renderProps.call();
        expect(renderProps).to.deep.eq({
          indicator: "successful",
          message: "GET 200 /inventory/managedObjects?fragmentType=abcd",
          status: 200,
        });
      });
    });

    it.skip("should fetch if fetchStub is disabled", () => {
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
    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", "recording");
    });

    it("should record if enabled", () => {
      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
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

    it("should record failing requests", () => {
      initRequestStub();
      stubResponse(
        new window.Response("Resource not found", {
          status: 404,
          statusText: "Not Found",
        })
      );

      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
      cy.wrap(
        client.fetch("/inventory/notfound").catch((failure) => {
          return failure;
        })
      ).then(() => {
        Cypress.c8ypact.loadCurrent().then((pact) => {
          expect(pact.records).to.have.length(1);
          const r = pact.records[0];
          expect(r.request).to.not.be.undefined;
          expect(r.request).to.have.property("url");
          expect(r.request).to.have.property("method");
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

  context("mocking", () => {
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

      const client = new C8yPactFetchClient(auth, Cypress.config().baseUrl);
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
  });
});

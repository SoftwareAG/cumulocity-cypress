import {
  BasicAuth,
  Client,
  ICurrentTenant,
  IManagedObject,
  IResult,
} from "@c8y/client";
import {
  expectC8yClientRequest,
  initRequestStub,
  stubResponse,
  stubResponses,
} from "../support/util";
const { _ } = Cypress;

declare global {
  interface Window {
    fetchStub: Cypress.Agent<sinon.SinonStub>;
  }
}

describe("c8yclient", () => {
  beforeEach(() => {
    Cypress.env("C8Y_USERNAME", undefined);
    Cypress.env("C8Y_PASSWORD", undefined);
    Cypress.env("C8Y_TENANT", undefined);

    initRequestStub();
    stubResponses([
      new window.Response(JSON.stringify({ name: "t123456789" }), {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
      }),
      new window.Response("{}", {
        status: 201,
        statusText: "OK",
        headers: { "content-type": "application/json" },
      }),
      new window.Response("{}", {
        status: 202,
        statusText: "OK",
        headers: { "content-type": "application/json" },
      }),
    ]);
  });

  context("general", function () {
    it("should return client without clientFn", function () {
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t12345678" })
        .c8yclient()
        .then((client) => {
          expect(client).not.to.be.undefined;
          expect(client.core.tenant).to.equal("t12345678");
        });
    });

    it("should return client without clientFn and get current tenant", function () {
      stubResponse(
        new window.Response(JSON.stringify({ name: "t123456" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        })
      );

      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient()
        .then((client) => {
          expect(client).not.to.be.undefined;
          expect(client.core.tenant).to.equal("t123456");
        });
    });
  });

  context("response object", () => {
    it("should return cy.request response object", () => {
      // pass tenant in C8yAuthOptions or there will be 2 requests
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t1234" })
        .c8yclient<ICurrentTenant>((client) => client.tenant.current())
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.not.be.undefined;
          expect(response.body.name).to.eq("t123456789");
          expect(response.requestHeaders).to.not.be.empty;
          expect(response.headers).to.not.be.empty;
          expect(response.statusText).to.eq("OK");
          expect(response.isOkStatusCode).to.eq(true);
          expect(response.duration).to.not.be.undefined;
        });
    });
  });

  context("authentication", () => {
    const requestOptions = {
      url: `${Cypress.config().baseUrl}/tenant/currentTenant`,
      auth: { user: "admin", password: "mypassword", tenant: "t1234" },
      headers: { UseXBasic: true, "content-type": "application/json" },
    };

    it("should use auth from previous subject", () => {
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t1234" })
        .c8yclient<ICurrentTenant>((client) => client.tenant.current())
        .then((response) => {
          expect(response.status).to.eq(200);
          expectC8yClientRequest(requestOptions);
        });
    });

    it("should use wrapped auth from previous subject", () => {
      cy.wrap({ user: "admin", password: "mypassword", tenant: "t1234" })
        .c8yclient<ICurrentTenant>((client) => client.tenant.current())
        .then((response) => {
          expect(response.status).to.eq(200);
          expectC8yClientRequest(requestOptions);
        });
    });

    it("should use auth from options", () => {
      cy.c8yclient<ICurrentTenant>((client) => client.tenant.current(), {
        auth: new BasicAuth({
          user: "admin",
          password: "mypassword",
          tenant: "t1234",
        }),
      }).then((response) => {
        expect(response.status).to.eq(200);
        expectC8yClientRequest(requestOptions);
      });
    });

    it("should use client from options", () => {
      const client = new Client(
        new BasicAuth({
          user: "admin12",
          password: "password",
          tenant: "t12345",
        })
      );
      const expectedOptions = _.cloneDeep(requestOptions);
      expectedOptions.auth = {
        user: "admin12",
        password: "password",
        tenant: "t12345",
      };
      cy.c8yclient<ICurrentTenant>((client) => client.tenant.current(), {
        client,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(_.get(response.requestHeaders, "X-XSRF-TOKEN")).to.be.undefined;
        expectC8yClientRequest(expectedOptions);
      });
    });

    it("should not use basic auth if cookie auth is available", () => {
      cy.setCookie("XSRF-TOKEN", "fsETfgIBdAnEyOLbADTu22");

      const expectedOptions = _.cloneDeep(_.omit(requestOptions, "auth"));
      _.extend(expectedOptions.headers, {
        "X-XSRF-TOKEN": "fsETfgIBdAnEyOLbADTu22",
      });

      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t1234" })
        .c8yclient<ICurrentTenant>((client) => client.tenant.current())
        .then((response) => {
          expect(response.status).to.eq(200);
          // Client uses both, Basic and Cookie auth, if available
          expect(_.get(response.requestHeaders, "X-XSRF-TOKEN")).not.to.be
            .undefined;
          expect(_.get(response.requestHeaders, "Authorization")).to.be
            .undefined;

          expectC8yClientRequest(expectedOptions);
        });
    });

    it("should use cookie with undefined wrapped previous subject", () => {
      Cypress.env("C8Y_TENANT", "t1234");
      cy.setCookie("XSRF-TOKEN", "fsETfgIBdAnEyOLbADTu22");

      const expectedOptions = _.cloneDeep(_.omit(requestOptions, "auth"));
      _.extend(expectedOptions.headers, {
        "X-XSRF-TOKEN": "fsETfgIBdAnEyOLbADTu22",
      });

      cy.wrap(undefined)
        .c8yclient<ICurrentTenant>((client) => client.tenant.current())
        .then((response) => {
          expect(response.status).to.eq(200);
          // Client uses both, Basic and Cookie auth, if available
          expect(_.get(response.requestHeaders, "X-XSRF-TOKEN")).not.to.be
            .undefined;
          expect(_.get(response.requestHeaders, "Authorization")).to.be
            .undefined;

          expectC8yClientRequest(expectedOptions);
        });
    });

    it("should force basic auth if preferBasicAuth is enabled", () => {
      cy.setCookie("XSRF-TOKEN", "fsETfgIBdAnEyOLbADTu22");

      // Client uses both, Basic and Cookie auth if both are present
      // see BasicAuth.getFetchOptions()
      const expectedOptions = _.cloneDeep(requestOptions);
      _.extend(expectedOptions.headers, {
        "X-XSRF-TOKEN": "fsETfgIBdAnEyOLbADTu22",
      });

      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t1234" })
        .c8yclient<ICurrentTenant>((client) => client.tenant.current(), {
          preferBasicAuth: true,
        })
        .then((response) => {
          expect(response.status).to.eq(200);
          expectC8yClientRequest(expectedOptions);
        });
    });

    it("should use tenant from environment", () => {
      Cypress.env("C8Y_TENANT", "t1234");

      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<ICurrentTenant>((client) => {
          expect(client.core.tenant).to.equal("t1234");
          return client.tenant.current();
        })
        .then((response) => {
          expect(response.status).to.eq(200);
          expectC8yClientRequest(requestOptions);
        });
    });

    it("should use tenant from client authentication", () => {
      Cypress.env("C8Y_TENANT", undefined);

      const expectedOptions = [
        {
          url: `${Cypress.config().baseUrl}/tenant/currentTenant`,
          auth: { user: "admin", password: "mypassword" },
          headers: { UseXBasic: true, "content-type": "application/json" },
        },
        {
          url: `${Cypress.config().baseUrl}/tenant/currentTenant`,
          auth: { user: "admin", password: "mypassword" },
          headers: { UseXBasic: true, "content-type": "application/json" },
        },
      ];

      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<ICurrentTenant>((client) => {
          expect(client.core.tenant).to.eq("t123456789");
          return client.tenant.current();
        })
        .then((response) => {
          expect(response.status).to.eq(201);
          expectC8yClientRequest(expectedOptions, {});
        });
    });

    it("should use cookie auth from xsrf token without tenant", () => {
      cy.setCookie("XSRF-TOKEN", "fsETfgIBdAnEyOLbADTu");
      const expectedOptions = [
        {
          url: `${Cypress.config().baseUrl}/tenant/currentTenant`,
          headers: {
            UseXBasic: true,
            "content-type": "application/json",
            "X-XSRF-TOKEN": "fsETfgIBdAnEyOLbADTu",
          },
        },
        {
          url: `${Cypress.config().baseUrl}/tenant/currentTenant`,
          headers: {
            UseXBasic: true,
            "content-type": "application/json",
            "X-XSRF-TOKEN": "fsETfgIBdAnEyOLbADTu",
          },
        },
      ];
      cy.c8yclient<ICurrentTenant>((client) => {
        expect(client.core.tenant).to.eq("t123456789");
        return client.tenant.current();
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(_.get(response.requestHeaders, "Authorization")).to.be.undefined;
        expectC8yClientRequest(expectedOptions);
      });
    });

    it("fails with error if no auth or cookie is provided", () => {
      let errorWasThrown = false;
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("Missing authentication");
        errorWasThrown = true;
      });

      cy.c8yclient<ICurrentTenant>((client) => client.tenant.current()).then(
        () => {
          expect(window.fetchStub).to.not.have.been.called;
          expect(errorWasThrown).to.be.true;
        }
      );
    });
  });

  context("chaining of c8yclient requests", () => {
    beforeEach(() => {
      Cypress.env("C8Y_TENANT", "t123456789");
    });

    it("should recreate client instance when chaining", () => {
      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<ICurrentTenant>((c) => c.tenant.current())
        .c8yclient<IManagedObject>((c) => {
          return c.inventory.detail(1, { withChildren: false });
        })
        .then((response) => {
          expect(response.status).to.eq(201);
        });
    });

    it("should create client for chain and query current tenant", () => {
      stubResponses([
        new window.Response(JSON.stringify({ name: "t123456" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
        new window.Response("{}", {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
        new window.Response("{}", {
          status: 201,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
      ]);
      Cypress.env("C8Y_TENANT", undefined);
      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<IManagedObject>((c) => {
          expect(c.core.tenant).to.equal("t123456");
          return c.inventory.detail(1, { withChildren: false });
        })
        .c8yclient<IManagedObject>((c, response) => {
          expect(response.status).to.eq(200);
          expect(c.core.tenant).to.equal("t123456");
          return c.inventory.detail(2, { withChildren: false });
        })
        .then((response) => {
          expect(response.status).to.eq(201);
        });
    });

    it("should create client for chain with tenant from env", () => {
      stubResponses([
        new window.Response("{}", {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
        new window.Response("{}", {
          status: 201,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
      ]);
      Cypress.env("C8Y_TENANT", "t123456");
      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<IManagedObject>((c) => {
          expect(c.core.tenant).to.equal("t123456");
          return c.inventory.detail(1, { withChildren: false });
        })
        .c8yclient<IManagedObject>((c, response) => {
          expect(response.status).to.eq(200);
          expect(c.core.tenant).to.equal("t123456");
          return c.inventory.detail(2, { withChildren: false });
        })
        .then((response) => {
          expect(response.status).to.eq(201);
        });
    });

    it("should pass result of previous client request as optional argument", () => {
      Cypress.env("C8Y_TENANT", undefined);
      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient((c) => c.tenant.current())
        .c8yclient(
          (c, tenantResponse: Cypress.Response<IResult<ICurrentTenant>>) => {
            expect(tenantResponse).to.not.be.undefined;
            expect(tenantResponse.status).to.eq(201);
            return c.inventory.detail(1, { withChildren: false });
          }
        )
        .then((response) => {
          expect(response.status).to.eq(202);
        });
    });

    it("should work with array of service functions", () => {
      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient([
          (c) => c.tenant.current(),
          (c, tenantResponse) => {
            expect(tenantResponse).to.not.be.undefined;
            expect(tenantResponse.status).to.eq(200);
            return c.inventory.detail(1, { withChildren: false });
          },
        ])
        .then((response) => {
          expect(response.status).to.eq(201);
        });
    });

    it("should save client in state", () => {
      Cypress.env("C8Y_TENANT", undefined);
      stubResponses([
        new window.Response(JSON.stringify({ name: "t123456" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
        new window.Response("{}", {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
        new window.Response("{}", {
          status: 201,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
      ]);

      cy.setCookie("XSRF-TOKEN", "abcdefgh12345");
      cy.c8yclient<ICurrentTenant>((c) => c.tenant.current());
      cy.c8yclient((c) => {
        expect(c.core.tenant).to.equal("t123456");
        return c.inventory.detail(1, { withChildren: false });
      }).then((response) => {
        expect(response.status).to.eq(201);
      });
    });
  });

  context("promise array client functions", () => {
    beforeEach(() => {
      // Cypress.env("C8Y_TENANT", "t123456789");
    });

    it("should resolve array of promises from service function", () => {
      stubResponses([
        new window.Response(JSON.stringify({ name: "t123456" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
        new window.Response("{}", {
          status: 202,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
        new window.Response("{}", {
          status: 203,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
      ]);

      cy.getAuth({
        user: "admin",
        password: "mypassword",
      })
        .c8yclient((c) => [
          c.inventory.detail(1, { withChildren: false }),
          c.inventory.detail(2, { withChildren: false }),
        ])
        .then((response) => {
          expect(response).to.not.be.empty;
          expect(response).to.have.lengthOf(2);
          expect(response[0].status).to.eq(202);
          expect(response[1].status).to.eq(203);
        });
    });
  });

  context("error responses", () => {
    const error = {
      error: "userManagement/Forbidden",
      message: "authenticated user's tenant different from the one in URL path",
      info: "https://www.cumulocity.com/guides/reference/rest-implementation//#a-name-error-reporting-a-error-reporting",
    };

    beforeEach(() => {
      Cypress.env("C8Y_TENANT", "t123456789");
    });

    it("should catch and process Cumulocity error response", () => {
      stubResponse(
        new window.Response(JSON.stringify(error), {
          status: 404,
          statusText: "Not found",
          headers: { "content-type": "application/json" },
        })
      );

      let errorWasThrown = false;
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("c8yclient failed with");
        expect(err.message).to.contain('"error": "userManagement/Forbidden"');
        errorWasThrown = true;
      });

      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<ICurrentTenant>((client) => client.tenant.current())
        .then(() => {
          expect(window.fetchStub).to.have.been.calledOnce;
          expect(errorWasThrown).to.be.true;
        });
    });

    it("should catch and process generic error response", () => {
      stubResponse(
        new window.Response("Resource not found!!!", {
          status: 404,
          statusText: "Not found",
          headers: { "content-type": "application/text" },
        })
      );

      let errorWasThrown = false;
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("c8yclient failed with");
        expect(err.message).to.contain("Resource not found!!!");
        errorWasThrown = true;
      });

      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<ICurrentTenant>((client) => client.tenant.current())
        .then(() => {
          expect(window.fetchStub).to.have.been.calledOnce;
          expect(errorWasThrown).to.be.true;
        });
    });

    it("should not throw on 404 response with failOnStatusCode false", () => {
      stubResponse(
        new window.Response(JSON.stringify(error), {
          status: 404,
          statusText: "Not found",
          headers: { "content-type": "application/json" },
        })
      );

      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<ICurrentTenant>((client) => client.tenant.current(), {
          failOnStatusCode: false,
        })
        .then((response) => {
          expect(response.status).to.eq(404);
          expect(response.statusText).to.eq("Not found");
          expect(response.headers).to.deep.eq({
            "content-type": "application/json",
          });
        });
    });
  });

  context("fetch responses", () => {
    const requestOptions = {
      url: `${Cypress.config().baseUrl}/user/t123456789/groupByName/business`,
      auth: { user: "admin", password: "mypassword", tenant: "t123456789" },
      headers: { UseXBasic: true, "content-type": "application/json" },
    };
    beforeEach(() => {
      Cypress.env("C8Y_TENANT", "t123456789");
    });

    it("should return cy.request response object", () => {
      stubResponse(
        new window.Response(JSON.stringify({ name: "t123456789" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        })
      );

      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<ICurrentTenant>((c) => {
          expect(c.core.tenant).to.not.be.undefined;
          return c.core.fetch(
            "/user/" + c.core.tenant + "/groupByName/business"
          );
        })
        .then((response) => {
          expect(window.fetchStub).to.have.been.calledOnce;
          expect(response.status).to.eq(200);
          expect(response.body).to.not.be.undefined;
          expect(response.body.name).to.eq("t123456789");
          expect(response.requestHeaders).to.not.be.empty;
          expect(response.headers).to.not.be.empty;
          expect(response.statusText).to.eq("OK");
          expect(response.isOkStatusCode).to.eq(true);
          expect(response.duration).to.not.be.undefined;
          expectC8yClientRequest(requestOptions);
        });
    });
  });
});

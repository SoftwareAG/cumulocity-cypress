import {
  expectC8yClientRequest,
  initRequestStub,
  stubResponses,
} from "../support/util";
const { _, sinon } = Cypress;

declare global {
  interface Window {
    fetchStub: Cypress.Agent<sinon.SinonStub>;
  }
}

describe("administration", () => {
  beforeEach(() => {
    Cypress.env("C8Y_USERNAME", undefined);
    Cypress.env("C8Y_PASSWORD", undefined);
    Cypress.env("C8Y_TENANT", undefined);

    initRequestStub();
    stubResponses([
      new window.Response(JSON.stringify({ name: "t1234" }), {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
      }),
    ]);
  });

  context("deleteUser", () => {
    it("should delete user from user options", function () {
      stubResponses([
        new window.Response(null, {
          status: 204,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
      ]);

      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t12345678" })
        .deleteUser({ userName: "test", displayName: "wewe" })
        .then((response) => {
          expect(response.status).to.eq(204);
          expectC8yClientRequest({
            url: `${Cypress.config().baseUrl}/user/t12345678/users/test`,
            auth: {
              user: "admin",
              password: "mypassword",
              tenant: "t12345678",
            },
            headers: { UseXBasic: true, "content-type": "application/json" },
            method: "DELETE",
          });
        });
    });

    it("should use client options", function () {
      stubResponses([
        new window.Response(null, {
          status: 404,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
      ]);
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t12345678" })
        .deleteUser(
          { userName: "test", displayName: "wewe" },
          { baseUrl: "https://abc.def.com", failOnStatusCode: true }
        )
        .then((response) => {
          expect(response.status).to.eq(404);
          expectC8yClientRequest({
            url: `https://abc.def.com/user/t12345678/users/test`,
            auth: {
              user: "admin",
              password: "mypassword",
              tenant: "t12345678",
            },
            headers: { UseXBasic: true, "content-type": "application/json" },
            method: "DELETE",
          });
        });
    });

    it("throws error for missing user and logs username", (done) => {
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("Missing argument. Requiring IUser");
        expect(Cypress.log).to.be.calledWithMatch(
          sinon.match({ message: `{user: test}` })
        );
        done();
      });

      cy.spy(Cypress, "log").log(false);

      //@ts-ignore
      cy.deleteUser({ user: "test" }).then(() => {
        throw new Error("Expected error. Should not get here.");
      });
    });
  });

  context("getCurrentTenant", () => {
    it("should get current tenant using c8yclient", function () {
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t12345678" })
        .getCurrentTenant()
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.name).to.eq("t1234");
          expectC8yClientRequest({
            url: `${Cypress.config().baseUrl}/tenant/currentTenant`,
            auth: {
              user: "admin",
              password: "mypassword",
              tenant: "t12345678",
            },
            headers: { UseXBasic: true, "content-type": "application/json" },
          });
        });
    });

    it("should use client options", function () {
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t12345678" })
        .getCurrentTenant({
          baseUrl: "https://abc.def.com",
        })
        .then((response) => {
          expect(response.status).to.eq(200);
          expectC8yClientRequest({
            url: `https://abc.def.com/tenant/currentTenant`,
            auth: {
              user: "admin",
              password: "mypassword",
              tenant: "t12345678",
            },
            headers: { UseXBasic: true, "content-type": "application/json" },
          });
        });
    });
  });

  context("getTenantId", () => {
    it("should get tenant id using c8yclient", function () {
      cy.getAuth({ user: "admin", password: "mypassword" })
        .getTenantId()
        .then((id) => {
          expect(id).to.eq("t1234");
          expect(window.fetchStub.callCount).to.equal(1);
        });
    });

    it("should use tenant id from auth", function () {
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t247652" })
        .getTenantId()
        .then((id) => {
          expect(id).to.eq("t247652");
          expect(window.fetchStub.callCount).to.equal(0);
        });
    });

    it("should use tenant id from env variable", function () {
      Cypress.env("C8Y_TENANT", "t232447652");
      cy.getAuth({ user: "admin", password: "mypassword" })
        .getTenantId()
        .then((id) => {
          expect(id).to.eq("t232447652");
          expect(window.fetchStub.callCount).to.equal(0);
        });
    });

    it("should prefer tenant id from auth", function () {
      Cypress.env("C8Y_TENANT", "t232447652");
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t324678" })
        .getTenantId()
        .then((id) => {
          expect(id).to.eq("t324678");
          expect(window.fetchStub.callCount).to.equal(0);
        });
    });
  });
});

import { IUserGroup } from "@c8y/client";
import {
  expectC8yClientRequest,
  getMessageForLogSpy,
  initRequestStub,
  stubResponses,
} from "../support/testutils";
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
    Cypress.env("C8Y_PLUGIN_LOADED", undefined);

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
            headers: { UseXBasic: true },
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
            headers: { UseXBasic: true },
            method: "DELETE",
          });
        });
    });

    it("throws error for missing user and logs username", (done) => {
      const user = { user: "test" };
      const spyLog = cy.spy(Cypress, "log").log(false);
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("Missing argument. Requiring IUser");
        const message = getMessageForLogSpy(spyLog, "deleteUser");
        expect(message).to.eq(user);
        done();
      });

      //@ts-expect-error
      cy.deleteUser(user);
    });
  });

  context("clearUserRoles", () => {
    const groups = {
      references: [
        {
          group: {
            id: 1,
          },
        },
        {
          group: {
            id: 2,
          },
        },
      ],
    };

    it("should clear user roles assigned to a user", () => {
      stubResponses([
        new window.Response(
          JSON.stringify({
            groups,
          }),
          {
            status: 200,
            statusText: "OK",
          }
        ),
        new window.Response(null, {
          status: 204,
          statusText: "OK",
        }),
        new window.Response(null, {
          status: 204,
          statusText: "OK",
        }),
      ]);

      const authUser = {
        user: "admin",
        password: "mypassword",
        tenant: "t12345678",
      };
      const testUser = { userName: "test", displayName: "wewe" };

      cy.getAuth(authUser)
        .clearUserRoles(testUser)
        .then(() => {
          expectC8yClientRequest([
            {
              url: `${Cypress.config().baseUrl}/user/${
                authUser.tenant
              }/users/test`,
              auth: authUser,
              headers: { UseXBasic: true, accept: "application/json" },
            },
            {
              url: `${Cypress.config().baseUrl}/user/${
                authUser.tenant
              }/groups/${groups.references[0].group.id}/users/${
                testUser.userName
              }`,
              auth: authUser,
              headers: { UseXBasic: true, accept: "application/json" },
              method: "DELETE",
            },
            {
              url: `${Cypress.config().baseUrl}/user/${
                authUser.tenant
              }/groups/${groups.references[1].group.id}/users/${
                testUser.userName
              }`,
              auth: authUser,
              headers: { UseXBasic: true, accept: "application/json" },
              method: "DELETE",
            },
          ]);
        });
    });

    it("should clear user roles and use client options", () => {
      stubResponses([
        new window.Response(
          JSON.stringify({
            groups,
          }),
          {
            status: 200,
            statusText: "OK",
          }
        ),
        new window.Response(null, {
          status: 204,
          statusText: "OK",
        }),
        new window.Response(null, {
          status: 204,
          statusText: "OK",
        }),
      ]);

      const authUser = {
        user: "admin",
        password: "mypassword",
        tenant: "t12345678",
      };
      const testUser = { userName: "test", displayName: "wewe" };

      cy.getAuth(authUser)
        .clearUserRoles(testUser, { baseUrl: "https://abc.def.com" })
        .then(() => {
          expectC8yClientRequest([
            {
              url: `https://abc.def.com/user/${authUser.tenant}/users/test`,
              auth: authUser,
              headers: { UseXBasic: true, accept: "application/json" },
            },
            {
              url: `https://abc.def.com/user/${authUser.tenant}/groups/${groups.references[0].group.id}/users/${testUser.userName}`,
              auth: authUser,
              headers: { UseXBasic: true, accept: "application/json" },
              method: "DELETE",
            },
            {
              url: `https://abc.def.com/user/${authUser.tenant}/groups/${groups.references[1].group.id}/users/${testUser.userName}`,
              auth: authUser,
              headers: { UseXBasic: true, accept: "application/json" },
              method: "DELETE",
            },
          ]);
        });
    });
  });

  context("assignUserRoles", () => {
    const role1: Partial<IUserGroup> = {
      id: 1,
      name: "role1",
    };

    const role2: Partial<IUserGroup> = {
      id: 2,
      name: "role2",
    };

    const roles = [role1.name, role2.name];

    it("should assign roles to a user", () => {
      const authUser = {
        user: "admin",
        password: "mypassword",
        tenant: "t12345678",
      };
      const testUser = { userName: "test", displayName: "wewe" };

      stubResponses([
        new window.Response(
          JSON.stringify({
            self: `https://${Cypress.config().baseUrl}/user/${
              authUser.tenant
            }/users/${testUser.userName}`,
          }),
          {
            status: 200,
            statusText: "OK",
          }
        ),
        new window.Response(JSON.stringify(role1), {
          status: 200,
          statusText: "OK",
        }),
        new window.Response(
          JSON.stringify({
            data: {
              managedObject: {},
            },
          }),
          {
            status: 201,
            statusText: "OK",
          }
        ),
        new window.Response(JSON.stringify(role2), {
          status: 200,
          statusText: "OK",
        }),
        new window.Response(
          JSON.stringify({
            data: {
              managedObject: {},
            },
          }),
          {
            status: 201,
            statusText: "OK",
          }
        ),
      ]);

      cy.getAuth(authUser)
        .assignUserRoles(testUser, ["role1", "role2"])
        .then(() => {
          expectC8yClientRequest([
            {
              url: `${Cypress.config().baseUrl}/user/${authUser.tenant}/users/${
                testUser.userName
              }`,
              auth: authUser,
              headers: { UseXBasic: true, accept: "application/json" },
            },
            {
              url: `${Cypress.config().baseUrl}/user/${
                authUser.tenant
              }/groupByName/${role1.name}`,
              auth: authUser,
              headers: { UseXBasic: true },
            },
            {
              url: `${Cypress.config().baseUrl}/user/${
                authUser.tenant
              }/groups/${role1.id}/users`,
              auth: authUser,
              headers: {
                UseXBasic: true,
                accept: "application/json",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                user: {
                  self: `https://${Cypress.config().baseUrl}/user/${
                    authUser.tenant
                  }/users/${testUser.userName}`,
                },
              }),
              method: "POST",
            },
            {
              url: `${Cypress.config().baseUrl}/user/${
                authUser.tenant
              }/groupByName/${role2.name}`,
              auth: authUser,
              headers: { UseXBasic: true },
            },
            {
              url: `${Cypress.config().baseUrl}/user/${
                authUser.tenant
              }/groups/${role2.id}/users`,
              auth: authUser,
              headers: {
                UseXBasic: true,
                accept: "application/json",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                user: {
                  self: `https://${Cypress.config().baseUrl}/user/${
                    authUser.tenant
                  }/users/${testUser.userName}`,
                },
              }),
              method: "POST",
            },
          ]);
        });
    });

    it("should assign user roles and use client options", () => {
      cy.clearAllSessionStorage();

      const baseUrl = "https://abc.def.com";
      const authUser = {
        user: "admin",
        password: "mypassword",
        tenant: "t987654",
      };
      const testUser = { userName: "test", displayName: "wewe" };

      stubResponses([
        new window.Response(
          JSON.stringify({
            self: `https://${baseUrl}/user/${authUser.tenant}/users/${testUser.userName}`,
          }),
          {
            status: 200,
            statusText: "OK",
          }
        ),
        new window.Response(JSON.stringify(role1), {
          status: 200,
          statusText: "OK",
        }),
        new window.Response(
          JSON.stringify({
            data: {
              managedObject: {},
            },
          }),
          {
            status: 201,
            statusText: "OK",
          }
        ),
        new window.Response(JSON.stringify(role2), {
          status: 200,
          statusText: "OK",
        }),
        new window.Response(
          JSON.stringify({
            data: {
              managedObject: {},
            },
          }),
          {
            status: 201,
            statusText: "OK",
          }
        ),
      ]);

      cy.getAuth(authUser)
        .assignUserRoles(testUser, ["role1", "role2"], { baseUrl })
        .then(() => {
          expectC8yClientRequest([
            {
              url: `${baseUrl}/user/${authUser.tenant}/users/${testUser.userName}`,
              auth: authUser,
              headers: { UseXBasic: true, accept: "application/json" },
            },
            {
              url: `${baseUrl}/user/${authUser.tenant}/groupByName/${role1.name}`,
              auth: authUser,
              headers: { UseXBasic: true },
            },
            {
              url: `${baseUrl}/user/${authUser.tenant}/groups/${role1.id}/users`,
              auth: authUser,
              headers: {
                UseXBasic: true,
                accept: "application/json",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                user: {
                  self: `https://${baseUrl}/user/${authUser.tenant}/users/${testUser.userName}`,
                },
              }),
              method: "POST",
            },
            {
              url: `${baseUrl}/user/${authUser.tenant}/groupByName/${role2.name}`,
              auth: authUser,
              headers: { UseXBasic: true },
            },
            {
              url: `${baseUrl}/user/${authUser.tenant}/groups/${role2.id}/users`,
              auth: authUser,
              headers: {
                UseXBasic: true,
                accept: "application/json",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                user: {
                  self: `https://${baseUrl}/user/${authUser.tenant}/users/${testUser.userName}`,
                },
              }),
              method: "POST",
            },
          ]);
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
            headers: { UseXBasic: true },
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
            headers: { UseXBasic: true },
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

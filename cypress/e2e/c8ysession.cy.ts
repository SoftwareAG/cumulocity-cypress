import { IManagedObject } from "@c8y/client";
import {
  expectC8yClientRequest,
  initRequestStub,
  resetC8yClientRequestStub,
  stubResponses,
  url,
} from "../support/util";
const { _ } = Cypress;

describe("c8ysession", () => {
  beforeEach(() => {
    initRequestStub();
    Cypress.env("C8Y_TENANT", "t123456789");
  });

  context("captures post requests in session", () => {
    const managedObject = {
      creationTime: "2017-12-12T22:09:06.881+01:00",
      id: "51994",
      lastUpdated: "2018-07-19T12:01:50.731Z",
      name: "My tracking device",
      owner: "manga",
      self: url("/inventory/managedObjects/51994"),
      c8y_IsDevice: {},
    };

    it("capture requests", () => {
      const moContentType =
        "application/vnd.com.nsn.cumulocity.managedobject+json";
      stubResponses([
        new window.Response(JSON.stringify(managedObject), {
          status: 201,
          statusText: "Created",
          headers: new window.Headers({
            "content-type":
              "application/vnd.com.nsn.cumulocity.measurement+json",
          }),
        }),
        new window.Response(JSON.stringify(managedObject), {
          status: 202,
          statusText: "Created",
          headers: new window.Headers({
            "content-type": moContentType,
          }),
        }),
        new window.Response(JSON.stringify(managedObject), {
          status: 203,
          statusText: "Created",
          headers: new window.Headers({
            "content-type": moContentType,
          }),
        }),
        new window.Response(null, {
          status: 204,
          statusText: "Deleted",
        }),
        new window.Response(null, {
          status: 204,
          statusText: "Deleted",
        }),
      ]);
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "t12344321" })
        .c8yclient<IManagedObject>(
          [
            (client, undefined, id = "abc") => client.measurement.create({ name: "Test" }),
            (client) => client.inventory.create({ name: "My tracking device" }),
            (client) => client.inventory.create({ name: "My tracking device" }),
          ],
          {
            failOnStatusCode: false,
            session: "inventory",
          }
        )
        .then((response) => {
          expect(response.status).to.eq(203);
          expect(response.statusText).to.eq("Created");
          expect(response.headers).to.deep.eq({
            "content-type": moContentType,
          });
        });

      cy.c8ysession("inventory").then((session) => {
        expect(session.objects("measurement")).to.have.length(1);
        expect(session.objects(moContentType)).to.have.length(2);
        expect(session.objects("/inventory/managedObjects")).to.have.length(2);

        resetC8yClientRequestStub();

        session.teardown().then((success) => {
          expect(success).to.be.true;

          expectC8yClientRequest([
            {
              url: url(`/inventory/managedObjects/51994`),
              auth: {
                user: "admin",
                password: "mypassword",
                tenant: "t12344321",
              },
              method: "DELETE",
            },
            {
              url: url(`/inventory/managedObjects/51994`),
              auth: {
                user: "admin",
                password: "mypassword",
                tenant: "t12344321",
              },
              method: "DELETE",
            },
          ]);
        });
      });
    });

    afterEach(() => {
      cy.c8ysession("inventory").then((session) => {
        session.clear();
      });
    });
  });

  context("teardown", () => {
    it("teardown deletes all created objects", () => {});
  });
});

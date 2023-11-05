import { IManagedObject } from "@c8y/client";
import { initRequestStub, stubResponses } from "../support/util";
const { _ } = Cypress;

describe("c8ysession", () => {
  beforeEach(() => {
    initRequestStub();
    Cypress.env("C8Y_TENANT", "t123456789");
  });

  context("test", () => {
    const managedObject = {
      creationTime: "2017-12-12T22:09:06.881+01:00",
      id: "51994",
      lastUpdated: "2018-07-19T12:01:50.731Z",
      name: "My tracking device",
      owner: "manga",
      self: "https://<TENANT_DOMAIN>/inventory/managedObjects/51994",
      c8y_IsDevice: {},
    };

    it("post request", () => {
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
      ]);
      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<IManagedObject>(
          [
            (client) => client.measurement.create({ name: "Test" }),
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
      });
    });

    after(() => {
      cy.c8ysession("inventory").then((session) => {
        session.log();
        session.clear();
        session.log();
      });
    });
  });
});

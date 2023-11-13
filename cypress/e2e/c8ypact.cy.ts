import { IManagedObject } from "@c8y/client";
import { initRequestStub, stubResponses } from "../support/util";

const { _ } = Cypress;

describe("c8yclient", () => {
  beforeEach(() => {
    Cypress.env("C8Y_USERNAME", undefined);
    Cypress.env("C8Y_PASSWORD", undefined);
    Cypress.env("C8Y_TENANT", undefined);

    initRequestStub();
  });

  context("c8ypact recording", function () {
    before(() => {
      Cypress.env("C8Y_PACT_MODE", "recording");
    });

    beforeEach(() => {
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

    it("should create pact identifier from test case name", function () {
      expect(Cypress.c8ypact.currentPactIdentifier()).to.equal(
        "c8yclient--c8ypact_recording--should_create_pact_identifier_from_test_case_name"
      );
    });

    it(
      "should create pact identifier from test case annotation",
      { c8ypact: "mycustom test case" },
      function () {
        expect(Cypress.c8ypact.currentPactIdentifier()).to.equal(
          "mycustom test case"
        );
      }
    );

    it("should record c8ypacts if recording is enabled in environment", function () {
      Cypress.env("C8Y_TENANT", undefined);

      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.true;
      Cypress.c8ypact.currentPacts().then((pacts) => {
        expect(pacts).to.be.null;
      });

      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<IManagedObject>((c) => {
          expect(c.core.tenant).to.equal("t123456789");
          return c.inventory.detail(1, { withChildren: false });
        })
        .c8yclient<IManagedObject>((c, response) => {
          expect(response.status).to.eq(201);
          expect(c.core.tenant).to.equal("t123456789");
          return c.inventory.detail(2, { withChildren: false });
        })
        .then((response) => {
          expect(response.status).to.eq(202);
        });

      Cypress.c8ypact.currentPacts().then((pacts) => {
        expect(pacts).to.have.length(3);
        const c8ypactFolder = `${
          Cypress.config().fixturesFolder
        }/c8ypact/${Cypress.c8ypact.currentPactIdentifier()}.json`;
        cy.readFile(c8ypactFolder);
      });
    });
  });
});

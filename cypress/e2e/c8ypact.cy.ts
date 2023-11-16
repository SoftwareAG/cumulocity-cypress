import { IManagedObject } from "@c8y/client";
import { initRequestStub, stubResponses } from "../support/util";
import { SinonSpy } from "cypress/types/sinon";

const { _ } = Cypress;

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

  context("c8ypact recording", function () {
    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", "recording");
    });

    it("recording should be enabled", function () {
      Cypress.env("C8Y_PACT_ENABLED", "true");
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.true;
    });

    it("recording should be disabled", function () {
      const isEnabled = Cypress.env("C8Y_PACT_ENABLED");
      Cypress.env("C8Y_PACT_ENABLED", "true");
      Cypress.env("C8Y_PACT_MODE", undefined);
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;
      Cypress.env("C8Y_PACT_ENABLED", isEnabled.toString());
    });

    it("recording should be disabled if plugin is disabled", function () {
      const isEnabled = Cypress.env("C8Y_PACT_ENABLED");
      Cypress.env("C8Y_PACT_ENABLED", undefined);
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;
      Cypress.env("C8Y_PACT_ENABLED", isEnabled.toString());
    });

    it("plugin should be enabled", function () {
      expect(Cypress.env("C8Y_PACT_ENABLED")).to.eq("true");
    });

    it("should create pact identifier from test case name", function () {
      expect(Cypress.c8ypact.currentPactIdentifier()).to.equal(
        "c8yclient--c8ypact_recording--should_create_pact_identifier_from_test_case_name"
      );
    });

    it(
      "should create pact identifier from test case annotation",
      { c8ypact: { id: "mycustom test case" } },
      function () {
        expect(Cypress.c8ypact.currentPactIdentifier()).to.equal(
          "mycustom test case"
        );
      }
    );

    it("should record c8ypacts if recording is enabled in environment", function () {
      Cypress.env("C8Y_TENANT", undefined);
      cy.spy(Cypress.c8ypact, "currentNextPact").log(false);

      cy.then(() => {
        expect(Cypress.c8ypact.isRecordingEnabled()).to.be.true;
      });
      Cypress.c8ypact.currentPacts().then((pacts) => {
        expect(pacts).to.be.null;
      });

      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<IManagedObject>((c) => {
          return c.inventory.detail(1, { withChildren: false });
        })
        .c8yclient<IManagedObject>((c, response) => {
          expect(response.status).to.eq(201);
          return c.inventory.detail(2, { withChildren: false });
        })
        .then((response) => {
          expect(response.status).to.eq(202);
          // pacts are not validated when recording
          const spy = Cypress.c8ypact.currentNextPact as SinonSpy;
          expect(spy).to.not.have.been.called;
        });

      // pacts should have been written to expected folder
      Cypress.c8ypact.currentPacts().then((pacts) => {
        expect(pacts).to.have.length(2);
        cy.readFile(Cypress.c8ypact.currentPactFilename());
      });
    });
  });

  context("c8ypact matching", function () {
    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", undefined);
    });

    it("should have recording disabled", function () {
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;
    });

    it(
      "should fail for missing pact - failOnMissingPacts enabled",
      { c8ypact: { id: "non-existing-pact-id" } },

      function (done) {
        Cypress.c8ypact.failOnMissingPacts = true;

        cy.spy(Cypress.c8ypact, "currentNextPact").log(false);
        Cypress.once("fail", (err) => {
          expect(err.message).to.contain(
            "Pact non-existing-pact-id not found and Cypress.c8ypact.failOnMissingPacts is enabled."
          );
          const spy = Cypress.c8ypact.currentNextPact as SinonSpy;
          expect(spy).to.have.been.calledOnce;
          done();
        });

        cy.getAuth({
          user: "admin",
          password: "mypassword",
        }).c8yclient<IManagedObject>([
          (c) => c.inventory.detail(1, { withChildren: false }),
          (c) => c.inventory.detail(1, { withChildren: false }),
        ]);
      }
    );

    it(
      "should fail for missing pact - failOnMissingPacts disbaled",
      { c8ypact: { id: "non-existing-pact-id" } },
      function () {
        Cypress.c8ypact.failOnMissingPacts = false;

        cy.spy(Cypress.c8ypact, "currentNextPact").log(false);

        cy.getAuth({ user: "admin", password: "mypassword" })
          .c8yclient<IManagedObject>([
            (c) => c.inventory.detail(1, { withChildren: false }),
            (c) => c.inventory.detail(1, { withChildren: false }),
          ])
          .then((response) => {
            expect(response.status).to.eq(202);
            const spy = Cypress.c8ypact.currentNextPact as SinonSpy;
            expect(spy).to.have.been.calledTwice;
            // plugins must return null, do not test for undefined
            spy.getCall(0).returnValue.then((r) => {
              expect(r).to.be.null;
            });
            spy.getCall(1).returnValue.then((r) => {
              expect(r).to.be.null;
            });
          });
      }
    );

    it(
      "should match with existing pact",
      { c8ypact: { id: "fixture-c8ypact-matching" } },
      function () {
        cy.spy(Cypress.c8ypact, "currentNextPact").log(false);

        cy.getAuth({ user: "admin", password: "mypassword" })
          .c8yclient<IManagedObject>([
            (c) => c.inventory.detail(1, { withChildren: false }),
            (c) => c.inventory.detail(1, { withChildren: false }),
          ])
          .then((response) => {
            expect(response.status).to.eq(202);
            const spy = Cypress.c8ypact.currentNextPact as SinonSpy;
            expect(spy).to.have.been.calledTwice;
          });
      }
    );
  });
});

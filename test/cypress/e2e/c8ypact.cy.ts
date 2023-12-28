import { BasicAuth, Client, IManagedObject } from "@c8y/client";
import { initRequestStub, stubResponses } from "../support/util";
import { SinonSpy } from "cypress/types/sinon";
import { C8yDefaultPactRecord } from "../../../lib/pacts/c8ypact";

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

  context("C8yDefaultPactRecord", function () {
    it("from() should create C8yDefaultPactRecord from Cypress.Response", function () {
      const response: Cypress.Response<any> = {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        body: { name: "t123456789" },
        duration: 100,
        requestHeaders: { "content-type": "application/json2" },
        requestBody: { id: "abc123124" },
        allRequestResponses: [],
        isOkStatusCode: false,
        method: "PUT",
        url: "http://localhost:4200",
      };

      const pactRecord = C8yDefaultPactRecord.from(response);

      expect(pactRecord.response.status).to.equal(200);
      expect(pactRecord.response.statusText).to.equal("OK");
      expect(pactRecord.response.headers).to.deep.equal({
        "content-type": "application/json",
      });
      expect(pactRecord.response.body).to.deep.equal({ name: "t123456789" });
      expect(pactRecord.response.duration).to.equal(100);
      expect(pactRecord.request.url).to.equal("http://localhost:4200");
      expect(pactRecord.request.method).to.equal("PUT");
      expect(pactRecord.request.body).to.deep.equal({ id: "abc123124" });
      expect(pactRecord.request.headers).to.deep.equal({
        "content-type": "application/json2",
      });

      expect(_.has(pactRecord, "auth")).to.be.false;
      expect(_.has(pactRecord, "options")).to.be.false;
      expect(_.has(pactRecord, "createdObject")).to.be.false;
    });

    it("from() should create from cloned source objects", function () {
      // @ts-ignore
      const obj: Cypress.Response<any> = {
        body: {
          id: "12312312",
        },
      };
      const pact = C8yDefaultPactRecord.from(obj);
      obj.body.test = "test";
      // c8ymatch should not modify obj when preprocessing
      expect(obj.body.test).to.eq("test");
      expect(pact.response.body.test).to.be.undefined;
    });

    it("from() should create C8yDefaultPactRecord without optional properties if undefined", function () {
      // @ts-ignore
      let response: Cypress.Response<any> = {};
      let pactRecord = C8yDefaultPactRecord.from(response);
      expect(pactRecord.response).to.deep.equal({});
      expect(pactRecord.request).to.deep.equal({});
      expect(_.has(pactRecord, "auth")).to.be.false;
      expect(_.has(pactRecord, "options")).to.be.false;
      expect(_.has(pactRecord, "createdObject")).to.be.false;

      // @ts-ignore
      response = Cypress.Response<any> = {
        status: 200,
        requestBody: "test",
      };
      pactRecord = C8yDefaultPactRecord.from(response);
      expect(pactRecord.response).to.deep.equal({ status: 200 });
      expect(pactRecord.request).to.deep.equal({ body: "test" });
      expect(_.has(pactRecord, "auth")).to.be.false;
      expect(_.has(pactRecord, "options")).to.be.false;
      expect(_.has(pactRecord, "createdObject")).to.be.false;
    });

    it("from() should create C8yDefaultPactRecord with auth from env", function () {
      Cypress.env("C8Y_LOGGED_IN_USER", "admin");
      Cypress.env("C8Y_LOGGED_IN_USERALIAS", "alias");

      // @ts-ignore
      let response: Cypress.Response<any> = {};
      let pactRecord = C8yDefaultPactRecord.from(response);
      expect(pactRecord.auth).to.deep.equal({
        user: "admin",
        userAlias: "alias",
      });
    });

    it("from() should use C8yClient auth", function () {
      // setting env variables to ensure client auth overrides env auth
      Cypress.env("C8Y_LOGGED_IN_USER", "admin");
      Cypress.env("C8Y_LOGGED_IN_USERALIAS", "alias");
      const auth: C8yAuthentication = new BasicAuth({
        user: "admin2",
        password: "mypassword",
      });
      auth.userAlias = "alias2";
      const client: C8yClient = {
        _auth: auth,
        _client: new Client(auth),
      };
      // @ts-ignore
      let response: Cypress.Response<any> = {};
      let pactRecord = C8yDefaultPactRecord.from(response, client);
      expect(pactRecord.auth).to.deep.equal({
        user: "admin2",
        userAlias: "alias2",
        type: "BasicAuth",
      });
    });

    it("from() should create C8yDefaultPactRecord with createdObject", function () {
      // @ts-ignore
      const response: Cypress.Response<any> = {
        method: "POST",
        body: {
          id: "12312312",
        },
      };
      const pactRecord = C8yDefaultPactRecord.from(response);
      expect(pactRecord.createdObject).to.equal("12312312");
    });

    it("toCypressResponse() should create Response from record", function () {
      const response: Cypress.Response<any> = {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        body: { name: "t123456789" },
        duration: 100,
        requestHeaders: { "content-type": "application/json2" },
        requestBody: { id: "abc123124" },
        allRequestResponses: [],
        isOkStatusCode: true,
        method: "PUT",
        url: "http://localhost:4200",
      };

      const pactRecord = C8yDefaultPactRecord.from(response);
      expect(pactRecord.toCypressResponse()).to.deep.equal(response);
    });

    it("toCypressResponse() should create Response without adding defaults", function () {
      // @ts-ignore
      const response: Cypress.Response<any> = {
        statusText: "OK",
        headers: { "content-type": "application/json" },
        body: { name: "t123456789" },
        duration: 100,
        requestHeaders: { "content-type": "application/json2" },
        requestBody: { id: "abc123124" },
        method: "PUT",
        url: "http://localhost:4200",
      };

      const pactRecord = C8yDefaultPactRecord.from(response);
      expect(pactRecord.toCypressResponse()).to.deep.equal(response);
    });
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
        "c8yclient__c8ypact_recording__should_create_pact_identifier_from_test_case_name"
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
      cy.spy(Cypress.c8ypact, "currentNextRecord").log(false);

      cy.then(() => {
        expect(Cypress.c8ypact.isRecordingEnabled()).to.be.true;
      });
      Cypress.c8ypact.currentPacts().then((pact) => {
        expect(pact).to.be.null;
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
          const spy = Cypress.c8ypact.currentNextRecord as SinonSpy;
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

        cy.spy(Cypress.c8ypact, "currentNextRecord").log(false);
        Cypress.once("fail", (err) => {
          expect(err.message).to.contain(
            "non-existing-pact-id not found. Disable Cypress.c8ypact.failOnMissingPacts to ignore."
          );
          const spy = Cypress.c8ypact.currentNextRecord as SinonSpy;
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

        cy.spy(Cypress.c8ypact, "currentNextRecord").log(false);

        cy.getAuth({ user: "admin", password: "mypassword" })
          .c8yclient<IManagedObject>([
            (c) => c.inventory.detail(1, { withChildren: false }),
            (c) => c.inventory.detail(1, { withChildren: false }),
          ])
          .then((response) => {
            expect(response.status).to.eq(202);
            const spy = Cypress.c8ypact.currentNextRecord as SinonSpy;
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
        cy.spy(Cypress.c8ypact, "currentNextRecord").log(false);

        cy.getAuth({ user: "admin", password: "mypassword" })
          .c8yclient<IManagedObject>([
            (c) => c.inventory.detail(1, { withChildren: false }),
            (c) => c.inventory.detail(1, { withChildren: false }),
          ])
          .then((response) => {
            expect(response.status).to.eq(202);
            const spy = Cypress.c8ypact.currentNextRecord as SinonSpy;
            expect(spy).to.have.been.calledTwice;
          });
      }
    );
  });

  context("c8ypact preprocessing", function () {
    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", "recording");
    });

    it("should replace Authorization header and password in body", function () {
      const obj: Cypress.Response<any> = {
        status: 201,
        isOkStatusCode: true,
        statusText: "Created",
        headers: {
          "content-type":
            "application/vnd.com.nsn.cumulocity.newdevicerequest+json;charset=UTF-8;ver=0.9",
          date: "Fri, 17 Nov 2023 13:12:04 GMT",
          expires: "0",
        },
        requestHeaders: {
          Authorization: "asdasdasdasd",
          "content-type": "application/json",
          accept: "application/json",
          UseXBasic: "true",
        },
        duration: 35,
        url: "https://oee-dev.eu-latest.cumulocity.com/devicecontrol/newDeviceRequests",
        body: {
          customProperties: {},
          creationTime: "2023-11-17T13:12:03.992Z",
          status: "WAITING_FOR_CONNECTION",
          password: "abasasapksasas",
        },
        method: "POST",
        requestBody: {
          id: "abc123124",
        },
        allRequestResponses: [],
      };
      Cypress.c8ypact.preprocessor.apply(obj, {
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["requestHeaders.Authorization", "body.password"],
      });
      expect(obj.requestHeaders.Authorization).to.eq("<abcdefg>");
      expect(obj.body.password).to.eq("<abcdefg>");
    });

    it("should preprocess response when saving response", function () {
      const obfuscationPattern =
        Cypress.c8ypact.preprocessor.defaultObfuscationPattern;
      Cypress.env("C8Y_PACT_OBFUSCATE", [
        "requestHeaders.Authorization",
        "body.password",
      ]);

      stubResponses([
        new window.Response(JSON.stringify({ password: "sdqadasdadasd" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
      ]);
      cy.getAuth({
        user: "admin",
        password: "mypassword",
        tenant: "t123",
      })
        .c8yclient<IManagedObject>((c) => {
          return c.inventory.detail(1, { withChildren: false });
        })
        .then((response) => {
          expect(response.body.password).to.eq("sdqadasdadasd");
          expect(response.requestHeaders.Authorization).to.not.eq(
            obfuscationPattern
          );
        });

      Cypress.c8ypact.currentNextRecord().then(({ record }) => {
        expect(record).to.not.be.null;
        expect(_.get(record, "request.headers.Authorization")).to.eq(
          obfuscationPattern
        );
        expect(_.get(record, "response.body.password")).to.eq(
          obfuscationPattern
        );
      });
    });

    it("should not add preprocessed properties", function () {
      cy.setCookie("XSRF-TOKEN", "fsETfgIBdAnEyOLbADTu22");
      Cypress.env("C8Y_TENANT", "t1234");

      stubResponses([
        new window.Response(JSON.stringify({ test: "test" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
      ]);
      cy.c8yclient<IManagedObject>((c) => {
        return c.inventory.detail(1, { withChildren: false });
      });
      Cypress.c8ypact.currentNextRecord().then(({ record }) => {
        expect(record).to.not.be.null;
        expect(_.has(record, "request.headers.Authorization")).to.be.false;
        expect(record.response.body.password).to.be.undefined;
      });
    });
  });

  context("c8ypact validation", function () {
    it("isPactRecord validates pact object", function () {
      const pact = {
        response: {
          status: 201,
          isOkStatusCode: true,
        },
        request: {
          url: "http://localhost:8080/inventory/managedObjects/1?withChildren=false",
        },
        toCypressResponse: (obj) => {
          return true;
        },
      };
      expect(isPactRecord(pact)).to.be.true;
    });
  });
});

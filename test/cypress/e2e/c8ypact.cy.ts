import { BasicAuth, Client, IManagedObject } from "@c8y/client";
import { initRequestStub, stubResponses, url } from "../support/util";
import { SinonSpy } from "cypress/types/sinon";
import {
  C8yDefaultPact,
  C8yDefaultPactRecord,
  C8yDefaultSchemaGenerator,
  isPactError,
} from "../../../lib/pacts/c8ypact";
import { defaultClientOptions } from "../../../lib/commands/c8yclient";
import {
  C8yDefaultPactMatcher,
  C8ySchemaMatcher,
} from "../../../lib/pacts/matcher";

const { _ } = Cypress;

class AcceptAllMatcher implements C8yPactMatcher {
  schemaMatcher: C8ySchemaMatcher = new C8ySchemaMatcher();
  match(obj1: any, obj2: any): boolean {
    return true;
  }
}

describe("c8yclient", () => {
  beforeEach(() => {
    Cypress.c8ypact.strictMatching = true;

    Cypress.env("C8Y_USERNAME", undefined);
    Cypress.env("C8Y_PASSWORD", undefined);
    Cypress.env("C8Y_TENANT", undefined);
    Cypress.env("C8Y_LOGGED_IN_USER", undefined);
    Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", undefined);
    Cypress.env("C8Y_PACT_IGNORE", undefined);
    Cypress.env("C8Y_PACT_MODE", undefined);
    Cypress.env("C8Y_PACT_OBFUSCATE", undefined);

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

  afterEach(() => {
    // delete recorded pacts after each test
    cy.task("c8ypact:remove", Cypress.c8ypact.getCurrentTestId()).then(() => {
      C8yDefaultPact.loadCurrent().then((pact) => {
        expect(pact).to.be.null;
      });
    });
  });

  context("c8ypact setup", function () {
    it("Cypress.c8ypact should be initialized with defaults", function () {
      expect(Cypress.c8ypact).to.not.be.null.and.undefined;
      expect(Cypress.c8ypact.debugLog).to.be.false;
      expect(Cypress.c8ypact.failOnMissingPacts).to.be.true;
      expect(Cypress.c8ypact.strictMatching).to.be.true;
      expect(Cypress.c8ypact.current).to.be.null;

      expect(Cypress.c8ypact.getCurrentTestId).to.be.a("function");
      expect(Cypress.c8ypact.isRecordingEnabled).to.be.a("function");
      expect(Cypress.c8ypact.savePact).to.be.a("function");
      expect(Cypress.c8ypact.preprocessor).to.be.a("object");
      expect(Cypress.c8ypact.pactRunner).to.be.a("object");
      expect(Cypress.c8ypact.matcher).to.be.a("object");
      expect(Cypress.c8ypact.urlMatcher).to.be.a("object");
      expect(Cypress.c8ypact.schemaGenerator).to.be.a("object");
    });
  });

  context("C8yDefaultPact", function () {
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

    it("from() should create C8yDefaultPact from Cypress.Response", function () {
      const pact = C8yDefaultPact.from(response);
      expect(pact).to.not.be.null;
      expect(pact.records).to.have.length(1);
      expect(isPact(pact)).to.be.true;
    });

    it("from() should create C8yDefaultPact from serialized string", function () {
      const pact = C8yDefaultPact.from(response);
      const pact2 = C8yDefaultPact.from(JSON.stringify(pact));
      expect(pact2).to.not.be.undefined.and.not.be.null;
      expect(pact2.records).to.have.length(1);
      expect(isPact(pact2)).to.be.true;
    });

    it("from() should create C8yDefaultPact from C8yPact object", function () {
      const pactObject = {
        records: [
          // @ts-ignore
          C8yDefaultPactRecord.from(response),
        ],
        info: {
          baseUrl: "http://localhost:4200",
        },
        id: "test",
      };
      // @ts-ignore
      const pact = C8yDefaultPact.from(pactObject);
      expect(pact).to.not.be.null;
      expect(pact.records).to.have.length(1);
      expect(isPact(pact)).to.be.true;
    });

    // error tests for C8yDefaultPact.from()
    it("from() should throw error if invalid object", function (done) {
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("Invalid pact object.");
        done();
      });
      // @ts-ignore
      C8yDefaultPact.from({ test: "test" });
    });

    it("from() should throw error if invalid string", function (done) {
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("Invalid pact object.");
        done();
      });
      // @ts-ignore
      C8yDefaultPact.from(`{ "test": "test" }`);
    });

    it("from() should throw error when passing null", function (done) {
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain(
          "Can not create pact from null or undefined."
        );
        done();
      });
      // @ts-ignore
      C8yDefaultPact.from(null);
    });

    it("nextRecord() should return next record", function () {
      const pact = C8yDefaultPact.from(response);
      pact.records.push(C8yDefaultPactRecord.from(response));
      expect(pact.records).to.have.length(2);
      expect(pact.nextRecord()).to.not.be.null;
      expect(pact.nextRecord()).to.not.be.null;
      expect(pact.nextRecord()).to.be.null;
    });

    it("getRecordsForUrl should return records matching the passed url", function () {
      const url1 = "/service/oee-bundle/configurationmanager/2/configuration";
      const url2 =
        "/inventory/managedObjects?pageSize=10&fragmentType=isISAObject";
      const url3 = "/service/oee-bundle/configurationmanager/2/configuration";

      const pact = C8yDefaultPact.from(response);
      pact.records.push(C8yDefaultPactRecord.from(response));
      pact.records.push(C8yDefaultPactRecord.from(response));
      pact.records[0].request.url = url(url1);
      pact.records[1].request.url = url(url2);
      pact.records[2].request.url = url(url3);

      expect(pact.getRecordsForUrl(url(url1))).to.deep.eq([
        pact.records[0],
        pact.records[2],
      ]);
      expect(pact.getRecordsForUrl(url(url2))).to.deep.eq([pact.records[1]]);
      expect(pact.getRecordsForUrl(url(url3))).to.deep.eq([
        pact.records[0],
        pact.records[2],
      ]);
      expect(pact.getRecordsForUrl(url("/test"))).to.be.null;

      expect(pact.getRecordsForUrl(new URL(url(url1)))).to.deep.eq([
        pact.records[0],
        pact.records[2],
      ]);
      expect(pact.getRecordsForUrl(new URL(url(url2)))).to.deep.eq([
        pact.records[1],
      ]);
      expect(pact.getRecordsForUrl(new URL(url(url3)))).to.deep.eq([
        pact.records[0],
        pact.records[2],
      ]);
      expect(pact.getRecordsForUrl(new URL(url("/test")))).to.be.null;
    });

    it("getRecordsForUrl should allow filtering url parameters", function () {
      const url1 =
        "/measurement/measurements?valueFragmentType=OEE&withTotalPages=false&pageSize=2&dateFrom=2024-01-17T14%3A57%3A32.671Z&dateTo=2024-01-17T16%3A57%3A32.671Z&revert=true&valueFragmentSeries=3600s&source=54117556939";

      const pact = C8yDefaultPact.from(response);
      pact.records[0].request.url = url(url1);

      const url1WithoutParams =
        "/measurement/measurements?valueFragmentType=OEE&withTotalPages=false&pageSize=2&revert=true&valueFragmentSeries=3600s&source=54117556939";

      expect(pact.getRecordsForUrl(url(url1WithoutParams))).to.deep.eq([
        pact.records[0],
      ]);
    });
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
      Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", "alias");

      // @ts-ignore
      let response: Cypress.Response<any> = {};
      let pactRecord = C8yDefaultPactRecord.from(response);
      expect(pactRecord.auth).to.deep.equal({
        user: "admin",
        userAlias: "alias",
        type: "CookieAuth",
      });
    });

    it("from() should use C8yClient auth", function () {
      // setting env variables to ensure client auth overrides env auth
      Cypress.env("C8Y_LOGGED_IN_USER", "admin");
      Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", "alias");
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

    it("date() should return date from response", function () {
      // @ts-ignore
      const response: Cypress.Response<any> = {
        headers: {
          date: "Fri, 17 Nov 2023 13:12:04 GMT",
          expires: "0",
        },
      };

      const pactRecord = C8yDefaultPactRecord.from(response);
      expect(pactRecord.date()).to.deep.equal(
        new Date("Fri, 17 Nov 2023 13:12:04 GMT")
      );
    });
  });

  context("C8yDefaultSchemaGenerator", function () {
    it("should generate schema from object", async function () {
      const generator = new C8yDefaultSchemaGenerator();
      const schema = await generator.generate({
        name: "test",
      });
      expect(schema).to.deep.equal({
        $schema: "http://json-schema.org/draft-06/schema#",
        $ref: "#/definitions/Root",
        definitions: {
          Root: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: {
                type: "string",
              },
            },
            required: ["name"],
            title: "Root",
          },
        },
      });
    });

    it("should generate schema without qt- properties and with name of root object", async function () {
      const expectedSchema = {
        $schema: "http://json-schema.org/draft-06/schema#",
        $ref: "#/definitions/Body",
        definitions: {
          Body: {
            type: "object",
            additionalProperties: false,
            properties: {
              self: {
                type: "string",
                format: "uri",
              },
              managedObjects: {
                type: "array",
                items: {
                  $ref: "#/definitions/ManagedObject",
                },
              },
            },
            required: ["managedObjects", "self"],
            title: "Body",
          },
          ManagedObject: {
            type: "object",
            additionalProperties: false,
            properties: {
              self: {
                type: "string",
                format: "uri",
              },
              id: {
                type: "string",
                format: "integer",
              },
            },
            required: ["id", "self"],
            title: "ManagedObject",
          },
        },
      };
      const generator = new C8yDefaultSchemaGenerator();
      const schema = await generator.generate(
        {
          self: "https://test.com",
          managedObjects: [
            {
              self: "https://test.com",
              id: "123123",
            },
          ],
        },
        { name: "Body" }
      );
      expect(schema).to.deep.equal(expectedSchema);
    });
  });

  context("c8ypact config and environment variabless", function () {
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
      expect(Cypress.c8ypact.getCurrentTestId()).to.equal(
        "c8yclient__c8ypact_config_and_environment_variabless__should_create_pact_identifier_from_test_case_name"
      );
    });

    it(
      "should create pact identifier from test case annotation",
      { c8ypact: { id: "mycustom test case" } },
      function () {
        expect(Cypress.c8ypact.getCurrentTestId()).to.equal(
          "mycustom test case"
        );
      }
    );
  });

  context("c8ypact record and load", function () {
    beforeEach(() => {
      Cypress.env("C8Y_TENANT", undefined);
      Cypress.env("C8Y_PACT_MODE", "recording");
    });

    it("should record c8ypacts if recording is enabled in environment", function () {
      // cy.spy(Cypress.c8ypact.current, "nextRecord").log(false);

      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.true;

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
          expect(Cypress.c8ypact.current).to.be.null;
          // current pact is not required when recording
          // const spy = Cypress.c8ypact.current.nextRecord as SinonSpy;
          // expect(spy).to.not.have.been.called;
        });

      cy.then(() => {
        // pacts should have been written to expected folder
        C8yDefaultPact.loadCurrent().then((pact) => {
          expect(pact.records).to.have.length(2);
          const pactId = Cypress.c8ypact.getCurrentTestId();
          // check recorded file exists
          cy.readFile(`${Cypress.env("C8Y_PACT_FOLDER")}/${pactId}.json`);

          expect(isPactRecord(pact.records[0])).to.be.true;
          expect(pact.records[0].auth).to.deep.equal({
            user: "admin",
            type: "BasicAuth",
          });
        });
      });
    });

    it("should record options and auth with alias", function () {
      Cypress.env("admin_username", "admin");
      Cypress.env("admin_password", "mypassword");

      cy.spy(Cypress.c8ypact, "savePact").log(false);

      cy.getAuth("admin")
        .c8yclient<IManagedObject>(
          (c) => {
            return c.inventory.detail(1, { withChildren: false });
          },
          {
            failOnStatusCode: false,
            preferBasicAuth: true,
          }
        )
        .then((response) => {
          expect(response.status).to.eq(201);
          // pacts are not validated when recording
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;
          expect(spy.getCall(0).args[1]._auth).to.deep.eq({
            user: "admin",
            userAlias: "admin",
            type: "BasicAuth",
          });
          expect(spy.getCall(0).args[1]._options).to.deep.eq({
            ...defaultClientOptions,
            failOnStatusCode: false,
            preferBasicAuth: true,
          });
        });
    });

    it("should record and restore pact objects with schema", function () {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
      };

      cy.spy(Cypress.c8ypact, "savePact").log(false);

      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<IManagedObject>(
          (c) => c.inventory.detail(1, { withChildren: false }),
          {
            schema,
          }
        )
        .then((response) => {
          const spy = Cypress.c8ypact.savePact as SinonSpy;
          expect(spy).to.have.been.calledOnce;
          expect(spy.getCall(0).args[0].$body).to.deep.eq(schema);
        })
        .then(() => {
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(1);
            expect(pact.records[0].response.$body).to.deep.equal(schema);
          });
        });
    });

    it("should add schema to records when saving pact", function () {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
      };
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "test" })
        .c8yclient([
          (c) => c.inventory.detail(1, { withChildren: false }),
          (c) => c.inventory.detail(1, { withChildren: false }),
        ])
        .c8yclient((c) => c.inventory.detail(1), { schema })
        .then((response) => {
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(3);
            expect(pact.records[0].response.$body).to.not.be.null;
            expect(pact.records[1].response.$body).to.not.be.null;
            expect(pact.records[2].response.$body).to.deep.eq(schema);
          });
        });
    });

    it("should not fail if no schemaGenerator is set", function () {
      const generator = Cypress.c8ypact.schemaGenerator;
      Cypress.c8ypact.schemaGenerator = null;
      cy.getAuth({ user: "admin", password: "mypassword", tenant: "test" })
        .c8yclient([
          (c) => c.inventory.detail(1, { withChildren: false }),
          (c) => c.inventory.detail(1, { withChildren: false }),
        ])
        .then((response) => {
          Cypress.c8ypact.schemaGenerator = generator;
          C8yDefaultPact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(2);
            expect(pact.records[0].response.$body).to.be.undefined;
            expect(pact.records[1].response.$body).to.be.undefined;
          });
        });
    });
  });

  context("c8ypact matching", function () {
    const response: Cypress.Response<any> = {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      body: { name: "t123456789" },
      duration: 100,
      requestHeaders: { accept: "application/json" },
      allRequestResponses: [],
      isOkStatusCode: false,
      method: "GET",
      url:
        Cypress.config().baseUrl +
        "/inventory/managedObjects?fragmentType=abcd",
    };

    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", undefined);
      Cypress.c8ypact.matcher = new C8yDefaultPactMatcher();
    });

    it("should have recording disabled", function () {
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;
    });

    it("should use custom matcher", { auth: "admin" }, function (done) {
      Cypress.c8ypact.current = new C8yDefaultPact(
        // @ts-ignore
        [{ request: { url: "test" } }],
        {},
        "test"
      );

      Cypress.c8ypact.matcher = new AcceptAllMatcher();
      expect(Cypress.c8ypact.matcher).to.be.instanceOf(AcceptAllMatcher);
      cy.c8yclient<IManagedObject>((c) =>
        c.inventory.detail(1, { withChildren: false })
      );

      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("Pact validation failed!");
        done();
      });
      Cypress.c8ypact.matcher = new C8yDefaultPactMatcher();
      cy.c8yclient<IManagedObject>((c) =>
        c.inventory.detail(1, { withChildren: false })
      );
    });

    it(
      "should fail for missing pact - failOnMissingPacts enabled",
      { c8ypact: { id: "non-existing-pact-id" }, auth: "admin" },
      function (done) {
        Cypress.c8ypact.failOnMissingPacts = true;
        Cypress.c8ypact.current = null;

        Cypress.once("fail", (err) => {
          expect(err.message).to.contain(
            "non-existing-pact-id not found. Disable Cypress.c8ypact.failOnMissingPacts to ignore."
          );
          done();
        });

        cy.c8yclient<IManagedObject>([
          (c) => c.inventory.detail(1, { withChildren: false }),
          (c) => c.inventory.detail(1, { withChildren: false }),
        ]).then((response) => {
          expect(Cypress.c8ypact.current).to.be.null;
        });
      }
    );

    it(
      "should fail for missing pact - failOnMissingPacts disbaled",
      { c8ypact: { id: "non-existing-pact-id" }, auth: "admin" },
      function () {
        Cypress.c8ypact.failOnMissingPacts = false;
        Cypress.c8ypact.current = null;

        cy.c8yclient<IManagedObject>([
          (c) => c.inventory.detail(1, { withChildren: false }),
          (c) => c.inventory.detail(1, { withChildren: false }),
        ]).then((response) => {
          expect(response.status).to.eq(202);
          expect(Cypress.c8ypact.current).to.be.null;
        });
      }
    );

    it("should match with existing pact", function () {
      Cypress.c8ypact.matcher = new AcceptAllMatcher();
      Cypress.c8ypact.current = new C8yDefaultPact(
        // @ts-ignore
        [{ request: { url: "test" } }, { request: { url: "test2" } }],
        {},
        "test"
      );

      cy.spy(Cypress.c8ypact.current, "nextRecord").log(false);
      cy.spy(Cypress.c8ypact.matcher, "match").log(false);
      cy.getAuth({ user: "admin", password: "mypassword" })
        .c8yclient<IManagedObject>([
          (c) => c.inventory.detail(1, { withChildren: false }),
          (c) => c.inventory.detail(1, { withChildren: false }),
        ])
        .then((response) => {
          expect(response.status).to.eq(202);
          const recordSpy = Cypress.c8ypact.current.nextRecord as SinonSpy;
          expect(recordSpy).to.have.been.calledTwice;

          const matchSpy = Cypress.c8ypact.matcher.match as SinonSpy;
          expect(matchSpy).to.have.been.calledTwice;
          expect(matchSpy.getCall(0).args[1]).to.deep.eq({
            request: { url: "test" },
          });
          expect(matchSpy.getCall(1).args[1]).to.deep.eq({
            request: { url: "test2" },
          });
        });
    });

    it("should match with schema", function () {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
      };

      Cypress.env("C8Y_PACT_IGNORE", [
        "request.headers",
        "response.isOkStatusCode",
      ]);

      Cypress.c8ypact.current = C8yDefaultPact.from(response);
      Cypress.c8ypact.current.records[0].response.$body = schema;

      const matcher = Cypress.c8ypact.matcher as C8yDefaultPactMatcher;
      cy.spy(matcher.schemaMatcher, "match").log(false);

      cy.getAuth({ user: "admin", password: "mypassword", tenant: "test" })
        .c8yclient((c) => c.inventory.detail(1, { withChildren: false }))
        .then((response) => {
          const matchSpy = matcher.schemaMatcher.match as SinonSpy;
          expect(matchSpy).to.have.been.calledOnce;
          expect(matchSpy.getCall(0).args).to.deep.eq([response.body, schema]);
        });
    });

    it("should fail if schema does not match", function (done) {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "number",
          },
        },
      };

      Cypress.env("C8Y_PACT_IGNORE", [
        "request.headers",
        "response.isOkStatusCode",
      ]);

      Cypress.c8ypact.current = C8yDefaultPact.from(response);
      Cypress.c8ypact.current.records[0].response.$body = schema;

      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("Pact validation failed!");
        done();
      });

      cy.getAuth({
        user: "admin",
        password: "mypassword",
        tenant: "test",
      }).c8yclient((c) => c.inventory.detail(1, { withChildren: false }));
    });
  });

  context("c8ypact preprocessing", function () {
    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", "recording");
    });

    const cypressResponse: Partial<Cypress.Response<any>> = {
      headers: {
        date: "Fri, 17 Nov 2023 13:12:04 GMT",
        expires: "0",
      },
      requestHeaders: {
        Authorization: "asdasdasdasd",
        "content-type": "application/json",
        accept: "application/json",
        UseXBasic: "true",
      },
      body: {
        customProperties: {},
        creationTime: "2023-11-17T13:12:03.992Z",
        status: "WAITING_FOR_CONNECTION",
        password: "abasasapksasas",
      },
    };

    it("should not add any non-existing path", function () {
      const obj = _.cloneDeep(cypressResponse);
      Cypress.c8ypact.preprocessor.apply(obj, {
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["requestHeaders.MyAuthorization", "body.password2"],
      });
      expect(obj.requestHeaders.Authorization).to.eq("asdasdasdasd");
      expect(obj.body.password).to.eq("abasasapksasas");
      expect(obj.requestHeaders.MyAuthorization).to.be.undefined;
      expect(obj.body.password2).to.be.undefined;
      expect("MyAuthorization" in obj.requestHeaders).to.be.false;
      expect("password2" in obj.body).to.be.false;
    });

    it("should use env variables if no options provided", function () {
      Cypress.env("C8Y_PACT_OBFUSCATE", [
        "requestHeaders.Authorization",
        "body.password",
      ]);
      Cypress.env("C8Y_PACT_IGNORE", [
        "requestHeaders.date",
        "body.creationTime",
      ]);
      const obj = _.cloneDeep(cypressResponse);
      Cypress.c8ypact.preprocessor.apply(obj);
      expect(obj.requestHeaders.Authorization).to.eq("********");
      expect(obj.body.password).to.eq("********");
      expect(obj.requestHeaders.date).to.be.undefined;
      expect(obj.body.creationTime).to.be.undefined;
    });

    it("should use config from options over env variables", function () {
      Cypress.env("C8Y_PACT_OBFUSCATE", [
        "requestHeaders.Authorization",
        "body.password",
      ]);
      Cypress.env("C8Y_PACT_IGNORE", ["requestHeaders.accept", "body.status"]);
      const obj = _.cloneDeep(cypressResponse);
      Cypress.c8ypact.preprocessor.apply(obj, {
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["requestHeaders.Authorization", "body.password"],
        ignore: ["requestHeaders.date", "body.creationTime"],
      });
      expect(obj.requestHeaders.Authorization).to.eq("<abcdefg>");
      expect(obj.body.password).to.eq("<abcdefg>");
      expect(obj.requestHeaders.accept).to.not.be.undefined;
      expect(obj.body.status).to.not.be.undefined;
      expect(obj.requestHeaders.date).to.be.undefined;
      expect(obj.body.creationTime).to.be.undefined;
    });

    it("should preprocess Cypress.Response", function () {
      const obj = _.cloneDeep(cypressResponse);
      Cypress.c8ypact.preprocessor.apply(obj, {
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["requestHeaders.Authorization", "body.password"],
        ignore: ["requestHeaders.date", "body.creationTime"],
      });
      expect(obj.requestHeaders.Authorization).to.eq("<abcdefg>");
      expect(obj.body.password).to.eq("<abcdefg>");
      expect(obj.requestHeaders.date).to.be.undefined;
      expect(obj.body.creationTime).to.be.undefined;
    });

    it("should preprocess C8yDefaultPactRecord", function () {
      const obj = C8yDefaultPactRecord.from(_.cloneDeep(cypressResponse));
      expect(obj).to.not.be.null;
      Cypress.c8ypact.preprocessor.apply(obj, {
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["request.headers.Authorization", "response.body.password"],
        ignore: ["request.headers.date", "response.body.creationTime"],
      });
      // @ts-ignore
      expect(obj.request.headers.Authorization).to.eq("<abcdefg>");
      expect(obj.response.body.password).to.eq("<abcdefg>");
      // @ts-ignore
      expect(obj.request.headers.date).to.be.undefined;
      expect(obj.response.body.creationTime).to.be.undefined;
    });

    it("should not preprocess reserved keys", function () {
      const obj = {
        records: [C8yDefaultPactRecord.from(_.cloneDeep(cypressResponse))],
        info: {
          baseUrl: "http://localhost:8080",
        },
        id: "test",
      };
      Cypress.c8ypact.preprocessor.apply(obj, {
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["info", "id", "records"],
        ignore: ["info", "id", "records"],
      });
      expect(obj.records).to.deep.eq([
        C8yDefaultPactRecord.from(_.cloneDeep(cypressResponse)),
      ]);
      expect(obj.info).to.deep.eq({ baseUrl: "http://localhost:8080" });
      expect(obj.id).to.eq("test");
    });

    it("should preprocess C8yPact and preprocess records", function () {
      const obj = {
        records: [
          C8yDefaultPactRecord.from(_.cloneDeep(cypressResponse)),
          C8yDefaultPactRecord.from(_.cloneDeep(cypressResponse)),
          C8yDefaultPactRecord.from(_.cloneDeep(cypressResponse)),
        ],
      };
      Cypress.c8ypact.preprocessor.apply(obj, {
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["request.headers.Authorization", "response.body.password"],
        ignore: ["request.headers.date", "response.body.creationTime"],
      });
      // @ts-ignore
      expect(obj.records[0].request.headers.Authorization).to.eq("<abcdefg>");
      expect(obj.records[0].response.body.password).to.eq("<abcdefg>");
      // @ts-ignore
      expect(obj.records[1].request.headers.Authorization).to.eq("<abcdefg>");
      expect(obj.records[1].response.body.password).to.eq("<abcdefg>");
      // @ts-ignore
      expect(obj.records[2].request.headers.Authorization).to.eq("<abcdefg>");
      expect(obj.records[2].response.body.password).to.eq("<abcdefg>");
      // @ts-ignore
      expect(obj.records[0].request.headers.date).to.be.undefined;
      expect(obj.records[0].response.body.creationTime).to.be.undefined;
      // @ts-ignore
      expect(obj.records[1].request.headers.date).to.be.undefined;
      expect(obj.records[1].response.body.creationTime).to.be.undefined;
      // @ts-ignore
      expect(obj.records[2].request.headers.date).to.be.undefined;
      expect(obj.records[2].response.body.creationTime).to.be.undefined;
    });

    it("should preprocess response when saving pact", function () {
      const obfuscationPattern =
        Cypress.c8ypact.preprocessor.defaultObfuscationPattern;
      Cypress.env("C8Y_PACT_OBFUSCATE", [
        "request.headers.Authorization",
        "response.body.password",
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

      C8yDefaultPact.loadCurrent().then((pact) => {
        expect(pact.records).to.have.length(1);
        const record = pact.records[0];
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
      C8yDefaultPact.loadCurrent().then((pact) => {
        expect(pact.records).to.have.length(1);
        const record = pact.records[0];
        expect(record).to.not.be.null;
        expect(_.has(record, "request.headers.Authorization")).to.be.false;
        expect(record.response.body.password).to.be.undefined;
      });
    });
  });

  context("c8ypact typeguards", function () {
    it("isPactRecord is registered globally", function () {
      expect(global.isPactRecord).to.be.a("function");
    });

    it("isPactRecord validates undefined", function () {
      expect(isPactRecord(undefined)).to.be.false;
    });

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

    it("isPactRecord validates C8yDefaultPactRecord", function () {
      const pact = {
        response: {
          status: 201,
          isOkStatusCode: true,
        },
        request: {
          url: "http://localhost:8080/inventory/managedObjects/1?withChildren=false",
        },
      };
      const record = new C8yDefaultPactRecord(pact.request, pact.response, {});
      expect(isPactRecord(record)).to.be.true;
      expect(record.toCypressResponse()).to.not.be.null;
    });

    it("isPact validates undefined", function () {
      expect(isPact(undefined)).to.be.false;
    });

    it("isPact is registered globally", function () {
      expect(global.isPact).to.be.a("function");
    });

    it("isPact validates pact object", function () {
      const pact: C8yPact = new C8yDefaultPact(
        [
          new C8yDefaultPactRecord(
            {
              url: "http://localhost:8080/inventory/managedObjects/1?withChildren=false",
            },
            {
              status: 201,
              isOkStatusCode: true,
            },
            {},
            {}
          ),
        ],
        {
          baseUrl: "http://localhost:8080",
        },
        "test"
      );
      expect(isPact(pact)).to.be.true;
    });

    it("isPact validates records to be C8yDefaultPactRecord", function () {
      const pact: C8yPact = new C8yDefaultPact(
        [
          // @ts-ignore
          {
            response: {
              status: 201,
              isOkStatusCode: true,
            },
            request: {
              url: "http://localhost:8080/inventory/managedObjects/1?withChildren=false",
            },
          },
        ],
        {
          baseUrl: "http://localhost:8080",
        },
        "test"
      );
      expect(isPact(pact)).to.be.false;
    });

    it("isPactError validates error object with name C8yPactError", function () {
      const error = new Error("test");
      error.name = "C8yPactError";
      expect(isPactError(error)).to.be.true;
    });

    it("isPactError does not validate error with wrong name", function () {
      const error = new Error("test");
      expect(isPactError(error)).to.be.false;
    });

    it("isPactError does not validate undefined and empty", function () {
      expect(isPactError(undefined)).to.be.false;
      expect(isPactError(null)).to.be.false;
      expect(isPactError({})).to.be.false;
    });
  });
});

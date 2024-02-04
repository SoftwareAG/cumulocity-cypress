import { BasicAuth, Client, IManagedObject } from "@c8y/client";
import { initRequestStub, stubResponses, url } from "../support/util";
import {
  C8yDefaultPact,
  C8yDefaultPactRecord,
  isPactError,
} from "../../../lib/pacts/c8ypact";
import { defaultClientOptions } from "../../../lib/commands/c8yclient";
import { C8yDefaultPactMatcher } from "../../../lib/pacts/matcher";
import { C8yDefaultPactPreprocessor } from "../../../lib/pacts/preprocessor";
import { C8yQicktypeSchemaGenerator } from "../../../lib/pacts/schema";

const { _, sinon } = Cypress;

class AcceptAllMatcher implements C8yPactMatcher {
  match(obj1: any, obj2: any): boolean {
    return true;
  }
}

describe("c8ypact", () => {
  beforeEach(() => {
    Cypress.c8ypact.config.strictMatching = true;
    Cypress.c8ypact.config.ignore = false;

    Cypress.env("C8Y_USERNAME", undefined);
    Cypress.env("C8Y_PASSWORD", undefined);
    Cypress.env("C8Y_TENANT", undefined);
    Cypress.env("C8Y_LOGGED_IN_USER", undefined);
    Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", undefined);
    Cypress.env("C8Y_PACT_MODE", undefined);
    Cypress.env("C8Y_PACT_IGNORE", undefined);
    Cypress.env("C8Y_PACT_PREPROCESSOR_OBFUSCATE", undefined);
    Cypress.env("C8Y_PACT_PREPROCESSOR_PATTERN", undefined);
    Cypress.env("C8Y_PACT_PREPROCESSOR_IGNORE", undefined);

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
      Cypress.c8ypact.loadCurrent().then((pact) => {
        expect(pact).to.be.null;
      });
    });
  });

  context("c8ypact setup", function () {
    it("Cypress.c8ypact should be initialized with defaults", function () {
      expect(Cypress.c8ypact).to.not.be.null.and.undefined;
      expect(Cypress.c8ypact.debugLog).to.be.false;
      expect(Cypress.c8ypact.current).to.be.null;
      expect(Cypress.c8ypact.config).to.be.a("object");
      expect(Cypress.c8ypact.config.strictMatching).to.not.be.undefined;
      expect(Cypress.c8ypact.config.failOnMissingPacts).to.not.be.undefined;
      expect(Cypress.c8ypact.config.preprocessor).to.not.be.undefined;
      expect(Cypress.c8ypact.config.ignore).to.be.false;

      expect(Cypress.c8ypact.getCurrentTestId).to.be.a("function");
      expect(Cypress.c8ypact.isRecordingEnabled).to.be.a("function");
      expect(Cypress.c8ypact.savePact).to.be.a("function");
      expect(Cypress.c8ypact.preprocessor).to.be.a("object");
      expect(Cypress.c8ypact.pactRunner).to.be.a("object");
      expect(Cypress.c8ypact.matcher).to.be.a("object");
      expect(Cypress.c8ypact.urlMatcher).to.be.a("object");
      expect(Cypress.c8ypact.schemaGenerator).to.be.a("object");
      expect(Cypress.c8ypact.schemaMatcher).to.be.a("object");
    });

    it(
      "should use ignore annotation configured for the test",
      { c8ypact: { ignore: true } },
      function () {
        expect(Cypress.c8ypact.isEnabled()).to.be.false;
        expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;

        Cypress.env("C8Y_PACT_IGNORE", "false");
        expect(Cypress.c8ypact.isEnabled()).to.be.false;
        expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;

        Cypress.c8ypact.config.ignore = false;
        expect(Cypress.c8ypact.isEnabled()).to.be.false;
        expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;
      }
    );

    it("should work without ignore annotation configured for the test", function () {
      expect(Cypress.c8ypact.isEnabled()).to.be.true;
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;

      Cypress.env("C8Y_PACT_IGNORE", "true");
      expect(Cypress.c8ypact.isEnabled()).to.be.false;
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;
      Cypress.env("C8Y_PACT_IGNORE", undefined);

      Cypress.c8ypact.config.ignore = true;
      expect(Cypress.c8ypact.isEnabled()).to.be.false;
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;
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

    it("getRecordsMatchingRequest should return records matching the request", function () {
      const url1 = "/service/oee-bundle/configurationmanager/2/configuration";
      const url2 =
        "/inventory/managedObjects?pageSize=10&fragmentType=isISAObject";
      const url3 = "/service/oee-bundle/configurationmanager/2/configuration";

      // matching of records is based on url and method
      const pact = C8yDefaultPact.from(response);
      pact.records.push(C8yDefaultPactRecord.from(response));
      pact.records.push(C8yDefaultPactRecord.from(response));
      pact.records[0].request.url = url(url1);
      pact.records[1].request.url = url(url2);
      pact.records[2].request.url = url(url3);
      pact.records[2].request.method = "GET";

      expect(
        pact.getRecordsMatchingRequest({ url: url(url1), method: "PUT" })
      ).to.deep.eq([pact.records[0]]);
      expect(
        pact.getRecordsMatchingRequest({ url: url(url2), method: "PUT" })
      ).to.deep.eq([pact.records[1]]);
      expect(pact.getRecordsMatchingRequest({ url: url(url3) })).to.deep.eq([
        pact.records[0],
        pact.records[2],
      ]);
      expect(
        pact.getRecordsMatchingRequest({ url: url("/test"), method: "PUT" })
      ).to.be.null;
      expect(pact.getRecordsMatchingRequest({ url: url("/test") })).to.be.null;
    });

    it("getRecordsMatchingRequest should allow filtering url parameters", function () {
      const url1 =
        "/measurement/measurements?valueFragmentType=OEE&withTotalPages=false&pageSize=2&dateFrom=2024-01-17T14%3A57%3A32.671Z&dateTo=2024-01-17T16%3A57%3A32.671Z&revert=true&valueFragmentSeries=3600s&source=54117556939";

      const pact = C8yDefaultPact.from(response);
      pact.records[0].request.url = url(url1);
      pact.records[0].request.method = "GET";

      const url1WithoutParams =
        "/measurement/measurements?valueFragmentType=OEE&withTotalPages=false&pageSize=2&revert=true&valueFragmentSeries=3600s&source=54117556939";

      expect(
        pact.getRecordsMatchingRequest({ url: url(url1WithoutParams) })
      ).to.deep.eq([pact.records[0]]);
    });

    it("getRecordsMatchingRequest should not fail for undefined url", function () {
      const pact = C8yDefaultPact.from(response);
      pact.records[0].request.method = "GET";

      expect(pact.getRecordsMatchingRequest({ url: undefined })).to.be.null;
      expect(pact.getRecordsMatchingRequest({ url: null })).to.be.null;
      expect(pact.getRecordsMatchingRequest({ url: "" })).to.be.null;
      expect(pact.getRecordsMatchingRequest({ method: "GET" })).to.be.null;
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
      const generator = new C8yQicktypeSchemaGenerator();
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
      const generator = new C8yQicktypeSchemaGenerator();
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

  context("c8ypact config and environment variables", function () {
    beforeEach(() => {
      Cypress.env("C8Y_PACT_MODE", "recording");
    });

    it("recording should be enabled", function () {
      Cypress.env("C8Y_PLUGIN_LOADED", "true");
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.true;
    });

    it("recording should be disabled", function () {
      const isEnabled = Cypress.env("C8Y_PLUGIN_LOADED");
      Cypress.env("C8Y_PLUGIN_LOADED", "true");
      Cypress.env("C8Y_PACT_MODE", undefined);
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;
      Cypress.env("C8Y_PLUGIN_LOADED", isEnabled.toString());
    });

    it("recording should be disabled if plugin is disabled", function () {
      const isEnabled = Cypress.env("C8Y_PLUGIN_LOADED");
      Cypress.env("C8Y_PLUGIN_LOADED", undefined);
      expect(Cypress.c8ypact.isRecordingEnabled()).to.be.false;
      Cypress.env("C8Y_PLUGIN_LOADED", isEnabled.toString());
    });

    it("plugin should be enabled", function () {
      expect(Cypress.env("C8Y_PLUGIN_LOADED")).to.eq("true");
    });

    it("should create pact identifier from test case name", function () {
      expect(Cypress.c8ypact.getCurrentTestId()).to.equal(
        "c8ypact__c8ypact_config_and_environment_variables__should_create_pact_identifier_from_test_case_name"
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
        Cypress.c8ypact.loadCurrent().then((pact) => {
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
          const spy = Cypress.c8ypact.savePact as sinon.SinonSpy;
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
          const spy = Cypress.c8ypact.savePact as sinon.SinonSpy;
          expect(spy).to.have.been.calledOnce;
          expect(spy.getCall(0).args[0].$body).to.deep.eq(schema);
        })
        .then(() => {
          Cypress.c8ypact.loadCurrent().then((pact) => {
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
          Cypress.c8ypact.loadCurrent().then((pact) => {
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
          Cypress.c8ypact.loadCurrent().then((pact) => {
            expect(pact.records).to.have.length(2);
            expect(pact.records[0].response.$body).to.be.undefined;
            expect(pact.records[1].response.$body).to.be.undefined;
          });
        });
    });
  });

  context("c8ypact record failing last request", function () {
    // requires afterEach to check recorded pact as in Cypress.once("fail")
    // Cypress.c8ypact.loadCurrent() can not be used
    it("should record last failing request", function (done) {
      Cypress.env("C8Y_PACT_MODE", "recording");
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
          status: 409,
          statusText: "Conflict",
          headers: { "content-type": "application/json" },
        }),
      ]);

      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("c8yclient failed with: 409 (Conflict)");
        done();
      });

      const auth = { user: "admin", password: "mypassword", tenant: "test" };
      cy.getAuth(auth).c8yclient([
        (c) => c.inventory.detail(1, { withChildren: false }),
        (c) => c.inventory.detail(1, { withChildren: false }),
        (c) => c.inventory.detail(1, { withChildren: false }),
      ]);
    });

    afterEach(() => {
      Cypress.c8ypact.loadCurrent().then((pact) => {
        expect(pact.records).to.have.length(3);
        expect(pact.records[2].response.status).to.eq(409);
        expect(pact.records[2].response.statusText).to.eq("Conflict");
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
        Cypress.c8ypact.config.failOnMissingPacts = true;
        Cypress.c8ypact.current = null;

        Cypress.once("fail", (err) => {
          expect(err.message).to.contain(
            "non-existing-pact-id not found. Disable Cypress.c8ypact.config.failOnMissingPacts to ignore."
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
      "should not fail for missing pact - failOnMissingPacts disbaled",
      { c8ypact: { id: "non-existing-pact-id" }, auth: "admin" },
      function () {
        Cypress.c8ypact.config.failOnMissingPacts = false;
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
          const recordSpy = Cypress.c8ypact.current
            .nextRecord as sinon.SinonSpy;
          expect(recordSpy).to.have.been.calledTwice;

          const matchSpy = Cypress.c8ypact.matcher.match as sinon.SinonSpy;
          expect(matchSpy).to.have.been.calledTwice;
          expect(matchSpy.getCall(0).args[1]).to.deep.eq({
            request: { url: "test" },
          });
          expect(matchSpy.getCall(1).args[1]).to.deep.eq({
            request: { url: "test2" },
          });
        });
    });

    it("should match with existing pact from failing request", function (done) {
      stubResponses([
        new window.Response(JSON.stringify({ name: "t123456789" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
        new window.Response("{}", {
          status: 409,
          statusText: "Conflict",
          headers: { "content-type": "application/json" },
        }),
      ]);

      Cypress.c8ypact.matcher = new AcceptAllMatcher();
      Cypress.c8ypact.current = new C8yDefaultPact(
        // @ts-ignore
        [{ request: { url: "test" } }, { request: { url: "test2" } }],
        {},
        "test"
      );

      const recordSpy = cy.spy(Cypress.c8ypact.current, "nextRecord");
      const matchSpy = cy.spy(Cypress.c8ypact.matcher, "match");

      Cypress.once("fail", (err) => {
        // test should not fail with pact not found error, but with original error 409
        expect(err.message).to.contain("c8yclient failed with: 409 (Conflict)");
        expect(recordSpy).to.have.been.calledTwice;
        expect(matchSpy).to.have.been.calledTwice;
        done();
      });

      cy.getAuth({
        user: "admin",
        password: "mypassword",
        tenant: "t123456789",
      }).c8yclient<IManagedObject>([
        (c) => c.inventory.detail(1, { withChildren: false }),
        (c) => c.inventory.detail(1, { withChildren: false }),
      ]);
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

      const storedPreprocessor = Cypress.c8ypact.preprocessor;
      Cypress.c8ypact.preprocessor = new C8yDefaultPactPreprocessor({
        ignore: ["request.headers", "response.isOkStatusCode"],
      });

      Cypress.c8ypact.current = C8yDefaultPact.from(response);
      Cypress.c8ypact.current.records[0].response.$body = schema;

      const matcher = Cypress.c8ypact.matcher as C8yDefaultPactMatcher;
      cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);

      cy.getAuth({ user: "admin", password: "mypassword", tenant: "test" })
        .c8yclient((c) => c.inventory.detail(1, { withChildren: false }))
        .then((response) => {
          const matchSpy = Cypress.c8ypact.schemaMatcher
            .match as sinon.SinonSpy;
          expect(matchSpy).to.have.been.calledOnce;
          expect(matchSpy.getCall(0).args).to.deep.eq([response.body, schema]);
        })
        .then(() => {
          Cypress.c8ypact.preprocessor = storedPreprocessor;
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

      Cypress.env("C8Y_PACT_PREPROCESSOR_IGNORE", [
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

  context("C8yDefaultPactPreprocessor", function () {
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
      const preprocessor = new C8yDefaultPactPreprocessor({
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["requestHeaders.MyAuthorization", "body.password2"],
      });
      expect(preprocessor.getOptions().ignore).to.deep.eq([]);

      preprocessor.apply(obj);
      expect(obj.requestHeaders.Authorization).to.eq("asdasdasdasd");
      expect(obj.body.password).to.eq("abasasapksasas");
      expect(obj.requestHeaders.MyAuthorization).to.be.undefined;
      expect(obj.body.password2).to.be.undefined;
      expect("MyAuthorization" in obj.requestHeaders).to.be.false;
      expect("password2" in obj.body).to.be.false;
    });

    it("should use env variables if no options provided", function () {
      Cypress.env("C8Y_PACT_PREPROCESSOR_OBFUSCATE", [
        "requestHeaders.Authorization",
        "body.password",
      ]);
      Cypress.env("C8Y_PACT_PREPROCESSOR_IGNORE", [
        "requestHeaders.date",
        "body.creationTime",
      ]);
      const obj = _.cloneDeep(cypressResponse);
      const preprocessor = new C8yDefaultPactPreprocessor();
      expect(preprocessor.getOptions()).to.deep.eq({
        obfuscate: Cypress.env("C8Y_PACT_PREPROCESSOR_OBFUSCATE"),
        ignore: Cypress.env("C8Y_PACT_PREPROCESSOR_IGNORE"),
        obfuscationPattern:
          C8yDefaultPactPreprocessor.defaultObfuscationPattern,
      });
      preprocessor.apply(obj);

      expect(obj.requestHeaders.Authorization).to.eq("********");
      expect(obj.body.password).to.eq("********");
      expect(obj.requestHeaders.date).to.be.undefined;
      expect(obj.body.creationTime).to.be.undefined;
    });

    it("should use config from env variables over options", function () {
      Cypress.env("C8Y_PACT_PREPROCESSOR_OBFUSCATE", [
        "requestHeaders.Authorization",
        "body.password",
      ]);
      Cypress.env("C8Y_PACT_PREPROCESSOR_IGNORE", [
        "requestHeaders.date",
        "body.creationTime",
      ]);
      Cypress.env("C8Y_PACT_PREPROCESSOR_PATTERN", "xxxxxxxx");

      const obj = _.cloneDeep(cypressResponse);
      const preprocessor = new C8yDefaultPactPreprocessor({
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["body.password"],
        ignore: ["body.status"],
      });

      expect(preprocessor.getOptions()).to.deep.eq({
        obfuscate: Cypress.env("C8Y_PACT_PREPROCESSOR_OBFUSCATE"),
        ignore: Cypress.env("C8Y_PACT_PREPROCESSOR_IGNORE"),
        obfuscationPattern: Cypress.env("C8Y_PACT_PREPROCESSOR_PATTERN"),
      });
      preprocessor.apply(obj);

      expect(obj.requestHeaders.Authorization).to.eq("xxxxxxxx");
      expect(obj.body.password).to.eq("xxxxxxxx");
      expect(obj.requestHeaders.accept).to.not.be.undefined;
      expect(obj.body.status).to.not.be.undefined;
      expect(obj.requestHeaders.date).to.be.undefined;
      expect(obj.body.creationTime).to.be.undefined;
    });

    it("should preprocess Cypress.Response", function () {
      const obj = _.cloneDeep(cypressResponse);
      const preprocessor = new C8yDefaultPactPreprocessor({
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["requestHeaders.Authorization", "body.password"],
        ignore: ["requestHeaders.date", "body.creationTime"],
      });
      preprocessor.apply(obj);
      expect(obj.requestHeaders.Authorization).to.eq("<abcdefg>");
      expect(obj.body.password).to.eq("<abcdefg>");
      expect(obj.requestHeaders.date).to.be.undefined;
      expect(obj.body.creationTime).to.be.undefined;
    });

    it("should preprocess C8yDefaultPactRecord", function () {
      const obj = C8yDefaultPactRecord.from(_.cloneDeep(cypressResponse));
      expect(obj).to.not.be.null;
      const preprocessor = new C8yDefaultPactPreprocessor({
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["request.headers.Authorization", "response.body.password"],
        ignore: ["request.headers.date", "response.body.creationTime"],
      });
      preprocessor.apply(obj);
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
      const preprocessor = new C8yDefaultPactPreprocessor({
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["info", "id", "records"],
        ignore: ["info", "id", "records"],
      });
      preprocessor.apply(obj);
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
      const preprocessor = new C8yDefaultPactPreprocessor({
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["request.headers.Authorization", "response.body.password"],
        ignore: ["request.headers.date", "response.body.creationTime"],
      });
      preprocessor.apply(obj);
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
        C8yDefaultPactPreprocessor.defaultObfuscationPattern;

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

      Cypress.c8ypact.loadCurrent().then((pact) => {
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

    it("should not add preprocessed properties and store options in info", function () {
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
      }).then(() => {
        Cypress.c8ypact.loadCurrent().then((pact) => {
          expect(pact.records).to.have.length(1);
          const record = pact.records[0];
          expect(record).to.not.be.null;
          expect(_.has(record, "request.headers.Authorization")).to.be.false;
          expect(record.response.body.password).to.be.undefined;

          expect(pact.info.preprocessor).to.deep.eq(
            Cypress.c8ypact.preprocessor.getOptions()
          );
        });
      });
    });

    it("should allow overriding preprocessor options with apply options", function () {
      const obj = _.cloneDeep(cypressResponse);
      const preprocessor = new C8yDefaultPactPreprocessor({
        obfuscationPattern: "<abcdefg>",
        obfuscate: ["requestHeaders.Authorization"],
        ignore: ["requestHeaders.date", "body.creationTime"],
      });
      preprocessor.apply(obj, {
        obfuscationPattern: "test",
        obfuscate: ["body.password"],
        ignore: ["requestHeaders.UseXBasic"],
      });
      expect(obj.body.password).to.eq("test");
      expect(obj.requestHeaders.UseXBasic).to.be.undefined;
    });
  });

  context("c8ypact typeguards", function () {
    it("isPactRecord is registered globally", function () {
      expect(globalThis.isPactRecord).to.be.a("function");
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
      expect(globalThis.isPact).to.be.a("function");
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

import { C8yCypressEnvPreprocessor } from "../../../src/lib/pact/cypresspact";
import {
  C8yDefaultPactRecord,
  C8yPactRecord,
  C8yDefaultPactMatcher,
  C8yISODateStringMatcher,
  C8yPactMatcherOptions,
} from "../../../src/shared/c8ypact";

const { _, sinon } = Cypress;

describe("c8ypactmatcher", () => {
  let obj1: C8yPactRecord, obj2: C8yPactRecord;

  beforeEach(() => {
    Cypress.c8ypact.config.strictMatching = true;
    cy.fixture("c8ypact-managedobject-01.json").then((pacts) => {
      obj1 = C8yDefaultPactRecord.from(pacts[0]);
      obj2 = C8yDefaultPactRecord.from(pacts[1]);
    });
  });

  context("cy.c8ymatch", function () {
    it("should clone arguments and not preprocess source objects", function () {
      // @ts-ignore
      const obj: Cypress.Response<any> = {
        requestHeaders: {
          Authorization: "asdasdasdasd",
        },
        body: {
          password: "abasasapksasas",
        },
      };
      const pact = C8yDefaultPactRecord.from(obj);
      // c8ymatch should not modify obj when preprocessing
      cy.c8ymatch(obj, pact, { id: "123" }, { failOnPactValidation: true });
      expect(obj.requestHeaders.Authorization).to.eq("asdasdasdasd");
      expect(obj.body.password).to.eq("abasasapksasas");
    });

    it("should preprocess response before matching against contract", function (done) {
      // @ts-ignore
      const obj: Cypress.Response<any> = {
        requestHeaders: {
          Test: "testauth",
        },
        body: {
          Test: "testpassword",
        },
      };

      const pactSourceObj = _.cloneDeep(obj);
      const preprocessor = new C8yCypressEnvPreprocessor({
        obfuscationPattern: "********",
        obfuscate: ["requestHeaders.Test", "body.Test"],
      });

      preprocessor.apply(pactSourceObj);
      // preprocessor does not change source object
      expect(obj.requestHeaders.Test).to.eq("testauth");
      expect(obj.body.Test).to.eq("testpassword");

      const pact = C8yDefaultPactRecord.from(pactSourceObj);
      const obfuscationPattern = preprocessor.options.obfuscationPattern;
      // @ts-ignore
      expect(pact.request.headers.Test).to.eq(obfuscationPattern);
      expect(pact.response.body.Test).to.eq(obfuscationPattern);

      cy.c8ymatch(
        obj,
        pact,
        { preprocessor: preprocessor.resolveOptions(), id: "123" },
        { failOnPactValidation: true }
      );

      // expect to fail as obj is not obfuscated and pact has been obfuscated
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("Pact validation failed!");
        done();
      });
      cy.c8ymatch(obj, pact, { id: "123" }, { failOnPactValidation: true });
    });

    it("should match with request and response only", function () {
      cy.spy(Cypress.c8ypact.matcher, "match").log(false);
      // @ts-ignore
      const response: Cypress.Response = {
        status: 201,
        requestBody: "test",
      };
      const pact = C8yDefaultPactRecord.from(response);
      // init additional properties to test if they are ignored
      pact.createdObject = "123";
      pact.options = {
        failOnStatusCode: false,
      };
      pact.auth = {
        user: "test",
      };

      const matchKeys = ["request", "response"];
      cy.c8ymatch(
        response,
        pact,
        { id: "123" },
        { failOnPactValidation: true }
      ).then(() => {
        const spy = Cypress.c8ypact.matcher.match as sinon.SinonSpy;
        expect(spy).to.have.been.called;
        expect(Object.keys(spy.getCall(0).args[0])).to.deep.eq(matchKeys);
        expect(Object.keys(spy.getCall(0).args[1])).to.deep.eq(matchKeys);
      });
    });

    it("should throw error if response and pact do not match", function (done) {
      // @ts-ignore
      const response: Cypress.Response = {
        status: 201,
        requestBody: "test",
      };
      const pact = C8yDefaultPactRecord.from(response);
      pact.response.status = 200;

      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("Pact validation failed!");
        expect(err.name).to.eq("C8yPactError");
        done();
      });
      cy.c8ymatch(
        response,
        pact,
        { id: "123" },
        { failOnPactValidation: true }
      );
    });

    it("should not throw if response and pact do not match and failOnPactValidation is false", function () {
      // @ts-ignore
      const response: Cypress.Response = {
        status: 201,
        requestBody: "test",
      };
      const pact = C8yDefaultPactRecord.from(response);
      pact.response.status = 200;
      pact.response.body = "test2";

      cy.c8ymatch(
        response,
        pact,
        { id: "123" },
        { failOnPactValidation: false }
      );
    });

    it("should pass consoleProps", function () {
      const spy = cy.spy(Cypress.c8ypact.matcher, "match");
      // @ts-ignore
      const response: Cypress.Response = {
        status: 201,
        requestBody: "test",
      };
      const pact = C8yDefaultPactRecord.from(response);
      cy.c8ymatch(
        response,
        pact,
        { id: "123" },
        { failOnPactValidation: true }
      ).then(() => {
        expect(spy).to.have.been.called;
        expect(spy.getCall(0).args).to.have.length(3);
        const consoleProps = spy.getCall(0).args[2];
        expect(consoleProps?.loggerProps).to.be.an("object");
        expect(consoleProps?.loggerProps).to.have.property("matcher");
        expect(consoleProps?.loggerProps).to.have.property("response");
        expect(consoleProps?.loggerProps).to.have.property("pact");
      });
    });

    it("should add error props to consoleProps", function (done) {
      const spy = cy.spy(Cypress.c8ypact.matcher, "match").log(false);
      // @ts-ignore
      const response: Cypress.Response = {
        status: 201,
        requestBody: { x: { y: { z: "test" } } },
      };
      const pact = C8yDefaultPactRecord.from(response);
      pact.request.body = { x: { y: { z: "test2" } } };

      Cypress.once("fail", () => {
        expect(spy).to.have.been.called;
        expect(spy.getCall(0).args).to.have.length(3);
        const consoleProps = spy.getCall(0).args[2];
        expect(consoleProps?.loggerProps).to.be.an("object");
        expect(consoleProps?.loggerProps).to.have.property("error");
        expect(consoleProps?.loggerProps.error).to.contain(
          "Pact validation failed!"
        );
        expect(consoleProps?.loggerProps).to.have.property("key");
        expect(consoleProps?.loggerProps).to.have.property("keypath");
        expect(consoleProps?.loggerProps.keypath).to.eq(
          ["request", "body", "x", "y", "z"].join(" > ")
        );
        expect(consoleProps?.loggerProps).to.have.property("objects");
        expect(consoleProps?.loggerProps.objects).to.deep.eq([
          { z: "test" },
          { z: "test2" },
        ]);
        done();
      });
      cy.c8ymatch(
        response,
        pact,
        { id: "123" },
        { failOnPactValidation: true }
      );
    });
  });

  context("C8yDefaultPactMatcher", function () {
    it("should match cloned object", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      expect(matcher.match(obj1, pact)).to.be.true;
    });

    it("should match requestHeader with different order", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      pact.request.headers = {
        UseXBasic: true,
        accept: "application/json",
      };
      expect(matcher.match(obj1, pact)).to.be.true;
    });

    it("should match duration only as number", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      pact.response.duration = 101;
      expect(matcher.match(obj1, pact)).to.be.true;
    });

    it("should fail if duration is not a number", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      _.set(pact, "response.duration", "1212121");
      expect(() => matcher.match(obj1, pact)).to.throw(
        `Pact validation failed! Values for "response > duration" do not match.`
      );
    });

    it("should fail if ignored porperty is missing", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      delete pact.request.url;
      expect(() => matcher.match(obj1, pact)).to.throw(
        `Pact validation failed! "request > url" not found in pact object.`
      );
    });

    it("should fail if ignored porperty is missing with strictMatching disabled", function () {
      const matcher = new C8yDefaultPactMatcher();
      const obj = _.cloneDeep(obj1);
      delete obj.request.url;
      const pact = {
        response: {
          status: 201,
          isOkStatusCode: true,
        },
        request: {
          url: "http://localhost:8080/inventory/managedObjects/1?withChildren=false",
        },
      };
      expect(() =>
        matcher.match(obj, pact, { strictMatching: false })
      ).to.throw(
        `Pact validation failed! "request > url" not found in response object.`
      );
    });

    it("should match text body", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj1);
      obj.response.body = "hello world";
      pact.response.body = "hello world";
      expect(matcher.match(obj, pact)).to.be.true;
    });

    it("should fail if text body does not match", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj1);
      obj.response.body = "hello world";
      pact.response.body = "hello my world";
      expect(() => matcher.match(obj, pact)).to.throw(
        `Pact validation failed! "response > body" text did not match.`
      );
    });

    it("should match managed object", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj1);
      expect(_.isEqual(obj, pact)).to.be.true;
      expect(matcher.match(obj, pact)).to.be.true;
    });

    it("should match managed objects with different ids", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = { response: { body: { id: "212123" } } };
      const obj = { response: { body: { id: "9299299" } } };
      expect(matcher.match(obj, pact)).to.be.true;
    });

    it("should match managed objects with non-numeric ids", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = { response: { body: { id: "212123" } } };
      const obj = { response: { body: { id: "92992asdasdasd99" } } };
      expect(matcher.match(obj, pact)).to.be.true;
      // expect(() => matcher.match(obj, pact)).to.throw(
      //   "Pact validation failed for id with propertyMatcher [object Object]"
      // );
    });

    // disabled as now C8yIgnoreMatcher is used. some services seem to return id as number
    it.skip("should not match managed objects with different id types", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = { response: { body: { id: "212123" } } };
      const obj = { response: { body: { id: 9299299 } } };
      expect(() => matcher.match(obj, pact)).to.throw(
        `Pact validation failed! Values for "response > body > id" do not match.`
      );
    });

    it("should not match managed objects", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj1);
      const expectedError = `Pact validation failed! Values for "response > body > managedObjects" do not match.`;

      obj.response.body.managedObjects[0].description = "Some random text...";
      expect(() => matcher.match(obj, pact)).to.throw(expectedError);

      obj.response.body.managedObjects.pop();
      expect(() => matcher.match(obj, pact)).to.throw(expectedError);

      obj.response.body.managedObjects = [];
      expect(() => matcher.match(obj, pact)).to.throw(expectedError);
    });

    it("should match strictMatching disabled", function () {
      const matcher = new C8yDefaultPactMatcher();
      const obj = _.cloneDeep(obj1);

      const pact = C8yDefaultPactRecord.from({
        status: 201,
        isOkStatusCode: true,
      });

      const strictMatching = { strictMatching: false };
      expect(matcher.match(obj, pact, strictMatching)).to.be.true;

      const plainObjPact = {
        response: {
          status: 201,
          isOkStatusCode: true,
        },
      };
      expect(matcher.match(obj, plainObjPact, strictMatching)).to.be.true;
    });
  });

  context("C8yDefaultPactMatcher schema matching", function () {
    const strictMatchingDisabled: C8yPactMatcherOptions = {
      strictMatching: false,
    };

    beforeEach(() => {
      C8yDefaultPactMatcher.schemaMatcher = Cypress.c8ypact.schemaMatcher;
    });

    it("schema keys should not break object matching", function () {
      const matcher = new C8yDefaultPactMatcher();
      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);

      const pact = _.cloneDeep(obj1);
      pact.response["$body"] = {};
      pact.request.body = {};
      pact.request["$body"] = {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
      };

      const obj = _.cloneDeep(obj1);
      obj.request.body = { id: "123" };

      expect(matcher.match(obj, pact, strictMatchingDisabled)).to.be.true;
      expect(spy).to.have.been.calledTwice;
      spy.resetHistory();

      delete pact.response.$body;
      expect(matcher.match(obj, pact)).to.be.true;
      expect(spy).to.have.been.calledOnce;
    });

    it("matching should not fail for different number of keys in matched objects", function () {
      const matcher = new C8yDefaultPactMatcher();
      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);
      const pact = _.cloneDeep(obj1);
      Cypress.c8ypact.config.strictMatching = false;

      pact.response["$body"] = {};
      pact.request.body = {};
      _.set(pact, "request.$body", {});
      const obj = _.cloneDeep(obj1);
      obj.request.body = { id: "123" };

      expect(matcher.match(obj, pact)).to.be.true;
      expect(spy).to.have.been.calledTwice;
    });

    it("should not fail if only schema is available for key", function () {
      const matcher = new C8yDefaultPactMatcher();
      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);
      const pact = _.cloneDeep(obj1);
      delete pact.response.body;
      pact.response["$body"] = {};
      const obj = _.cloneDeep(obj1);

      Cypress.c8ypact.config.strictMatching = false;
      expect(matcher.match(obj, pact)).to.be.true;
      expect(spy).to.have.been.calledOnce;
    });

    it("should prefer schema over object matching", function () {
      const matcher = new C8yDefaultPactMatcher();
      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);
      const pact = _.cloneDeep(obj1);
      pact.response.body = { other: 101 };
      pact.response["$body"] = {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
      };
      const obj = _.cloneDeep(obj1);
      obj.response.body = { id: "123" };
      expect(matcher.match(obj, pact)).to.be.true;
      expect(spy).to.have.been.calledOnce;
    });

    it("should match schema with strictMatching disabled", function () {
      Cypress.c8ypact.config.strictMatching = false;
      const matcher = new C8yDefaultPactMatcher();
      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);
      const pact = _.cloneDeep(obj1);
      pact.response["$body"] = {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
      };
      const obj = _.cloneDeep(obj1);
      obj.response.body = { id: "123" };
      expect(matcher.match(obj, pact)).to.be.true;
      expect(spy).to.have.been.calledOnce;
    });

    it("should fail for not matching schema", function () {
      const matcher = new C8yDefaultPactMatcher();
      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);
      const pact = _.cloneDeep(obj1);
      pact.response["$body"] = {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
      };
      const obj = _.cloneDeep(obj1);
      obj.response.body = { id: 123 };
      expect(() => matcher.match(obj, pact)).to.throw(
        `Pact validation failed! Schema for "response > body" does not match.`
      );
      expect(spy).to.have.been.calledOnce;
    });

    it("should fail if schema validates not an object", function () {
      const matcher = new C8yDefaultPactMatcher();
      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);
      const pact = _.cloneDeep(obj1);
      pact.response["$body"] = {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
      };
      const obj = _.cloneDeep(obj1);
      obj.response.body = "{ id: 123 }";
      expect(() => matcher.match(obj, pact)).to.throw(
        `Pact validation failed! Schema for "response > body" does not match.`
      );
      expect(spy).to.have.been.calledOnce;
    });

    it("should fail for properties not defined in schema", function () {
      const matcher = new C8yDefaultPactMatcher();
      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);
      const pact = _.cloneDeep(obj1);
      pact.response["$body"] = {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
      };
      const obj = _.cloneDeep(obj1);
      obj.response.body = { id: "123", other: 101 };
      expect(() => matcher.match(obj, pact)).to.throw(
        `Pact validation failed! Schema for "response > body" does not match.`
      );
      expect(spy).to.have.been.calledOnce;
    });

    it("should fail when no schema matcher is registered", function () {
      const matcher = new C8yDefaultPactMatcher();
      C8yDefaultPactMatcher.schemaMatcher = undefined;

      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);
      const pact = _.cloneDeep(obj1);
      pact.response["$body"] = {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
      };
      const obj = _.cloneDeep(obj1);
      obj.response.body = { id: "123", other: 101 };
      expect(() => matcher.match(obj, pact)).to.throw(
        `Pact validation failed! No schema matcher registered to validate "response > body`
      );
      expect(spy).to.not.have.been.called;
    });

    it("should not fail for additional properties with strictMatching disabled", function () {
      const matcher = new C8yDefaultPactMatcher();
      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);
      const pact = _.cloneDeep(obj1);
      pact.response["$body"] = {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
      };
      const obj = _.cloneDeep(obj1);
      obj.response.body = { id: "123", other: 101 };
      expect(matcher.match(obj, pact, strictMatchingDisabled)).to.be.true;
      expect(spy).to.have.been.calledOnce;
    });

    it("should match nested schema", function () {
      const matcher = new C8yDefaultPactMatcher();
      const spy = cy.spy(Cypress.c8ypact.schemaMatcher, "match").log(false);
      const pact = _.cloneDeep(obj1);
      pact.response.body = { id: "123", nested: { name: "abcd" } };
      pact.response.body.$nested = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
      };

      const obj = _.cloneDeep(obj2);
      obj.response.body = { id: "123", nested: { name: "abcd" } };
      expect(matcher.match(obj, pact)).to.be.true;
      expect(spy).to.have.been.calledOnce;
    });
  });

  context("C8yISODateStringMatcher", function () {
    it("should match different iso date strings", function () {
      const matcher = new C8yISODateStringMatcher();
      const date1 = "2023-06-14T13:20:18.929Z";
      const date2 = "2023-06-14T13:20:18.929Z";
      expect(matcher.match(date1, date2)).to.be.true;

      const date3 = "2024-09-14T13:20:18.929Z";
      expect(matcher.match(date1, date3)).to.be.true;
    });

    it("should not match iso date strings and epoch timestamps", function () {
      const matcher = new C8yISODateStringMatcher();
      const date1 = "2023-06-14T13:20:18.929Z";
      const date2 = "1699996703";
      expect(matcher.match(date1, date2)).to.be.false;

      const date3 = 1699996703;
      expect(matcher.match(date1, date3)).to.be.false;
    });
  });
});

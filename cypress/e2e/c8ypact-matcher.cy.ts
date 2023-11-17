const { _ } = Cypress;
import {
  C8yDefaultPactMatcher,
  C8yISODateStringMatcher,
} from "../../lib/pacts/matcher";

describe("c8ypactmatcher", () => {
  beforeEach(() => {});

  context("C8yDefaultPactMatcher", function () {
    let obj1: Cypress.Response<any>, obj2: Cypress.Response<any>;

    beforeEach(() => {
      cy.fixture("c8ypact-managedobject-01.json").then((pacts) => {
        obj1 = pacts[0];
        obj2 = pacts[1];
      });
    });

    it("should match cloned object", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      expect(matcher.match(obj1, pact)).to.be.true;
    });

    it("should match requestHeader with different order", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      pact.requestHeaders = {
        "content-type": "application/json",
        UseXBasic: true,
        accept: "application/json",
      };
      expect(matcher.match(obj1, pact)).to.be.true;
    });

    it("should match duration only as number", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      pact.duration = 101;
      expect(matcher.match(obj1, pact)).to.be.true;
    });

    it("should fail if duration is not a number", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      pact.duration = "1212121";
      expect(() => matcher.match(obj1, pact)).to.throw(
        "Pact validation failed for duration with propertyMatcher [object Object]"
      );
    });

    it("should match text body", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj1);
      obj.body = "hello world";
      pact.body = "hello world";
      expect(matcher.match(obj, pact)).to.be.true;
    });

    it("should fail if text body does not match", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj1);
      obj.body = "hello world";
      pact.body = "hello my world";
      expect(() => matcher.match(obj, pact)).to.throw(
        "Pact validation failed! Response bodies not matching."
      );
    });

    it("should match managed object", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj2);
      expect(matcher.match(obj, pact)).to.be.true;
    });

    it("should match managed objects with different ids", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = { body: { id: "212123" } };
      const obj = { body: { id: "9299299" } };
      expect(matcher.match(obj, pact)).to.be.true;
    });

    it("should match managed objects with non-numeric ids", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = { body: { id: "212123" } };
      const obj = { body: { id: "92992asdasdasd99" } };
      expect(matcher.match(obj, pact)).to.be.true;
      // expect(() => matcher.match(obj, pact)).to.throw(
      //   "Pact validation failed for id with propertyMatcher [object Object]"
      // );
    });

    it("should not match managed objects with different id types", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = { body: { id: "212123" } };
      const obj = { body: { id: 9299299 } };
      expect(() => matcher.match(obj, pact)).to.throw(
        "Pact validation failed for id with propertyMatcher [object Object]"
      );
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

const { _ } = Cypress;
import { C8yDefaultPactMatcher } from "../../lib/pacts/matcher";

describe("c8ypactmatcher", () => {
  beforeEach(() => {});

  context("C8yDefaultPactMatcher", function () {
    let obj1, obj2: Cypress.Response<any>;

    beforeEach(() => {
      cy.fixture("c8ypact-managedobject-01.json").then((pacts) => {
        obj1 = pacts[0];
        obj2 = pacts[1];
      })
    })

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
        Authorization: "Basic YWRtaW46bXlwYXNzd29yZA==",
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

    it("should match text body", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj1);
      obj.body = "hello world";
      pact.body = "hello world";
      expect(matcher.match(obj, pact)).to.be.true;
    });

    it("should match managed object", function () {
      const matcher = new C8yDefaultPactMatcher();
      const pact = _.cloneDeep(obj1);
      const obj = _.cloneDeep(obj2);
      expect(matcher.match(obj, pact)).to.be.true;
    });
  });
});

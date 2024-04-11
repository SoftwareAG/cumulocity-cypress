/// <reference types="jest" />

import {
  C8yDefaultPact,
  C8yDefaultPactRecord,
  C8yPact,
  isPact,
  isPactError,
  isPactRecord,
} from "./c8ypact";

describe("c8ypact", () => {
  describe("isPactRecord", function () {
    it("isPactRecord validates undefined", function () {
      expect(isPactRecord(undefined)).toBe(false);
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
        toCypressResponse: () => true,
      };
      expect(isPactRecord(pact)).toBe(true);
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
      expect(isPactRecord(record)).toBe(true);
      expect(record.toCypressResponse()).not.toBe(null);
    });
  });

  describe("isPact", function () {
    it("isPact validates undefined", function () {
      expect(isPact(undefined)).toBe(false);
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
          id: "testid",
          baseUrl: "http://localhost:8080",
        },
        "test"
      );
      expect(isPact(pact)).toBe(true);
    });

    it("isPact validates records to be C8yDefaultPactRecord", function () {
      const pact: C8yPact = new C8yDefaultPact(
        [
          // @ts-expect-error
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
      expect(isPact(pact)).toBe(false);
    });
  });

  describe("isPactError", function () {
    it("isPactError validates error object with name C8yPactError", function () {
      const error = new Error("test");
      error.name = "C8yPactError";
      expect(isPactError(error)).toBe(true);
    });

    it("isPactError does not validate error with wrong name", function () {
      const error = new Error("test");
      expect(isPactError(error)).toBe(false);
    });

    it("isPactError does not validate undefined and empty", function () {
      expect(isPactError(undefined)).toBe(false);
      expect(isPactError(null)).toBe(false);
      expect(isPactError({})).toBe(false);
    });
  });
});

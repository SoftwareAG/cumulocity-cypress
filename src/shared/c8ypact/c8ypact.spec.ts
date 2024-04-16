/// <reference types="jest" />

import {
  C8yDefaultPact,
  C8yDefaultPactRecord,
  C8yPact,
  isPact,
  isPactError,
  isPactRecord,
  updateURLs,
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
            { user: "test" }
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

  describe("updateUrl", function () {
    it("update baseUrls", function () {
      const body = `"{"self": "https://mytenant.cumulocity.com/inventory/managedObjects/1?withChildren=false"}"`;
      expect(
        updateURLs(
          body,
          { baseUrl: "https://mytenant.cumulocity.com", tenant: "t12345" },
          { baseUrl: "http://localhost:8080" }
        )
      ).toBe(
        `"{"self": "http://localhost:8080/inventory/managedObjects/1?withChildren=false"}"`
      );
    });

    it("update baseUrls with tenant", function () {
      const body = `"{"self": "https://t123456.eu-latest.cumulocity.com/inventory/managedObjects/1?withChildren=false"}"`;
      expect(
        updateURLs(
          body,
          {
            baseUrl: "https://mytenant.eu-latest.cumulocity.com",
            tenant: "t123456",
          },
          { baseUrl: "http://localhost:8080" }
        )
      ).toBe(
        `"{"self": "http://localhost:8080/inventory/managedObjects/1?withChildren=false"}"`
      );
    });

    it("update baseUrls with tenants", function () {
      const body = `"{"self": "https://t123456.eu-latest.cumulocity.com/inventory/managedObjects/1?withChildren=false"}"`;
      expect(
        updateURLs(
          body,
          {
            baseUrl: "https://mytenant.eu-latest.cumulocity.com",
            tenant: "t123456",
          },
          {
            baseUrl: "http://test.us.cumulocity.com",
            tenant: "t654321",
          }
        )
      ).toBe(
        `"{"self": "http://t654321.us.cumulocity.com/inventory/managedObjects/1?withChildren=false"}"`
      );
    });
  });
});

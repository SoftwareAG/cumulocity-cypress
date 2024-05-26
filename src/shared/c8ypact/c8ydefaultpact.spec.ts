/// <reference types="jest" />

import _ from "lodash";

import { C8yDefaultPact } from "./c8ydefaultpact";
import { C8yDefaultPactRecord } from "./c8ypact";

/**
 * Wrapper for protected methods and properties of C8yDefaultPact for testing.
 */
class TestPact extends C8yDefaultPact {
  test_getRecordIndex() {
    return this.recordIndex;
  }

  test_setRecordIndex(index: number) {
    this.recordIndex = index;
  }

  test_getRequestIndexMap() {
    return this.requestIndexMap;
  }

  test_setRequestIndexMap(map: { [key: string]: number }) {
    this.requestIndexMap = map;
  }

  test_getIteratorIndex() {
    return this.iteratorIndex;
  }

  test_setIteratorIndex(index: number) {
    this.iteratorIndex = index;
  }
}

// more tests of still in c8ypact.cy.ts

describe("c8defaultpact", () => {
  describe("record operations", function () {
    let record: C8yDefaultPactRecord | undefined;
    let pact: TestPact | undefined;

    beforeEach(() => {
      record = new C8yDefaultPactRecord(
        {
          url: "http://localhost:8080/inventory/managedObjects/1?withChildren=false",
        },
        {
          status: 201,
          isOkStatusCode: true,
        },
        {},
        { user: "test" }
      );
      pact = new TestPact(
        [record],
        {
          id: "testid",
          baseUrl: "http://localhost:8080",
        },
        "test"
      );
    });

    it("clears records", function () {
      pact?.test_setIteratorIndex(10);
      pact?.test_setRecordIndex(10);
      pact?.test_setRequestIndexMap({ test: 1 });
      pact!.clearRecords();
      expect(pact!.records.length).toBe(0);
      expect(pact!.test_getIteratorIndex()).toBe(0);
      expect(pact!.test_getRecordIndex()).toBe(0);
      expect(pact!.test_getRequestIndexMap()).toEqual({});
    });

    it("nextRecord and recordIndex", function () {
      const clone = _.cloneDeep(record!);
      clone.request.url = "http://localhost:8080/tenant/currentTenant";
      pact!.records.push(clone!);
      expect(pact!.records.length).toBe(2);

      const r1 = pact!.nextRecord();
      expect(pact!.test_getRecordIndex()).toBe(1);
      expect(r1).toBe(record);

      const r2 = pact!.nextRecord();
      expect(pact!.test_getRecordIndex()).toBe(2);
      expect(r2).toBe(clone!);

      pact!.clearRecords();
      expect(pact!.nextRecord()).toBe(null);
      expect(pact!.test_getRecordIndex()).toBe(0);
    });

    it("appendRecord", function () {
      const clone = _.cloneDeep(record!);
      clone.request.url = "http://localhost:8080/tenant/currentTenant";
      pact!.appendRecord(clone!);
      expect(pact!.records.length).toBe(2);
      expect(pact!.records[1]).toBe(clone!);
    });

    it("appendRecord with skipIfExists for existing record", function () {
      const clone = _.cloneDeep(record!);
      clone.response.status = 404;
      pact!.appendRecord(clone!, true);
      expect(pact!.records.length).toBe(1);
      expect(pact!.records[0]).toBe(record);
      expect(pact!.records[0].response.status).toBe(201);
    });

    it("replaceRecord", function () {
      const clone = _.cloneDeep(record!);
      clone.response.status = 404;
      pact!.replaceRecord(clone!);
      expect(pact!.records.length).toBe(1);
      expect(pact!.records[0]).toBe(clone!);
    });

    it("replaceRecord with new record", function () {
      const clone = _.cloneDeep(record!);
      clone.request.url = "http://localhost:8080/tenant/currentTenant";
      pact!.replaceRecord(clone!);
      expect(pact!.records.length).toBe(2);
      expect(pact!.records[0]).toBe(record!);
      expect(pact!.records[1]).toBe(clone!);
    });

    it("replaceRecord with sequence of same requests", function () {
      pact!.records.push(record!);
      pact!.records.push(record!);
      expect(pact!.records.length).toBe(3);

      const clone = _.cloneDeep(record!);
      clone.response.status = 404;
      pact!.replaceRecord(clone!);
      expect(pact!.records.length).toBe(3);
      expect(pact!.records[0]).toBe(clone!);
      expect(pact!.records[1]).toBe(record!);
      expect(pact!.records[2]).toBe(record!);

      pact!.replaceRecord(clone!);
      expect(pact!.records.length).toBe(3);
      expect(pact!.records[0]).toBe(clone!);
      expect(pact!.records[1]).toBe(clone!);
      expect(pact!.records[2]).toBe(record!);

      pact!.replaceRecord(clone!);
      expect(pact!.records.length).toBe(3);
      expect(pact!.records[0]).toBe(clone!);
      expect(pact!.records[1]).toBe(clone!);
      expect(pact!.records[2]).toBe(clone!);

      pact!.replaceRecord(clone!);
      expect(pact!.records.length).toBe(4);
      expect(pact!.records[3]).toBe(clone!);
    });

    it("record iterator", function () {
      const clone = _.cloneDeep(record!);
      clone.request.url = "http://localhost:8080/tenant/currentTenant";
      pact!.records.push(clone!);
      expect(pact!.records.length).toBe(2);

      let index = 0;
      for (const r of pact!) {
        expect(r).toBe(pact!.records[index]);
        index++;
      }
    });
  });
});

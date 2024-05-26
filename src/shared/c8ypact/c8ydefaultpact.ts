import _ from "lodash";
import { C8yClient } from "../c8yclient";
import { isURL, removeBaseUrlFromRequestUrl } from "./url";
import { toPactAuthObject } from "../auth";
import {
  C8yDefaultPactRecord,
  C8yPact,
  C8yPactID,
  C8yPactInfo,
  C8yPactRecord,
  C8yPactRequest,
  isCypressResponse,
  isPact,
  toPactRequest,
  toPactResponse,
} from "./c8ypact";

/**
 * Default implementation of C8yPact. Use C8yDefaultPact.from to create a C8yPact from
 * a Cypress.Response object, a serialized pact as string or an object implementing the
 * C8yPact interface. Note, objects implementing the C8yPact interface may not provide
 * all required functions and properties.
 */
export class C8yDefaultPact implements C8yPact {
  records: C8yPactRecord[];
  info: C8yPactInfo;
  id: C8yPactID;

  protected recordIndex = 0;
  protected iteratorIndex = 0;
  protected requestIndexMap: { [key: string]: number } = {};

  static strictMatching: boolean;

  constructor(records: C8yPactRecord[], info: C8yPactInfo, id: C8yPactID) {
    this.records = records;
    this.info = info;
    this.id = id;
  }

  /**
   * Creates a C8yPact from a Cypress.Response object, a serialized pact as string
   * or an object containing the pact records and info object. Throws an error if
   * the input can not be converted to a C8yPact.
   * @param obj The Cypress.Response, string or object to create a pact from.
   * @param info The C8yPactInfo object containing additional information for the pact.
   * @param client The optional C8yClient for options and auth information.
   */
  static from(
    ...args:
      | [obj: Cypress.Response<any>, info: C8yPactInfo, client?: C8yClient]
      | [obj: string | C8yPact]
  ): C8yDefaultPact {
    const obj = args[0];
    if (!obj) {
      throw new Error("Can not create pact from null or undefined.");
    }
    if (isCypressResponse(obj)) {
      const info = args && args.length > 1 ? args[1] : undefined;
      if (!info) {
        throw new Error(
          `Can not create pact from response without C8yPactInfo.`
        );
      }
      const client = args[2];
      const r = _.cloneDeep(obj);
      const pactRecord = new C8yDefaultPactRecord(
        toPactRequest(r) || {},
        toPactResponse(r) || {},
        client?._options,
        client?._auth ? toPactAuthObject(client?._auth) : undefined
      );
      removeBaseUrlFromRequestUrl(pactRecord, info.baseUrl);
      return new C8yDefaultPact([pactRecord], info, info.id);
    } else {
      let pact: C8yPact;
      if (_.isString(obj)) {
        pact = JSON.parse(obj);
      } else if (_.isObjectLike(obj)) {
        pact = obj;
      } else {
        throw new Error(`Can not create pact from ${typeof obj}.`);
      }

      // required to map the record object to a C8yPactRecord here as this can
      // not be done in the plugin
      pact.records = pact.records?.map((record) => {
        return new C8yDefaultPactRecord(
          record.request,
          record.response,
          record.options || {},
          record.auth,
          record.createdObject
        );
      });

      const result = new C8yDefaultPact(pact.records, pact.info, pact.id);
      if (!isPact(result)) {
        throw new Error(
          `Invalid pact object. Can not create pact from ${typeof obj}.`
        );
      }
      return result;
    }
  }

  clearRecords(): void {
    this.records = [];
    this.requestIndexMap = {};
    this.recordIndex = 0;
    this.iteratorIndex = 0;
  }

  appendRecord(record: C8yPactRecord, skipIfExists: boolean = false): void {
    if (skipIfExists) {
      if (!record.request.url) null;
      const matches = this.getRecordsMatchingRequest(record.request);
      if (matches && !_.isEmpty(matches)) return;
    }
    this.records.push(record);
  }

  replaceRecord(record: C8yPactRecord): void {
    const key = this.indexMapKey(record.request, this.info.baseUrl);
    if (!key) return;

    const matches = this.getRecordsMatchingRequest(record.request);
    if (!matches) {
      this.appendRecord(record);
    } else {
      const currentIndex = Math.max(0, this.getIndexForKey(key));
      const match = matches[currentIndex];
      if (!match) {
        this.appendRecord(record);
      } else {
        const index = this.records.indexOf(match);
        if (index >= 0) {
          this.records[index] = record;
          this.setIndexForKey(key, currentIndex + 1);
        }
      }
    }
  }

  /**
   * Returns the next pact record or null if no more records are available.
   */
  nextRecord(): C8yPactRecord | null {
    if (this.recordIndex >= this.records.length) {
      return null;
    }
    return this.records[this.recordIndex++];
  }

  nextRecordMatchingRequest(
    request: Partial<Request>,
    baseUrl?: string
  ): C8yPactRecord | null {
    if (!request?.url) return null;
    const key = this.indexMapKey(request, baseUrl);
    if (!key) return null;

    const matches = this.getRecordsMatchingRequest(request);
    if (!matches) return null;

    const currentIndex = Math.max(0, this.getIndexForKey(key));
    const result = matches[Math.min(currentIndex, matches.length - 1)];
    this.requestIndexMap[key] = currentIndex + 1;
    return result;
  }

  protected getIndexForKey(key: string): number {
    return this.requestIndexMap[key] || -1;
  }

  protected setIndexForKey(key: string, index: number): void {
    this.requestIndexMap[key] = index;
  }

  protected indexMapKey(
    request: Partial<Request> | C8yPactRequest,
    baseUrl?: string
  ): string | undefined {
    if (!request.url) return undefined;
    const url = this.normalizeUrl(request.url, undefined, baseUrl);
    const method = _.lowerCase(request.method || "get");
    return `${method}:${url}`;
  }

  protected normalizeUrl(
    url: string | URL,
    parametersToRemove?: string[],
    baseUrl?: string
  ) {
    const urlObj = isURL(url)
      ? url
      : new URL(decodeURIComponent(url), this.info.baseUrl);

    const p =
      parametersToRemove ||
      this.info.requestMatching?.ignoreUrlParameters ||
      [];

    p.forEach((name) => {
      urlObj.searchParams.delete(name);
    });

    if (!baseUrl) {
      return decodeURIComponent(urlObj.pathname + urlObj.search + urlObj.hash);
    }

    return decodeURIComponent(
      urlObj.toString()?.replace(this.info.baseUrl, "")?.replace(baseUrl, "")
    );
  }

  protected matchUrls(
    url1: string | URL,
    url2: string | URL,
    baseUrl?: string
  ): boolean {
    if (!url1 || !url2) return false;

    const ignoreParameters =
      this.info.requestMatching?.ignoreUrlParameters || [];

    const n1 = this.normalizeUrl(url1, ignoreParameters, baseUrl);
    const n2 = this.normalizeUrl(url2, ignoreParameters, baseUrl);
    return _.isEqual(n1, n2);
  }

  // debugging and test purposes only
  protected getRequesIndex(key: string): number {
    return this.requestIndexMap[key] || 0;
  }

  /**
   * Returns the pact record for the given request or null if no record is found.
   * Currently only url and method are used for matching.
   * @param req The request to use for matching.
   */
  getRecordsMatchingRequest(
    req: Partial<Request> | C8yPactRequest,
    baseUrl?: string
  ): C8yPactRecord[] | null {
    const records = this.records.filter((record) => {
      return (
        record.request?.url &&
        req.url &&
        this.matchUrls(record.request.url, req.url, baseUrl) &&
        (req.method != null
          ? _.lowerCase(req.method) === _.lowerCase(record.request.method)
          : true)
      );
    });
    return records.length ? records : null;
  }

  /**
   * Returns an iterator for the pact records to iterate records using `for (const record of pact) {...}`.
   */
  [Symbol.iterator](): Iterator<C8yPactRecord | null> {
    return {
      next: () => {
        if (this.iteratorIndex < this.records.length) {
          return { value: this.records[this.iteratorIndex++], done: false };
        } else {
          return { value: null, done: true };
        }
      },
    };
  }
}

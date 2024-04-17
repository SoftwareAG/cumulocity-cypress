/// <reference types="cypress" />

// workaround for lodash import in Cypress nodejs typescript runtime and browser
import lodash1 from "lodash";
import * as lodash2 from "lodash";
const _ = lodash1 || lodash2;

import {
  C8yPactPreprocessor,
  C8yPactPreprocessorOptions,
} from "./preprocessor";
import { C8yClient, C8yClientOptions } from "../c8yclient";
import { C8ySchemaGenerator } from "./schema";
import { isURL, removeBaseUrlFromRequestUrl } from "./url";
import {
  C8yAuthOptions,
  C8yPactAuthObject,
  toPactAuthObject,
  isAuthOptions,
  isPactAuthObject,
} from "../auth";

/**
 * ID representing a pact object. Should be unique.
 */
export type C8yPactID = string;

export interface C8yPactRequestMatchingOptions {
  ignoreUrlParameters?: string[];
  baseUrl?: string;
}

export interface C8yPactConfigOptions {
  /**
   * ID representing a pact object.
   */
  id?: C8yPactID;
  /**
   * Use to enable additional logging.
   */
  log?: boolean;
  /**
   * Information describing the producer of the pact. Includes name and version information
   */
  producer?: { name: string; version?: string } | string;
  /**
   * Information describing the consumer of the pact. Includes name and version information
   */
  consumer?: { name: string; version?: string } | string;
  /**
   * Tags describing the pact.
   */
  tags?: string[];
  /**
   * Description of the pact.
   */
  description?: string;
  /**
   * Use ignore to disable the pact for the current test case.
   */
  ignore?: boolean;
  /**
   * Use failOnMissingPacts to disable failing the test if no pact or no next record
   * is found for the current test case.
   */
  failOnMissingPacts?: boolean;
  /**
   * Use strictMatching to enable strict matching of the pact records. If strict matching
   * is enabled, all properties of the pact records must match and tests fail if a property
   * is missing.
   */
  strictMatching?: boolean;
  /**
   * If strictMocking is enabled, a 404 / Resource not found response will be returned if
   * no pact record matches the current request. If disabled, the request will be passed
   * through to the configured baseUrl.
   */
  strictMocking?: boolean;
  /**
   * Options to configure the C8yPactPreprocessor.
   */
  preprocessor?: C8yPactPreprocessorOptions;
  /**
   * Options to configure the C8yPact request matching.
   */
  requestMatching?: C8yPactRequestMatchingOptions;
}
export type C8yPactConfigKeys = keyof C8yPactConfigOptions;

export interface C8yPactEnv {
  tenant?: string;
  loggedInUser?: string;
  loggedInUserAlias?: string;
  testTitlePath?: string[];
  systemVersion?: string;
  pluginVersion?: string;
  pluginFolder?: string;
}

/**
 * Pact object. Contains all information about a recorded pact, including
 * the pact records with requests and responses as well as info object with
 * meta data. A C8yPact objtect must have an unique id.
 */
export interface C8yPact {
  /**
   * Pact records containing the requests and responses as well as auth information,
   * configuration options and created objects.
   */
  records: C8yPactRecord[];
  /**
   * Meta information describing the pact.
   */
  info: C8yPactInfo;
  /**
   * Unique id of the pact.
   */
  id: C8yPactID;
  /**
   * Returns the next pact record or null if no more records are available.
   */
  nextRecord(): C8yPactRecord | null;
  /**
   * Returns the next pact record matching the given request. Request matching is
   * based ob criteria like url and method. Returns null if no record is found.
   */
  nextRecordMatchingRequest(
    request: Partial<Request>,
    baseUrl?: string
  ): C8yPactRecord | null;
  /**
   * Returns an iterator for the pact records.
   */
  [Symbol.iterator](): Iterator<C8yPactRecord | null>;
}

export interface C8yPactInfoVersion {
  system?: string;
  c8ypact?: string;
  runner?: string;
}

/**
 * Meta information describing a pact and how it was recorded.
 */
export interface C8yPactInfo extends C8yPactConfigOptions {
  id: C8yPactID;
  /**
   * Version information of the system, runner and pact standard used to record the pact.
   */
  version?: C8yPactInfoVersion;
  /**
   * Title of the pact. Title is an array of suite and test titles.
   */
  title?: string[];
  /**
   * Base URL when recording the pact.
   */
  baseUrl: string;
  /**
   * Tenant when recording the pact.
   */
  tenant?: string;
}

/**
 * The request stored in a C8yPactRecord.
 */
export type C8yPactRequest = Partial<Cypress.RequestOptions> & {
  $body?: any;
};

/**
 * The response stored in a C8yPactRecord.
 */
export interface C8yPactResponse<T> {
  allRequestResponses?: any[];
  body?: T;
  duration?: number;
  headers?: { [key: string]: string | string[] };
  isOkStatusCode?: boolean;
  status?: number;
  statusText?: string;
  method?: string;
  $body?: any; // [key: `$${string}`]: any;
}

/**
 * The C8yPactRecord contains all information about a recorded request. It contains
 * the request and response as well as configuration options, auth information and
 * the created object id.
 */
export interface C8yPactRecord {
  /**
   * Request of the record.
   */
  request: C8yPactRequest;
  /**
   * Response of the record.
   */
  response: C8yPactResponse<any>;
  /**
   * Modified response returned by interception RouteHandler.
   */
  modifiedResponse?: C8yPactResponse<any>;
  /**
   * Configuration options used for the request.
   */
  options?: C8yClientOptions;
  /**
   * Auth information used for the request. Can be Basic or Cookie auth. Contains username and possibly alias.
   */
  auth?: C8yPactAuthObject;
  /**
   * Id of an object created by the request. Used for mapping when running the recording.
   */
  createdObject?: string;

  /**
   * Converts the C8yPactRecord to a Cypress.Response object.
   */
  toCypressResponse(): Cypress.Response<any>;
  /**
   * Returns the date of the response.
   */
  date(): Date | null;
}

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
   * Resets the pact to the initial state. Clears all records and resets all indexes.
   */
  reset() {
    this.records = [];
    this.recordIndex = 0;
    this.iteratorIndex = 0;
    this.requestIndexMap = {};
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
    request: Partial<Request> | { url: string; method: string },
    baseUrl?: string
  ): C8yPactRecord | null {
    if (!request?.url) return null;

    const matches = this.getRecordsMatchingRequest(request);
    if (!matches) return null;

    const url = this.normalizeUrl(request.url, undefined, baseUrl);
    const method = _.lowerCase(request.method || "get");

    const currentIndex = this.requestIndexMap[`${method}:${url}`] || 0;
    const result = matches[Math.min(currentIndex, matches.length - 1)];
    this.requestIndexMap[`${method}:${url}`] = currentIndex + 1;
    return result;
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
    req: Partial<Request>,
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
   * Returns an iterator for the pact records.
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

/**
 * Default implementation of C8yPactRecord. Use C8yDefaultPactRecord.from to create
 * a C8yPactRecord from a Cypress.Response object or an C8yPactRecord object.
 */
export class C8yDefaultPactRecord implements C8yPactRecord {
  request: C8yPactRequest;
  response: C8yPactResponse<any>;
  options?: C8yClientOptions;
  auth?: C8yPactAuthObject;
  createdObject?: string;
  modifiedResponse?: C8yPactResponse<any>;

  constructor(
    request: C8yPactRequest,
    response: C8yPactResponse<any>,
    options?: C8yClientOptions,
    auth?: C8yPactAuthObject,
    createdObject?: string,
    modifiedResponse?: C8yPactResponse<any>
  ) {
    this.request = request;
    this.response = response;

    if (options) this.options = options;
    if (auth) this.auth = auth;
    if (createdObject) this.createdObject = createdObject;
    if (modifiedResponse) this.modifiedResponse = modifiedResponse;

    if (request?.method?.toLowerCase() === "post") {
      const newId = response.body?.id;
      if (newId) {
        this.createdObject = newId;
      }
    }
  }

  /**
   * Creates a C8yPactRecord from a Cypress.Response or an C8yPactRecord object.
   * @param obj The Cypress.Response<any> or C8yPactRecord object.
   * @param client The C8yClient for options and auth information.
   */
  static from(
    obj: Cypress.Response<any> | C8yPactRecord | Partial<Cypress.Response<any>>,
    auth?: C8yAuthOptions,
    client?: C8yClient
  ): C8yPactRecord {
    // if (obj == null) return obj;
    if ("request" in obj && "response" in obj) {
      return new C8yDefaultPactRecord(
        _.get(obj, "request"),
        _.get(obj, "response"),
        _.get(obj, "options") || {},
        _.get(obj, "auth"),
        _.get(obj, "createdObject"),
        _.get(obj, "modifiedResponse")
      );
    }

    const r = _.cloneDeep(obj);
    return new C8yDefaultPactRecord(
      toPactRequest(r) || {},
      toPactResponse(r) || {},
      client?._options,
      isAuthOptions(auth) || isPactAuthObject(auth)
        ? toPactAuthObject(auth)
        : client?._auth
        ? toPactAuthObject(client?._auth)
        : undefined
    );
  }

  /**
   * Returns the date of the response.
   */
  date(): Date | null {
    const date = _.get(this.response, "headers.date");
    if ((date && _.isString(date)) || _.isNumber(date) || _.isDate(date)) {
      return new Date(date);
    }
    return null;
  }

  /**
   * Converts the C8yPactRecord to a Cypress.Response object.
   */
  toCypressResponse<T>(): Cypress.Response<T> {
    const result = _.cloneDeep(this.response);
    _.extend(result, {
      ...(result.status && {
        isOkStatusCode: result.status > 199 && result.status < 300,
      }),
      ...(this.request.headers && {
        requestHeaders: Object.fromEntries(
          Object.entries(this.request.headers || [])
        ),
      }),
      ...(this.request.url && { url: this.request.url }),
      ...(result.allRequestResponses && { allRequestResponses: [] }),
      ...(this.request.body && { requestBody: this.request.body }),
      method: this.request.method || this.response.method || "GET",
    });
    return result as Cypress.Response<T>;
  }
}

/**
 * Creates an C8yPactID for give string or array of strings.
 * @param value The string or array of strings to convert to a pact id.
 * @returns The pact id.
 */
export function pactId(value: string | string[]): C8yPactID {
  let result: string = "";
  const suiteSeparator = "__";

  const normalize = (value: string): string =>
    value
      .split(suiteSeparator)
      .map((v) => _.words(_.deburr(v), /[a-zA-Z0-9]+/g).join("_"))
      .join(suiteSeparator);

  if (value && _.isArray(value)) {
    result = value.map((v) => normalize(v)).join(suiteSeparator);
  } else if (value && _.isString(value)) {
    result = normalize(value as string);
  }
  if (!result || _.isEmpty(result)) {
    return !value ? (value as C8yPactID) : (undefined as any);
  }
  return result;
}

/**
 * Checks if the given object is a C8yPact. This also includes checking
 * all records to be valid C8yPactRecord instances.
 *
 * @param obj The object to check.
 * @returns True if the object is a C8yPact, false otherwise.
 */
export function isPact(obj: any): obj is C8yPact {
  return (
    _.isObjectLike(obj) &&
    "info" in obj &&
    _.isObjectLike(_.get(obj, "info")) &&
    "records" in obj &&
    _.isArray(_.get(obj, "records")) &&
    _.every(_.get(obj, "records"), isPactRecord) &&
    _.isFunction(_.get(obj, "nextRecord"))
  );
}

/**
 * Checks if the given object is a C8yPactRecord.
 *
 * @param obj The object to check.
 * @returns True if the object is a C8yPactRecord, false otherwise.
 */
export function isPactRecord(obj: any): obj is C8yPactRecord {
  return (
    _.isObjectLike(obj) &&
    "request" in obj &&
    _.isObjectLike(_.get(obj, "request")) &&
    "response" in obj &&
    _.isObjectLike(_.get(obj, "response")) &&
    _.isFunction(_.get(obj, "toCypressResponse"))
  );
}

/**
 * Checks if the given object is a Cypress.Response.
 *
 * @param obj The object to check.
 * @returns True if the object is a Cypress.Response, false otherwise.
 */
export function isCypressResponse(obj: any): obj is Cypress.Response<any> {
  return (
    _.isObjectLike(obj) &&
    "body" in obj &&
    "status" in obj &&
    "headers" in obj &&
    "requestHeaders" in obj &&
    "duration" in obj &&
    "url" in obj &&
    "isOkStatusCode" in obj &&
    // not a window.Response or Client.FetchResponse
    !("ok" in obj || "arrayBuffer" in obj)
  );
}

/**
 * Checks if the given object is a C8yPactError. A C8yPactError is an error
 * with the name "C8yPactError".
 *
 * @param error The object to check.
 * @returns True if the object is a C8yPactError, false otherwise.
 */
export function isPactError(error: any): boolean {
  return _.isError(error) && _.get(error, "name") === "C8yPactError";
}

function isDefined(value: any): boolean {
  return !_.isUndefined(value);
}

/**
 * Converts a Cypress.Response to a C8yPactRequest.
 */
export function toPactRequest(
  response: Cypress.Response<any> | Partial<Cypress.Response<any>>
): C8yPactRequest | undefined {
  if (!response) return response;
  const result = _.pickBy(
    _.mapKeys(
      _.pick(response, ["url", "method", "requestHeaders", "requestBody"]),
      (v, k) => {
        if (_.isEqual(k, "requestHeaders")) return "headers";
        if (_.isEqual(k, "requestBody")) return "body";
        return k;
      }
    ),
    isDefined
  ) as C8yPactRequest;
  if (_.isEmpty(result)) return undefined;
  return result;
}

/**
 * Converts a Cypress.Response to a C8yPactResponse.
 */
export function toPactResponse<T>(
  response: Cypress.Response<T> | Partial<Cypress.Response<T>>
): C8yPactResponse<T> | undefined {
  if (!response) return response;
  const result = _.pickBy(
    _.pick(response, [
      "status",
      "statusText",
      "body",
      "headers",
      "duration",
      "isOkStatusCode",
      "allRequestResponses",
      "$body",
    ]),
    isDefined
  ) as C8yPactResponse<T>;
  if (_.isEmpty(result)) return undefined;
  return result;
}

export type C8yPactSaveKeys = "id" | "info" | "records";

export async function toPactSerializableObject(
  response: Partial<Cypress.Response<any>>,
  info: C8yPactInfo,
  options: {
    preprocessor?: C8yPactPreprocessor;
    client?: C8yClient;
    modifiedResponse?: Cypress.Response<any>;
    schemaGenerator?: C8ySchemaGenerator;
    loggedInUser?: string;
    loggedInUserAlias?: string;
    authType?: string;
  } = {}
): Promise<Pick<C8yPact, C8yPactSaveKeys>> {
  const recordOptions = {
    loggedInUser: options?.loggedInUser,
    loggedInUserAlias: options?.loggedInUserAlias,
    authType: options?.authType,
  };
  const record = createPactRecord(response, options?.client, recordOptions);
  removeBaseUrlFromRequestUrl(record, info.baseUrl);
  const pact = new C8yDefaultPact([record], info, info.id);

  if (
    options?.modifiedResponse &&
    isCypressResponse(options?.modifiedResponse)
  ) {
    const modifiedPactRecord = createPactRecord(
      options.modifiedResponse,
      options?.client,
      recordOptions
    );
    pact.records[pact.records.length - 1].modifiedResponse =
      modifiedPactRecord.response;
  }

  options?.preprocessor?.apply(pact);

  const keysToSave: C8yPactSaveKeys[] = ["id", "info", "records"];
  try {
    await Promise.all(
      pact.records
        .filter(
          (record_1) =>
            record_1.response.body &&
            !record_1.response.$body &&
            _.isObjectLike(record_1.response.body)
        )
        .map((record_2) =>
          options?.schemaGenerator
            ?.generate(record_2.response.body, { name: "body" })
            .then((schema) => {
              record_2.response.$body = schema;
              return record_2;
            })
        )
    );
    return { ..._.pick(pact, keysToSave) };
  } catch (error) {
    console.error(error);
    return { ..._.pick(pact, keysToSave) };
  }
}

export function createPactRecord(
  response: Partial<Cypress.Response<any>>,
  client?: C8yClient,
  options: {
    loggedInUser?: string;
    loggedInUserAlias?: string;
    authType?: string;
  } = {}
): C8yPactRecord {
  let auth: C8yAuthOptions | undefined = undefined;
  const envUser = options.loggedInUser;
  const envAlias = options.loggedInUserAlias;
  const envType = options.authType;
  const envAuth = {
    ...(envUser && { user: envUser }),
    ...(envAlias && { userAlias: envAlias }),
    ...(envAlias && { type: envType ?? "CookieAuth" }),
  };

  if (client?._auth) {
    // do not pick the password. passwords must not be stored in the pact.
    auth = _.defaultsDeep(client._auth, envAuth);
    if (client._auth.constructor != null) {
      if (!auth) {
        auth = { type: client._auth.constructor.name };
      } else {
        auth.type = client._auth.constructor.name;
      }
    }
  }
  if (!auth && (envUser || envAlias)) {
    auth = envAuth;
  }

  // only store properties that need to be exposed. do not store password.
  auth = auth ? toPactAuthObject(auth) : auth;
  return C8yDefaultPactRecord.from(response, auth, client);
}

export function updateURLs(
  value: string,
  from: { baseUrl: string; tenant: string },
  to: { baseUrl: string; tenant?: string }
): string {
  if (!value || !from || !to) return value;
  let result = value;

  const normalizeUrl = (url?: string): string | undefined => {
    return url?.replace(/\/$/, "");
  };

  const tenantUrl = (baseUrl?: string, tenant?: string): string | undefined => {
    if (!baseUrl) return undefined;
    if (!tenant) return normalizeUrl(baseUrl);

    try {
      const url = new URL(baseUrl);
      const instance = url.host.split(".")?.slice(1)?.join(".");
      url.host = `${tenant}.${instance}`;
      return normalizeUrl(url.toString());
    } catch {
      // no-op
    }
    return undefined;
  };

  const fromTenantUrl = tenantUrl(from.baseUrl, from.tenant);
  const toTenantUrl = tenantUrl(to.baseUrl, to.tenant);
  if (fromTenantUrl && toTenantUrl) {
    result = result.replace(new RegExp(fromTenantUrl, "g"), toTenantUrl);
  }
  if (from.baseUrl && to.baseUrl) {
    const fromBaseUrl = normalizeUrl(from.baseUrl);
    const toBaseUrl = normalizeUrl(to.baseUrl);
    if (fromBaseUrl && toBaseUrl) {
      result = result.replace(new RegExp(fromBaseUrl, "g"), toBaseUrl);
    }

    result = result.replace(
      new RegExp(from.baseUrl.replace(/https?:\/\//i, ""), "g"),
      to.baseUrl.replace(/https?:\/\//i, "")
    );
  }
  return result;
}

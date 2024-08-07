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
import { removeBaseUrlFromRequestUrl } from "./url";
import {
  C8yAuthOptions,
  C8yPactAuthObject,
  toPactAuthObject,
  isAuthOptions,
  isPactAuthObject,
} from "../auth";
import { C8yDefaultPact } from "./c8ydefaultpact";

export const C8yPactModeValues = [
  "record",
  "recording",
  "apply",
  "disabled",
  "mock",
] as const;
/**
 * The pact mode is used to determine the behavior of the recording and mocking capabilities.
 * - `record`: Records the requests and responses and stores them in a pact file.
 * - `apply`: Mocks or matches the requests and responses from the recorded pact file.
 * - `disabled`: Disables the pact recording and mocking (same as undefined).
 * - `recording` (deprecated): same as `record`, use `record` instead.
 * - `mock: (deprecated): same as `apply`, use `apply` instead.
 */
export type C8yPactMode = (typeof C8yPactModeValues)[number];

export const C8yPactRecordingModeValues = [
  "refresh",
  "append",
  "new",
  "replace",
] as const;
/**
 * The pact recording mode is used to determine how or if requests and responses are recorded.
 * - `refresh` (default): Recreates the pact file with the all requests and responses.
 * - `append`: Appends the new requests and responses to the existing pact file.
 * - `new`: Only creates a new pact file if no pact file exists. If pact file exists, only new requests and responses are added.
 * - `replace`: Overwrites existing records of a pact with new request and response in the order of occurence. Other records are kept as is.
 */
export type C8yPactRecordingMode = (typeof C8yPactRecordingModeValues)[number];

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
   * If strictMocking is enabled, an error will be thrown if no pact record matches the
   * current request. If disabled, the request will be passed through to the configured baseUrl.
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
  /**
   * Recording mode for the pact. Default is `refresh`.
   */
  recordingMode?: C8yPactRecordingMode;
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
   * Clears all records of the pact. Also resets all indexes internally used for
   * iterating over the records.
   */
  clearRecords(): void;
  /**
   * Appends a new record to the pact. If skipIfExists is true, the record is
   * only appended if no record with the same request exists.
   */
  appendRecord(record: C8yPactRecord, skipIfExists?: boolean): void;
  /**
   * Replaces an existing record with a new record. If no record with the same
   * request exists, the record is appended.
   */
  replaceRecord(record: C8yPactRecord): void;
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

/**
 * Meta information describing a pact and how it was recorded.
 */
export interface C8yPactInfo extends C8yPactConfigOptions {
  id: C8yPactID;
  /**
   * Version information of the system, runner and pact standard used to record the pact.
   */
  version?: {
    system?: string;
    shell?: string;
    shellName?: string;
    c8ypact?: string;
    runner?: string;
  };
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

export function isValidPactId(value: string): boolean {
  if (value == null || value.length > 1000 || !_.isString(value)) return false;
  const validPactIdRegex = /^[a-zA-Z0-9_-]+(__[a-zA-Z0-9_-]+)*$/;
  return validPactIdRegex.test(value);
}

/**
 * Creates an C8yPactID for a given string or array of strings.
 * @param value The string or array of strings to convert to a pact id.
 * @returns The pact id.
 */
export function pactId(value: string | string[]): C8yPactID | undefined {
  let result: string = "";
  const suiteSeparator = "__";

  const normalize = (value: string): string =>
    value
      .split(suiteSeparator)
      .map((v) => _.words(_.deburr(v), /[a-zA-Z0-9_-]+/g).join("_"))
      .join(suiteSeparator);

  if (value != null && _.isArray(value)) {
    result = value.map((v) => normalize(v)).join(suiteSeparator);
  } else if (value != null && _.isString(value)) {
    result = normalize(value as string);
  }
  if (result == null || _.isEmpty(result)) {
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
    _.isFunction(_.get(obj, "nextRecord")) &&
    _.isFunction(_.get(obj, "nextRecordMatchingRequest")) &&
    _.isFunction(_.get(obj, "appendRecord")) &&
    _.isFunction(_.get(obj, "replaceRecord"))
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
        .filter((record_1: C8yPactRecord) => !record_1.response.$body)
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
  info: C8yPactInfo,
  options?: { tenantId?: string; baseUrl?: string }
): string {
  if (!value || !info) return value;
  let result = value;

  const tenantUrl = (baseUrl?: string, tenant?: string): URL | undefined => {
    if (!baseUrl || !tenant) return undefined;
    try {
      const url = new URL(baseUrl);
      const instance = url.host.split(".")?.slice(1)?.join(".");
      url.host = `${tenant}.${instance}`;
      return url;
    } catch {
      // no-op
    }
    return undefined;
  };

  const infoUrl = tenantUrl(info.baseUrl, info.tenant)
    ?.toString()
    ?.replace(/\/$/, "");
  const url =
    (
      tenantUrl(options?.baseUrl, options?.tenantId)?.toString() ??
      options?.baseUrl
    )?.replace(/\/$/, "") ?? "";

  if (infoUrl && url) {
    const regexp = new RegExp(`${infoUrl}`, "g");
    result = result.replace(regexp, url);
  }

  if (options?.baseUrl && info.baseUrl) {
    const regexp = new RegExp(`${info.baseUrl}`, "g");
    result = result.replace(regexp, options?.baseUrl);
  }

  if (info.tenant && options?.tenantId) {
    const regexp = new RegExp(`${info.tenant}`, "g");
    result = result.replace(regexp, options?.tenantId);
  }

  return result;
}

import { C8yDefaultPactMatcher } from "./matcher";
import { C8yDefaultPactPreprocessor } from "./preprocessor";
import { C8yDefaultPactRunner } from "./runner";
import { C8yAjvSchemaMatcher, C8yQicktypeSchemaGenerator } from "./schema";
const { _ } = Cypress;

const draft06Schema = require("ajv/lib/refs/json-schema-draft-06.json");

declare global {
  namespace Cypress {
    interface Cypress {
      c8ypact: CypressC8yPact;
    }

    interface SuiteConfigOverrides {
      c8ypact?: C8yPactConfigOptions;
    }

    interface TestConfigOverrides {
      c8ypact?: C8yPactConfigOptions;
    }

    interface RuntimeConfigOptions {
      c8ypact?: C8yPactConfigOptions;
    }
  }

  /**
   * ID representing a pact object. Should be unique.
   */
  type C8yPactID = string;

  interface C8yPactConfigOptions {
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
     * Options to configure the C8yPactPreprocessor.
     */
    preprocessor?: C8yPactPreprocessorOptions;
  }
  type C8yPactConfigKeys = keyof C8yPactConfigOptions;

  /**
   * Pact object. Contains all information about a recorded pact, including
   * the pact records with requests and responses as well as info object with
   * meta data. A C8yPact objtect must have an unique id.
   */
  interface C8yPact {
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
     * Returns an iterator for the pact records.
     */
    [Symbol.iterator](): Iterator<C8yPactRecord | null>;
  }

  /**
   * Meta information describing a pact and how it was recorded.
   */
  interface C8yPactInfo extends C8yPactConfigOptions {
    /**
     * Version information of the system, runner and pact standard used to record the pact.
     */
    version?: { system?: string; c8ypact?: string; runner?: string };
    /**
     * Title of the pact. Title is an array of suite and test titles.
     */
    title?: string[];
    /**
     * Base URL when recording the pact.
     */
    baseUrl?: string;
    /**
     * Tenant when recording the pact.
     */
    tenant?: string;
  }

  /**
   * Options for saving pact objects.
   */
  interface C8yPactSaveOptions {
    noqueue: boolean;
    modifiedResponse?: Cypress.Response<any>;
  }

  /**
   * C8yPact Cypress interface. Contains all functions and properties to interact and configure
   * processing of C8yPact objects.
   */
  interface CypressC8yPact {
    /**
     * Create a C8yPactID for the current test case.
     */
    getCurrentTestId(): C8yPactID;
    /**
     * The pact object for the current test case. null if there is no recorded pact for current test.
     */
    current: C8yPact | null;
    /**
     * The C8yPactMatcher implementation used to match requests and responses. Default is C8yDefaultPactMatcher.
     * Can be overridden by setting a matcher in C8yPactConfigOptions.
     */
    matcher: C8yPactMatcher;
    /**
     * The C8yPactUrlMatcher implementation used to match records by url. Default is C8yDefaultPactUrlMatcher.
     */
    urlMatcher: C8yPactUrlMatcher;
    /**
     * The C8yPactPreprocessor implementation used to preprocess the pact objects.
     */
    preprocessor: C8yPactPreprocessor;
    /**
     * The C8ySchemaGenerator implementation used to generate json schemas from json objects.
     */
    schemaGenerator: C8ySchemaGenerator;
    /**
     * The C8ySchemaMatcher implementation used to match json schemas. Default is C8yAjvSchemaMatcher.
     */
    schemaMatcher: C8ySchemaMatcher;
    /**
     * Save the given response as a pact record in the pact for the current test case.
     */
    savePact: (
      response: Cypress.Response<any>,
      client?: C8yClient,
      options?: C8yPactSaveOptions
    ) => Promise<void>;
    /**
     * Checks if the C8yPact is enabled. Use C8Y_PACT_MODE "ignore" to disable by default.
     */
    isEnabled: () => boolean;
    /**
     * Checks if the C8yPact is enabled and in recording mode.
     */
    isRecordingEnabled: () => boolean;
    /**
     * Runtime used to run the pact objects. Default is C8yDefaultPactRunner.
     */
    pactRunner: C8yPactRunner;
    /**
     * Use debugLog to enable logging of debug information to the Cypress debug log.
     */
    debugLog: boolean;

    config: Omit<C8yPactConfigOptions, "id">;
    /**
     * Resolves config values from current test annotation and global config in Cypress.c8ypact.config.
     * If needed also resolves environment variables.
     * @param key The key of the config value to resolve.
     */
    getConfigValue<T = any>(
      key: C8yPactConfigKeys,
      defaultValue?: any
    ): T | undefined;
    /**
     * Resolves config values from current test annotation and global config in Cypress.c8ypact.config.
     */
    getConfigValues(): C8yPactConfigOptions;
  }

  /**
   * The request stored in a C8yPactRecord.
   */
  type C8yPactRequest = Partial<Cypress.RequestOptions> & {
    $body?: string;
  };

  /**
   * The response stored in a C8yPactRecord.
   */
  interface C8yPactResponse<T> {
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
  interface C8yPactRecord {
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
    options: C8yClientOptions;
    /**
     * Auth information used for the request. Can be Basic or Cookie auth. Contains username and possibly alias.
     */
    auth: C8yAuthOptions;
    /**
     * Id of an object created by the request. Used for mapping when running the recording.
     */
    createdObject: string;

    /**
     * Converts the C8yPactRecord to a Cypress.Response object.
     */
    toCypressResponse(): Cypress.Response<any>;
    /**
     * Returns the date of the response.
     */
    date(): Date;
  }

  interface C8yPactUrlMatcher {
    /**
     * List of parameters to ignore when matching urls.
     * Default parameters ignored are dateFrom, dateTo and _.
     */
    ignoreParameters: string[];

    /**
     * Matches two urls. Returns true if the urls match, false otherwise.
     *
     * @param url1 First url to match.
     * @param url2 Second url to match.
     */
    match: (url1: string | URL, url2: string | URL) => boolean;
  }

  /**
   * The C8yPactNextRecord contains a single pact record and the info object.
   */
  type C8yPactNextRecord = { record: C8yPactRecord; info?: C8yPactInfo };

  /**
   * Checks if the given object is a C8yPactRecord.
   *
   * @param obj The object to check.
   * @returns True if the object is a C8yPactRecord, false otherwise.
   */
  function isPactRecord(obj: any): obj is C8yPactRecord;

  /**
   * Checks if the given object is a C8yPact.
   *
   * @param obj The object to check.
   * @returns True if the object is a C8yPact, false otherwise.
   */
  function isPact(obj: any): obj is C8yPact;
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
   * @param client The optional C8yClient for options and auth information.
   */
  static from(
    obj: C8yPact | string | Cypress.Response<any>,
    client?: C8yClient
  ): C8yDefaultPact {
    if (!obj) {
      throw new Error("Can not create pact from null or undefined.");
    }
    if (isCypressResponse(obj)) {
      const pactRecord = createPactRecord(obj, client);
      const id = Cypress.c8ypact.getCurrentTestId();
      if (!id) return;

      const info = createPactInfo(id, client);
      return new C8yDefaultPact([pactRecord], info, id);
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
          record.options,
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
   * Loads the pact object for the current test from the pact file. If
   * there is no stored pact object for the current test, null is returned.
   */
  static loadCurrent(): Cypress.Chainable<C8yPact | null> {
    if (!isEnabled()) {
      return cy.wrap<C8yPact | null>(null, debugLogger());
    }
    return cy
      .task<C8yPact | null>(
        "c8ypact:get",
        Cypress.c8ypact.getCurrentTestId(),
        debugLogger()
      )
      .then((pact) => {
        if (pact == null) return cy.wrap<C8yPact>(null, debugLogger());

        // required to map the record object to a C8yPactRecord here as this can
        // not be done in the plugin
        pact.records = pact.records?.map((record) => {
          return C8yDefaultPactRecord.from(record);
        });
        return cy.wrap(
          new C8yDefaultPact(pact.records, pact.info, pact.id),
          debugLogger()
        );
      });
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

  /**
   * Returns the pact record for the given request or null if no record is found.
   * @param req The request of type CyHttpMessages.IncomingHttpRequest
   */
  getRecordsMatchingRequest(req: any): C8yPactRecord[] | null {
    const matcher = Cypress.c8ypact.urlMatcher;
    const records = this.records.filter((record) => {
      return (
        matcher.match(record.request.url, req.url) &&
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
 * a C8yPactRecord from a Cypress.Response object or an C8yPactRecord object. Note,
 * objects implementing the C8yPactRecord interface may not provide all required
 * functions and properties.
 */
export class C8yDefaultPactRecord implements C8yPactRecord {
  request: C8yPactRequest;
  response: C8yPactResponse<any>;
  options: C8yClientOptions;
  auth: C8yAuthOptions;
  createdObject: string;
  modifiedResponse?: C8yPactResponse<any>;

  constructor(
    request: C8yPactRequest,
    response: C8yPactResponse<any>,
    options: C8yClientOptions,
    auth?: C8yAuthOptions,
    createdObject?: string,
    modifiedResponse?: C8yPactResponse<any>
  ) {
    this.request = request;
    this.response = response;
    if (options) {
      this.options = options;
    }
    if (auth) {
      this.auth = auth;
    }
    if (createdObject) {
      this.createdObject = createdObject;
    }
    if (modifiedResponse) {
      this.modifiedResponse = modifiedResponse;
    }
  }

  /**
   * Creates a C8yPactRecord from a Cypress.Response or an C8yPactRecord object.
   * @param obj The Cypress.Response object.
   * @param client The C8yClient for options and auth information.
   */
  static from(
    obj: Cypress.Response<any> | C8yPactRecord,
    client: C8yClient = null
  ): C8yPactRecord {
    if (obj == null) return;
    if ("request" in obj && "response" in obj) {
      return new C8yDefaultPactRecord(
        _.get(obj, "request"),
        _.get(obj, "response"),
        _.get(obj, "options"),
        _.get(obj, "auth"),
        _.get(obj, "createdObject"),
        _.get(obj, "modifiedResponse")
      );
    }
    // @ts-ignore
    return createPactRecord(obj, client);
  }

  /**
   * Returns the date of the response.
   */
  date(): Date {
    const date = _.get(this.response, "headers.date");
    if (date) {
      return new Date(date);
    }
    return null;
  }

  /**
   * Converts the C8yPactRecord to a Cypress.Response object.
   */
  toCypressResponse<T>(): Cypress.Response<T> {
    let result = _.cloneDeep(this.response);
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
 * Default implementation of C8yPactUrlMatcher. URL matching can be configured
 * to ignore certain parameters (such as dateFrom, dateTo, etc.).
 */
export class C8yDefaultPactUrlMatcher implements C8yPactUrlMatcher {
  ignoreParameters: string[] = [];
  constructor(ignoreParameters: string[] = []) {
    this.ignoreParameters = ignoreParameters;
  }

  match(url1: string | URL, url2: string | URL): boolean {
    if (!url1 || !url2) return false;
    const normalizeUrl = (
      url: string | URL,
      parametersToRemove: string[] = []
    ) => {
      const urlObj = isURL(url) ? url : new URL(decodeURIComponent(url));
      parametersToRemove.forEach((name) => {
        urlObj.searchParams.delete(name);
      });
      return decodeURIComponent(
        urlObj.toString()?.replace(Cypress.config().baseUrl, "")
      );
    };

    return _.isEqual(
      normalizeUrl(url1, this.ignoreParameters),
      normalizeUrl(url2, this.ignoreParameters)
    );
  }
}

function isURL(obj: any): obj is URL {
  return obj instanceof URL;
}

if (!Cypress.c8ypact) {
  Cypress.c8ypact = {
    current: null,
    getCurrentTestId,
    isRecordingEnabled,
    savePact,
    isEnabled,
    matcher: new C8yDefaultPactMatcher(),
    urlMatcher: new C8yDefaultPactUrlMatcher(["dateFrom", "dateTo", "_"]),
    pactRunner: new C8yDefaultPactRunner(),
    schemaGenerator: new C8yQicktypeSchemaGenerator(),
    schemaMatcher: new C8yAjvSchemaMatcher([draft06Schema]),
    debugLog: false,
    preprocessor: new C8yDefaultPactPreprocessor(),
    config: {
      failOnMissingPacts: true,
      strictMatching: true,
      preprocessor: {
        obfuscate: ["request.headers.Authorization", "response.body.password"],
      },
    },
    getConfigValue: (key: C8yPactConfigKeys, defaultValue?: any) => {
      const value =
        _.get(Cypress.config(), key) ?? _.get(Cypress.c8ypact.config, key);
      return value != null ? value : defaultValue;
    },
    getConfigValues: () => {
      const config = _.merge(
        {},
        Cypress.c8ypact.config,
        Cypress.config().c8ypact
      );
      config.consumer = _.isString(config.consumer)
        ? { name: config.consumer }
        : config.consumer;
      config.producer = _.isString(config.producer)
        ? { name: config.producer }
        : config.producer;
      config.preprocessor = Cypress.c8ypact.preprocessor.getOptions();
      return config;
    },
  };
}

function debugLogger(): Cypress.Loggable {
  return { log: Cypress.c8ypact.debugLog };
}

before(() => {
  const pacter = Cypress.c8ypact;
  if (!pacter.isRecordingEnabled()) {
    cy.task("c8ypact:load", Cypress.config().fixturesFolder, debugLogger());
  }
});

beforeEach(() => {
  Cypress.c8ypact.current = null;
  if (Cypress.c8ypact.isRecordingEnabled()) {
    cy.task(
      "c8ypact:remove",
      Cypress.c8ypact.getCurrentTestId(),
      debugLogger()
    );
  } else if (isEnabled()) {
    C8yDefaultPact.loadCurrent().then((pact) => {
      Cypress.c8ypact.current = pact;
    });
  }
});

function isEnabled(): boolean {
  return (
    Cypress.env("C8Y_PLUGIN_LOADED") != null &&
    Cypress.env("C8Y_PACT_MODE") !== "ignore"
  );
}

function isRecordingEnabled(): boolean {
  return isEnabled() && Cypress.env("C8Y_PACT_MODE") === "recording";
}

function getCurrentTestId(): C8yPactID {
  let key = Cypress.currentTest?.titlePath?.join("__");
  if (key == null) {
    key = Cypress.spec?.relative?.split("/").slice(-2).join("__");
  }
  const pact = Cypress.config().c8ypact;
  return (pact && pact.id) || key.replace(/ /g, "_");
}

function savePact(
  response: Cypress.Response<any>,
  client?: C8yClient,
  options: C8yPactSaveOptions = { noqueue: false }
): Promise<void> {
  if (!isEnabled()) return;

  const pact = C8yDefaultPact.from(response, client);

  if (options.modifiedResponse && isCypressResponse(options.modifiedResponse)) {
    const modifiedPactRecord = C8yDefaultPactRecord.from(
      options.modifiedResponse,
      client
    );
    pact.records[pact.records.length - 1].modifiedResponse =
      modifiedPactRecord.response;
  }

  Cypress.c8ypact.preprocessor?.apply(pact);

  const keysToSave = ["id", "info", "records"];
  return Promise.all(
    pact.records
      .filter((record: C8yPactRecord) => !record.response.$body)
      .map((record) =>
        Cypress.c8ypact.schemaGenerator
          ?.generate(record.response.body, { name: "body" })
          .then((schema) => {
            record.response.$body = schema;
            return record;
          })
      )
  )
    .then(() => {
      const data = { ..._.pick(pact, keysToSave) };
      save(data, options);
    })
    .catch((error) => {
      console.error(error);
      const data = { ..._.pick(pact, keysToSave) };
      save(data, options);
    });
}

function save(pact: any, options: C8yPactSaveOptions) {
  const taskName = "c8ypact:save";
  if (options?.noqueue === true) {
    // @ts-ignore
    const { args, promise } = Cypress.emitMap("command:invocation", {
      name: "task",
      args: [taskName, pact],
    })[0];
    new Promise((r) => promise.then(r))
      .then(() =>
        // @ts-ignore
        Cypress.backend("run:privileged", {
          commandName: "task",
          args,
          options: {
            task: taskName,
            arg: pact,
          },
        })
      )
      .catch(() => {});
  } else {
    cy.task("c8ypact:save", pact, debugLogger());
  }
}

function createPactInfo(id: string, client: C8yClient = null): C8yPactInfo {
  const info: C8yPactInfo = {
    ...Cypress.c8ypact.getConfigValues(),
    id,
    title: Cypress.currentTest?.titlePath || [],
    tenant: client?._client?.core.tenant || Cypress.env("C8Y_TENANT"),
    baseUrl: Cypress.config().baseUrl,
    version: Cypress.env("C8Y_VERSION") && {
      system: Cypress.env("C8Y_VERSION"),
    },
  };
  return info;
}

function isPact(obj: any): obj is C8yPact {
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
global.isPact = isPact;

function isPactRecord(obj: any): obj is C8yPactRecord {
  return (
    _.isObjectLike(obj) &&
    "request" in obj &&
    _.isObjectLike(_.get(obj, "request")) &&
    "response" in obj &&
    _.isObjectLike(_.get(obj, "response")) &&
    _.isFunction(_.get(obj, "toCypressResponse"))
  );
}
global.isPactRecord = isPactRecord;

export function isPactError(error: any): boolean {
  return _.isError(error) && _.get(error, "name") === "C8yPactError";
}

function createPactRecord(
  response: Cypress.Response<any>,
  client: C8yClient = null
): C8yPactRecord {
  const r = _.cloneDeep(response);
  const pact = new C8yDefaultPactRecord(
    {
      ...(r?.method && { method: r.method }),
      ...(r?.url && { url: r.url }),
      ...(r?.requestBody && { body: r.requestBody }),
      ...(r?.requestHeaders && { headers: r.requestHeaders }),
    },
    {
      ...(r?.status && { status: r.status }),
      ...(r?.duration && { duration: r.duration }),
      ...(r?.isOkStatusCode && { isOkStatusCode: r.isOkStatusCode }),
      ...(r?.statusText && { statusText: r.statusText }),
      ...(r?.body && { body: r.body }),
      ...(r?.headers && { headers: r.headers }),
      ...(r?.allRequestResponses && {
        allRequestResponses: r.allRequestResponses,
      }),
      ...(_.get(r, "$body") && { $body: _.get(r, "$body") }),
    },
    client?._options
  );

  const envUser = Cypress.env("C8Y_LOGGED_IN_USER");
  const envAlias = Cypress.env("C8Y_LOGGED_IN_USER_ALIAS");
  const envAuth = {
    ...(envUser && { user: envUser }),
    ...(envAlias && { userAlias: envAlias }),
    ...(envAlias && { type: "CookieAuth" }),
  };

  if (client?._auth) {
    // do not pick the password. passwords must not be stored in the pact.
    pact.auth = _.defaultsDeep(
      client._auth,
      _.pick(envAuth, ["user", "userAlias", "type"])
    );
    if (client._auth.constructor != null) {
      pact.auth.type = client._auth.constructor.name;
    }
  }
  if (!pact.auth && (envUser || envAlias)) {
    pact.auth = envAuth;
  }

  if (response.method === "POST") {
    const newId = response.body.id;
    if (newId) {
      pact.createdObject = newId;
    }
  }

  return pact;
}

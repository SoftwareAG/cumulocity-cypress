const { _ } = Cypress;

declare global {
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
   * The request stored in a C8yPactRecord.
   */
  type C8yPactRequest = Partial<Cypress.RequestOptions> & {
    $body?: any;
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
   * @param obj The Cypress.Response<any> or C8yPactRecord object.
   * @param client The C8yClient for options and auth information.
   */
  static from(
    obj: Cypress.Response<any> | C8yPactRecord | Partial<Cypress.Response<any>>,
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
globalThis.isPact = isPact;

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
globalThis.isPactRecord = isPactRecord;

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

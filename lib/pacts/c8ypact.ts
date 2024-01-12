import { C8yDefaultPactMatcher } from "./matcher";
import { C8yPactDefaultPreprocessor } from "./preprocessor";
import { C8yDefaultPactRunner } from "./runner";
const { _ } = Cypress;

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

  interface C8yPactConfigOptions {
    id?: string;
    log?: boolean;
    matcher?: C8yPactMatcher;
    producer?: { name: string; version?: string };
    consumer?: { name: string; version?: string };
    tags?: string[];
    description?: string;
    ignore?: boolean;
  }

  /**
   * ID representing a pact object. Should be unique.
   */
  type C8yPactID = string;

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
  }

  /**
   *
   */
  interface C8yPactInfo {
    /**
     * Information describing the producer of the pact.
     */
    producer?: { name: string; version?: string };
    /**
     * Information describing the consumer of the pact.
     */
    consumer?: { name: string; version?: string };
    /**
     * Preprocessor used to preprocess the pact.
     */
    preprocessor?: C8yPactPreprocessorOptions;
    /**
     * Tags describing the pact.
     */
    tags?: string[];
    /**
     * Description of the pact.
     */
    description?: string;
    /**
     * Version information of the system, runner and pact standard used to record the pact.
     */
    version?: { system?: string; c8ypact?: string; runner?: string };
    /**
     * Title of the pact. Title is an array of suite and test titles.
     */
    title?: string[];
    /**
     * Id of the pact.
     */
    id?: C8yPactID;
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
   * C8yPact Cypress interface. Contains all functions and properties to interact and configure
   * processing of C8yPact objects.
   */
  interface CypressC8yPact {
    /**
     * The C8yPactMatcher implementation used to match requests and responses. Default is C8yDefaultPactMatcher.
     * Can be overridden by setting a matcher in C8yPactConfigOptions.
     */
    matcher: C8yPactMatcher;
    /**
     * The C8yPactPreprocessor implementation used to preprocess the pact objects.
     */
    preprocessor: C8yPactPreprocessor;
    /**
     * Get the pact identifiert for the current test case. The identifier is used to identify the pact.
     */
    currentPactIdentifier: () => C8yPactID;
    /**
     * Get the pact filename for the current test case. The filename is used to store the pact.
     */
    currentPactFilename: () => string;
    /**
     * Get the next pact record for the current test case as stored in C8yPact records.
     */
    currentNextRecord: () => Cypress.Chainable<C8yPactNextRecord | null>;
    /**
     * Get the pact for the current test case.
     */
    currentPact: () => Cypress.Chainable<C8yPact | null>;
    /**
     * Save the given response as a pact record in the pact for the current test case.
     */
    savePact: (response: Cypress.Response<any>, client?: C8yClient) => void;
    /**
     * Checks if the C8yPact plugin is enabled.
     */
    isEnabled: () => boolean;
    /**
     * Checks if the C8yPact plugin is enabled and in recording mode.
     */
    isRecordingEnabled: () => boolean;
    /**
     * Use failOnMissingPacts to disable failing the test if no pact or no next record
     * is found for the current test case.
     */
    failOnMissingPacts: boolean;
    /**
     * Use strictMatching to enable strict matching of the pact records. If strict matching
     * is enabled, all properties of the pact records must match and tests fail if a property
     * is missing.
     */
    strictMatching: boolean;
    /**
     * Runtime used to run the pact objects. Default is C8yDefaultPactRunner.
     */
    pactRunner: C8yPactRunner;
    /**
     * Use debugLog to enable logging of debug information to the Cypress debug log.
     */
    debugLog: boolean;
  }

  /**
   * The request stored in a C8yPactRecord.
   */
  type C8yPactRequest = Partial<Cypress.RequestOptions>;

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
  }

  /**
   * The C8yPactRecord contains all information about a recorded request. It contains
   * the request and response as well as configuration options, auth information and
   * the created object id.
   */
  interface C8yPactRecord {
    request: C8yPactRequest;
    response: C8yPactResponse<any>;
    options: C8yClientOptions;
    auth: C8yAuthOptions;
    createdObject: string;

    /**
     * Converts the C8yPactRecord to a Cypress.Response object.
     */
    toCypressResponse(): Cypress.Response<any>;
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
 * Default implementation of C8yPactRecord.
 */
export class C8yDefaultPactRecord implements C8yPactRecord {
  request: C8yPactRequest;
  response: C8yPactResponse<any>;
  options: C8yClientOptions;
  auth: C8yAuthOptions;
  createdObject: string;

  constructor(
    request: C8yPactRequest,
    response: C8yPactResponse<any>,
    options: C8yClientOptions,
    auth?: C8yAuthOptions,
    createdObject?: string
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
  }

  /**
   * Creates a C8yPactRecord from a Cypress.Response object.
   * @param response The Cypress.Response object.
   * @param client The C8yClient for options and auth information.
   */
  static from(
    response: Cypress.Response<any>,
    client: C8yClient = null
  ): C8yPactRecord {
    return createPactRecord(response, client);
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

Cypress.c8ypact = {
  currentPactIdentifier,
  currentPact,
  currentPactFilename,
  currentNextRecord,
  isRecordingEnabled,
  savePact,
  isEnabled,
  matcher: new C8yDefaultPactMatcher(),
  preprocessor: new C8yPactDefaultPreprocessor(),
  pactRunner: new C8yDefaultPactRunner(),
  failOnMissingPacts: true,
  strictMatching: true,
  debugLog: true,
};

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
  if (Cypress.c8ypact.isRecordingEnabled()) {
    cy.task(
      "c8ypact:remove",
      Cypress.c8ypact.currentPactIdentifier(),
      debugLogger()
    );
  }
});

function currentPactIdentifier(): C8yPactID {
  let key = Cypress.currentTest?.titlePath?.join("__");
  if (key == null) {
    key = Cypress.spec?.relative?.split("/").slice(-2).join("__");
  }
  const pact = Cypress.config().c8ypact;
  return (pact && pact.id) || key.replace(/ /g, "_");
}

function currentPactFilename(): string {
  const pactId = Cypress.c8ypact.currentPactIdentifier();
  return `${Cypress.config().fixturesFolder}/c8ypact/${pactId}.json`;
}

function isEnabled(): boolean {
  return Cypress.env("C8Y_PACT_ENABLED") != null;
}

function isRecordingEnabled(): boolean {
  return isEnabled() && Cypress.env("C8Y_PACT_MODE") === "recording";
}

function savePact(response: Cypress.Response<any>, client?: C8yClient) {
  if (!isEnabled()) return;

  const pactRecord = createPactRecord(response, client);
  const id = Cypress.c8ypact.currentPactIdentifier();
  if (!id) return;

  const info = createPactInfo(id, client);
  const folder = Cypress.config().fixturesFolder;

  const pact: C8yPact = {
    id,
    info,
    records: [pactRecord],
  };
  Cypress.c8ypact.preprocessor?.apply(pact);

  const name = "c8ypact:save";
  const data = {
    ...pact,
    folder,
  };

  // @ts-ignore
  const ret = cy.state("commandIntermediateValue");
  if (ret) {
    // @ts-ignore
    const { args, promise } = Cypress.emitMap("command:invocation", {
      name: "task",
      args: [name, data],
    })[0];
    new Promise((r) => promise.then(r))
      .then(() =>
        // @ts-ignore
        Cypress.backend("run:privileged", {
          commandName: "task",
          args,
          options: {
            task: name,
            arg: data,
          },
        })
      )
      .catch(() => {});
  } else {
    cy.task(
      "c8ypact:save",
      {
        ...pact,
        folder,
      },
      debugLogger()
    );
  }
}

function currentPact(): Cypress.Chainable<C8yPact | null> {
  if (!isEnabled()) {
    return cy.wrap<C8yPact | null>(null);
  }
  return cy
    .task<C8yPact | null>(
      "c8ypact:get",
      Cypress.c8ypact.currentPactIdentifier(),
      debugLogger()
    )
    .then((pact) => {
      if (pact == null) {
        return cy.wrap<C8yPact>(null);
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
      return cy.wrap(pact);
    });
}

function currentNextRecord(): Cypress.Chainable<{
  record: C8yPactRecord;
  info?: C8yPactInfo;
} | null> {
  if (!isEnabled()) {
    return cy.wrap<{
      record: C8yPactRecord;
      info?: C8yPactInfo;
    } | null>(null);
  }

  return cy
    .task<C8yPactNextRecord>(
      "c8ypact:next",
      Cypress.c8ypact.currentPactIdentifier(),
      debugLogger()
    )
    .then((r) => {
      if (r == null) {
        return cy.wrap<C8yPactNextRecord | null>(null);
      }
      // required to map the record object to a C8yPactRecord here as this can
      // not be done in the plugin
      cy.wrap<C8yPactNextRecord>({
        record: new C8yDefaultPactRecord(
          r.record.request,
          r.record.response,
          r.record.options,
          r.record.auth,
          r.record.createdObject
        ),
        info: r.info,
      });
    });
}

function createPactInfo(id: string, client: C8yClient = null): C8yPactInfo {
  const c8ypact = Cypress.config().c8ypact;
  const info = {
    title: Cypress.currentTest?.titlePath || [],
    id,
    preprocessor: {
      obfuscate: Cypress.env("C8Y_PACT_OBFUSCATE") || [],
      ignore: Cypress.env("C8Y_PACT_IGNORE") || [],
      obfuscationPattern:
        Cypress.c8ypact.preprocessor?.defaultObfuscationPattern,
    },
    consumer: c8ypact?.consumer,
    producer: c8ypact?.producer,
    description: Cypress.config().c8ypact?.description,
    tags: Cypress.config().c8ypact?.tags,
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
    _.every(_.get(obj, "records"), isPactRecord)
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
    },
    client?._options
  );

  const envUser = Cypress.env("C8Y_LOGGED_IN_USER");
  const envAlias = Cypress.env("C8Y_LOGGED_IN_USERALIAS");
  const envAuth = {
    ...(envUser && { user: envUser }),
    ...(envAlias && { userAlias: envAlias }),
  };

  if (client?._auth) {
    // do not pick the password. passwords must not be stored in the pact.
    pact.auth = { ...envAuth, ..._.pick(client._auth, ["user", "userAlias"]) };
    pact.auth.type = client._auth.constructor.name;
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

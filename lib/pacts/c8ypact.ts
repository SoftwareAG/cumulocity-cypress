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

  type C8yPactID = string;

  interface C8yPact {
    records: C8yPactRecord[];
    info: C8yPactInfo;
    id: C8yPactID;
  }

  interface C8yPactInfo {
    producer?: { name: string; version?: string };
    consumer?: { name: string; version?: string };
    preprocessor?: C8yPactPreprocessorOptions;
    tags?: string[];
    description?: string;
    version?: { system?: string; c8ypact?: string; runner?: string };
    title?: string[];
    id?: C8yPactID;
    baseUrl?: string;
    tenant?: string;
  }

  interface CypressC8yPact {
    matcher: C8yPactMatcher;
    preprocessor: C8yPactPreprocessor;
    currentPactIdentifier: () => C8yPactID;
    currentPactFilename: () => string;
    currentNextRecord: () => Cypress.Chainable<C8yPactNextRecord | null>;
    currentPact: () => Cypress.Chainable<C8yPact | null>;
    currentMatcher: () => C8yPactMatcher;
    savePact: (response: Cypress.Response<any>, client?: C8yClient) => void;
    isEnabled: () => boolean;
    isRecordingEnabled: () => boolean;
    failOnMissingPacts: boolean;
    strictMatching: boolean;
    pactRunner: C8yPactRunner;
    debugLog: boolean;
  }

  type C8yPactRequest = Partial<Cypress.RequestOptions>;

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

  interface C8yPactRecord {
    request: C8yPactRequest;
    response: C8yPactResponse<any>;
    options: C8yClientOptions;
    auth: C8yAuthOptions;
    createdObject: string;

    toCypressResponse(): Cypress.Response<any>;
  }

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

  static from(
    response: Cypress.Response<any>,
    client: C8yClient = null
  ): C8yPactRecord {
    return createPactRecord(response, client);
  }

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
  currentMatcher,
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

function currentMatcher(): C8yPactMatcher {
  const pact = Cypress.config().c8ypact;
  return (pact && pact.matcher) || Cypress.c8ypact.matcher;
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
  Cypress.c8ypact.preprocessor.apply(pact);

  cy.task(
    "c8ypact:save",
    {
      ...pact,
      folder,
    },
    debugLogger()
  );
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
        Cypress.c8ypact.preprocessor.defaultObfuscationPattern,
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

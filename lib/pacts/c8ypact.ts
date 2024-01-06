import { Client } from "@c8y/client";
import { C8yDefaultPactMatcher } from "./matcher";
import { C8yPactDefaultPreprocessor } from "./preprocessor";
import { C8yDefaultPactRunner } from "./runner";
const { _ } = Cypress;

declare global {
  namespace Cypress {
    interface Cypress {
      c8ypact: CypressPact;
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

  interface CypressPact {
    matcher: C8yPactMatcher;
    preprocessor: C8yPactPreprocessor;
    currentPactIdentifier: () => C8yPactID;
    currentPactFilename: () => string;
    currentNextRecord: <T = any>() => Cypress.Chainable<{
      record: C8yPactRecord;
      info?: C8yPactInfo;
    } | null>;
    currentPacts: () => Cypress.Chainable<C8yPact | null>;
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
    createdObject: string | string[];

    toCypressResponse(): Cypress.Response<any>;
  }

  /**
   * Checks if the given object is a C8yPactRecord.
   *
   * @param obj The object to check.
   * @returns True if the object is a C8yPactRecord, false otherwise.
   */
  function isPactRecord(obj: any): obj is C8yPactRecord;
}

export class C8yDefaultPactRecord implements C8yPactRecord {
  request: C8yPactRequest;
  response: C8yPactResponse<any>;
  options: C8yClientOptions;
  auth: C8yAuthOptions;
  createdObject: string | string[];

  constructor(
    request: C8yPactRequest,
    response: C8yPactResponse<any>,
    options: C8yClientOptions,
    auth?: C8yAuthOptions,
    createdObject?: string | string[]
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
  currentPactIdentifier: pactIdentifier,
  currentMatcher,
  currentPacts,
  currentPactFilename,
  currentNextRecord: getNextRecord,
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

function pactIdentifier(): C8yPactID {
  let key = Cypress.currentTest?.titlePath?.join("__");
  if (key == null) {
    key = Cypress.spec?.relative?.split("/").slice(-2).join("__");
  }
  const pact = Cypress.config().c8ypact;
  return (pact && pact.id) || key.replace(/ /g, "_");
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

  const preprocessedResponse = _.cloneDeep(response);
  Cypress.c8ypact.preprocessor.apply(preprocessedResponse);
  const pactRecord = createPactRecord(preprocessedResponse, client);
  const id = Cypress.c8ypact.currentPactIdentifier();
  if (!id) return;

  const info = createPactInfo(id, client);
  const folder = Cypress.config().fixturesFolder;

  const pactFile: C8yPact = {
    id,
    info,
    records: [pactRecord],
  };
  cy.task(
    "c8ypact:save",
    {
      ...pactFile,
      folder,
    },
    debugLogger()
  );
}

function currentPacts(): Cypress.Chainable<C8yPact | null> {
  return !isEnabled()
    ? cy.wrap<C8yPact | null>(null, debugLogger())
    : cy.task<C8yPact>(
        "c8ypact:get",
        Cypress.c8ypact.currentPactIdentifier(),
        debugLogger()
      );
}

function currentPactFilename(): string {
  const pactId = Cypress.c8ypact.currentPactIdentifier();
  return `${Cypress.config().fixturesFolder}/c8ypact/${pactId}.json`;
}

function getNextRecord(): Cypress.Chainable<{
  record: C8yPactRecord;
  info?: C8yPactInfo;
} | null> {
  if (!isEnabled()) {
    return cy.wrap<{
      record: C8yPactRecord;
      info?: C8yPactInfo;
    } | null>(null);
  }

  return cy.task<{
    info?: C8yPactInfo;
    record: C8yPactRecord;
  }>("c8ypact:next", Cypress.c8ypact.currentPactIdentifier(), debugLogger());
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

function isPactRecord(obj: any): obj is C8yPactRecord {
  return (
    _.isObject(obj) &&
    _.has(obj, "request") &&
    _.isPlainObject(_.get(obj, "request")) &&
    _.has(obj, "response") &&
    _.isPlainObject(_.get(obj, "response")) &&
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

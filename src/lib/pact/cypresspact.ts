import {
  C8yDefaultPact,
  C8yDefaultPactRecord,
  C8yPact,
  C8yPactConfigKeys,
  C8yPactConfigOptions,
  C8yPactID,
  C8yPactInfo,
  C8yPactRecord,
  C8yDefaultPactPreprocessor,
  C8yPactPreprocessor,
  C8yPactPreprocessorOptions,
  C8ySchemaGenerator,
  C8ySchemaMatcher,
  C8yDefaultPactMatcher,
  C8yPactMatcher,
  toPactSerializableObject,
  C8yPactEnv,
  C8yPactSaveKeys,
  C8yPactMode,
  C8yPactRecordingMode,
  C8yPactRecordingModeValues,
  C8yPactModeValues,
  pactId,
} from "../../shared/c8ypact";
import { C8yDefaultPactRunner } from "./runner";
import { C8yAuthOptions } from "../../shared/auth";
import { C8yClient } from "../../shared/c8yclient";
import { getBaseUrlFromEnv } from "../utils";
import * as semver from "semver";

const { _ } = Cypress;

import { FetchClient, IAuthentication } from "@c8y/client";
import { C8yPactFetchClient } from "./fetchclient";

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
   * Options for saving pact objects.
   */
  interface C8yPactSaveOptions {
    noqueue: boolean;
    modifiedResponse?: Cypress.Response<any>;
    loggedInUser?: string;
    loggedInUserAlias?: string;
  }

  /**
   * C8yPact Cypress interface. Contains all functions and properties to interact and configure
   * processing of C8yPact objects.
   */
  interface CypressC8yPact {
    /**
     * The pact mode for the current tests.
     */
    mode: () => C8yPactMode;
    /**
     * The pact recording mode for the current tests.
     */
    recordingMode: () => C8yPactRecordingMode;
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
    matcher?: C8yPactMatcher;
    /**
     * The C8yPactPreprocessor implementation used to preprocess the pact objects.
     */
    preprocessor?: C8yPactPreprocessor;
    /**
     * The C8ySchemaGenerator implementation used to generate json schemas from json objects. The
     * implementation of `C8ySchemaGenerator` must support browser runtimes!
     * Default is undefined and schema generation is disabled.
     */
    schemaGenerator?: C8ySchemaGenerator;
    /**
     * The C8ySchemaMatcher implementation used to match json schemas. The schema matcher implementation
     * must support browser runtimes! Default is undefined and schema matching is disabled.
     */
    schemaMatcher?: C8ySchemaMatcher;
    /**
     * Save the given response as a pact record in the pact for the current test case.
     */
    savePact: (
      response:
        | Cypress.Response<any>
        | C8yPact
        | Pick<C8yPact, C8yPactSaveKeys>,
      client?: C8yClient,
      options?: C8yPactSaveOptions
    ) => Promise<void>;
    /**
     * Checks if the C8yPact is enabled. Use C8Y_PACT_IGNORE="true" to disable by default.
     */
    isEnabled: () => boolean;
    /**
     * Checks if the C8yPact is enabled and in recording mode. Use C8Y_PACT_MODE="record" to enable recording.
     */
    isRecordingEnabled: () => boolean;
    /**
     * Checks if the C8yPact is enabled and in mocking mode. Use C8Y_PACT_MODE="mock" to enable mocking.
     */
    isMockingEnabled: () => boolean;
    /**
     * Runtime used to run the pact objects. Default is C8yDefaultPactRunner.
     */
    pactRunner?: C8yPactRunner;
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
    /**
     * Loads the pact object for the current test from the pact file. If
     * there is no stored pact object for the current test, null is returned.
     */
    loadCurrent(): Cypress.Chainable<C8yPact | null>;
    /**
     * Resolves all environment variables as a C8yPactEnv object.
     */
    env(): C8yPactEnv;
    /**
     * Create a custom FetchClient from given auth options and baseUrl. Default implementation
     * of FetchClient is C8yPactFetchClient. Override to provide a custom FetchClient implementation to
     * cy.mount. If undefined is returned, cy.mount will not register a custom FetchClient provider.
     */
    createFetchClient(
      auth: C8yAuthOptions | IAuthentication | undefined,
      baseUrl: string
    ): FetchClient;
    /**
     * Callbacks for hooking into the pact object lifecycle.
     */
    on: CypressC8yPactCallbackOptions;
  }

  export interface CypressC8yPactCallbackOptions {
    /**
     * Called before a request and its response are saved. By returning `undefined`, the
     * request is ignored and not saved. Use for custom preprocessing or filtering of records.
     * @param record The request and response to be saved as `C8yPactRecord`.
     * @returns C8yPactRecord or undefined if the record should be ignored.
     */
    saveRecord?: (record: C8yPactRecord) => C8yPactRecord | undefined;
    /**
     * Called before a record is mocked. By returning `undefined`, the pact is ignored and not mocked.
     * @param record The record to use for creating a mock response.
     * @returns C8yPactRecord or undefined if the record should be ignored.
     */
    mockRecord?: (
      record: C8yPactRecord | undefined
    ) => C8yPactRecord | undefined;
    /**
     * Called before a pact is saved. By returning `undefined`, the pact is ignored and not saved.
     * @param pact The pact to be saved.
     * @returns C8yPact or undefined if the pact should be ignored.
     */
    savePact?: (pact: C8yPact) => C8yPact | undefined;
    /**
     * Called after a pact has been loaded and initialized as `Cypress.c8ypact.current`.
     * @param pact The pact that has been loaded.
     * @returns C8yPact now used as `Cypress.c8ypact.current`.
     */
    loadPact?: (pact: C8yPact) => void;
    /**
     * Called for matching errors from `cy.c8ymatch` for custom error handling. By providing a custom
     * error handler, the default error handling is disabled. To fail tests for matching errors, you
     * must throw an error in the custom error handler.
     * @param matcher The matcher used to match the request and response.
     * @param record The pact record used for matching.
     * @param options The options used for matching.
     */
    matchingError?: (
      matcher: C8yPactMatcher | C8ySchemaMatcher,
      error: Error,
      options: any
    ) => void;
  }

  /**
   * The C8yPactNextRecord contains a single pact record and the info object.
   */
  type C8yPactNextRecord = { record: C8yPactRecord; info?: C8yPactInfo };
}

/**
 * The C8yCypressEnvPreprocessor is a preprocessor implementation that uses
 * Cypress environment variables to configure C8yPactPreprocessorOptions.
 *
 * Options are deep merged in the following order:
 * - Cypress environment variables
 * - C8yPactPreprocessorOptions passed to the apply method
 * - C8yPactPreprocessorOptions passed to the constructor
 * - Cypress.c8ypact.config value for preprocessor
 */
export class C8yCypressEnvPreprocessor extends C8yDefaultPactPreprocessor {
  apply(
    obj: Partial<Cypress.Response<any> | C8yPactRecord | C8yPact>,
    options?: C8yPactPreprocessorOptions
  ): void {
    super.apply(obj, this.resolveOptions(options));
  }

  resolveOptions(
    options?: Partial<C8yPactPreprocessorOptions>
  ): C8yPactPreprocessorOptions {
    let preprocessorConfigValue: C8yPactPreprocessorOptions = {};
    if (
      Cypress.c8ypact &&
      typeof Cypress.c8ypact.getConfigValue === "function"
    ) {
      preprocessorConfigValue =
        Cypress.c8ypact.getConfigValue<C8yPactPreprocessorOptions>(
          "preprocessor"
        ) ?? {};
    }

    return _.defaultsDeep(
      {
        ignore: Cypress.env("C8Y_PACT_PREPROCESSOR_IGNORE"),
        obfuscate: Cypress.env("C8Y_PACT_PREPROCESSOR_OBFUSCATE"),
        obfuscationPattern: Cypress.env("C8Y_PACT_PREPROCESSOR_PATTERN"),
      } as C8yPactPreprocessorOptions,
      options,
      this.options,
      preprocessorConfigValue,
      {
        ignore: [],
        obfuscate: [],
        obfuscationPattern:
          C8yDefaultPactPreprocessor.defaultObfuscationPattern,
      }
    );
  }
}

// initialize the following only once. note, cypresspact.ts could be imported multiple times
// resulting in multiple initializations of the c8ypact object as well as before and beforeEach hooks.
if (_.get(Cypress, "__c8ypact.initialized") === undefined) {
  _.set(Cypress, "__c8ypact.initialized", true);
  const globalIgnore = Cypress.env("C8Y_PACT_IGNORE");

  Cypress.c8ypact = {
    current: null,
    mode,
    getCurrentTestId,
    isRecordingEnabled,
    isMockingEnabled,
    savePact,
    isEnabled,
    recordingMode,
    matcher: new C8yDefaultPactMatcher(),
    pactRunner: new C8yDefaultPactRunner(),
    schemaGenerator: undefined,
    schemaMatcher: undefined,
    debugLog: false,
    preprocessor: new C8yCypressEnvPreprocessor({
      obfuscate: ["request.headers.Authorization", "response.body.password"],
    }),
    on: {},
    config: {
      log: false,
      ignore: globalIgnore === "true" || globalIgnore === true,
      failOnMissingPacts: true,
      strictMatching: true,
      strictMocking: true,
      requestMatching: {
        ignoreUrlParameters: ["dateFrom", "dateTo", "_"],
        baseUrl: getBaseUrlFromEnv(),
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
      return config;
    },
    loadCurrent(): Cypress.Chainable<C8yPact | null> {
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
          if (pact == null) return cy.wrap<C8yPact | null>(null, debugLogger());

          // required to map the record object to a C8yPactRecord here as this can
          // not be done in the plugin
          pact.records = pact.records?.map((record) => {
            return C8yDefaultPactRecord.from(record);
          });
          return cy.wrap<C8yPact | null>(
            new C8yDefaultPact(pact.records, pact.info, pact.id),
            debugLogger()
          );
        });
    },
    env: () => {
      return {
        tenant: Cypress.env("C8Y_TENANT"),
        systemVersion: Cypress.env("C8Y_VERSION"),
        loggedInUser: Cypress.env("C8Y_LOGGED_IN_USER"),
        loggedInUserAlias: Cypress.env("C8Y_LOGGED_IN_USER_ALIAS"),
        pluginFolder: Cypress.env("C8Y_PACT_FOLDER"),
        pluginLoaded: Cypress.env("C8Y_PLUGIN_LOADED") === "true",
        testTitlePath: Cypress.currentTest?.titlePath || [],
        preporcessorOptions: {
          ignore: Cypress.env("C8Y_PACT_PREPROCESSOR_IGNORE"),
          obfuscate: Cypress.env("C8Y_PACT_PREPROCESSOR_OBFUSCATE"),
          obfuscationPattern: Cypress.env("C8Y_PACT_PREPROCESSOR_PATTERN"),
        },
      };
    },
    createFetchClient: (auth: C8yAuthOptions, baseUrl: string) => {
      return new C8yPactFetchClient({
        cypresspact: Cypress.c8ypact,
        auth,
        baseUrl,
      });
    },
  };

  before(() => {
    if (isEnabled()) {
      cy.task("c8ypact:load", Cypress.config().fixturesFolder, debugLogger());
    }
  });

  beforeEach(() => {
    Cypress.c8ypact.current = null;
    validatePactMode();

    if (isEnabled()) {
      if (isRecordingEnabled() && recordingMode() === "refresh") {
        cy.task(
          "c8ypact:remove",
          Cypress.c8ypact.getCurrentTestId(),
          debugLogger()
        );
      }
      Cypress.c8ypact.loadCurrent().then((pact) => {
        Cypress.c8ypact.current = pact;
        // set tenant and baseUrl from pact info if not configured
        // this is needed to not require tenant and baseUrl for fully mocked tests
        if (!Cypress.env("C8Y_TENANT") && pact?.info?.tenant) {
          Cypress.env("C8Y_TENANT", pact?.info?.tenant);
        }
        if (
          !Cypress.env("C8Y_BASEURL") &&
          !Cypress.env("baseUrl") &&
          pact?.info?.baseUrl
        ) {
          Cypress.env("C8Y_BASEURL", pact?.info?.baseUrl);
        }

        if (pact != null && _.isFunction(Cypress.c8ypact.on.loadPact)) {
          Cypress.c8ypact.on.loadPact(pact);
        }
      });
    }
  });
}

function debugLogger(): Cypress.Loggable {
  return { log: Cypress.c8ypact.debugLog };
}

function isEnabled(): boolean {
  if (Cypress.env("C8Y_PLUGIN_LOADED") == null) return false;
  if (mode() === "disabled") return false;

  if (Cypress.config().c8ypact?.ignore === true) {
    return false;
  } else {
    if (
      Cypress.c8ypact.config.ignore === true ||
      Cypress.env("C8Y_PACT_IGNORE") === "true"
    ) {
      return false;
    }
  }
  return true;
}

function isRecordingEnabled(): boolean {
  const values = ["record", "recording"];
  return isEnabled() && values.includes(Cypress.c8ypact.mode());
}

function isMockingEnabled(): boolean {
  const values = ["apply", "mock", "mocking"];
  return isEnabled() && values.includes(Cypress.c8ypact.mode());
}

/**
 * Validates the pact mode and throws an error if the mode is not supported.
 */
function validatePactMode() {
  const mode = Cypress.env("C8Y_PACT_MODE") || "disabled";
  const values = Object.values(C8yPactModeValues) as string[];
  if (!_.isString(mode) || !values.includes(mode.toLowerCase())) {
    const error = new Error(
      `Unsupported pact mode: ${mode}. Supported values are: ${values.join(
        ", "
      )}`
    );
    error.name = "C8yPactError";
    throw error;
  }
}

function mode(): C8yPactMode {
  let mode = Cypress.env("C8Y_PACT_MODE") || "disabled";
  const values = Object.values(C8yPactModeValues) as string[];
  if (!_.isString(mode) || !values.includes(mode.toLowerCase())) {
    mode = "disabled";
  }
  return mode.toLowerCase() as C8yPactMode;
}

function recordingMode() {
  const keys: string[] = Object.values(C8yPactRecordingModeValues);
  const mode: string =
    Cypress.config().c8ypact?.recordingMode ||
    Cypress.env("C8Y_PACT_RECORDING_MODE") ||
    C8yPactRecordingModeValues[0];

  if (!mode || !_.isString(mode) || !keys.includes(mode.toLowerCase())) {
    const error = new Error(
      `Unsupported recording mode: ${mode}. Supported values are: ${keys.join(
        ", "
      )}`
    );
    error.name = "C8yPactError";
    throw error;
  }
  return mode.toLowerCase() as C8yPactRecordingMode;
}

function getCurrentTestId(): C8yPactID {
  let key = Cypress.currentTest.titlePath;
  if (key == null) {
    key = Cypress.spec?.relative?.split("/").slice(-2);
  }
  const pact = Cypress.config().c8ypact;
  return (pact && pact.id) || pactId(key);
}

async function savePact(
  response: Cypress.Response<any> | C8yPact | Pick<C8yPact, C8yPactSaveKeys>,
  client?: C8yClient,
  options: C8yPactSaveOptions = { noqueue: false }
): Promise<void> {
  if (!isEnabled()) return;

  try {
    let pact: Pick<C8yPact, C8yPactSaveKeys>;
    if ("records" in response && "info" in response) {
      pact = response;
    } else {
      const info: C8yPactInfo = {
        ...Cypress.c8ypact.getConfigValues(),
        id: Cypress.c8ypact.getCurrentTestId(),
        title: Cypress.currentTest?.titlePath || [],
        tenant: client?._client?.core.tenant || Cypress.env("C8Y_TENANT"),
        baseUrl: getBaseUrlFromEnv() || "",
        version: Cypress.env("C8Y_VERSION") && {
          system: Cypress.env("C8Y_VERSION"),
        },
        preprocessor: (
          Cypress.c8ypact.preprocessor as C8yCypressEnvPreprocessor
        )?.resolveOptions(),
      };
      pact = await toPactSerializableObject(response, info, {
        loggedInUser:
          options?.loggedInUser ?? Cypress.env("C8Y_LOGGED_IN_USER"),
        loggedInUserAlias:
          options?.loggedInUserAlias ?? Cypress.env("C8Y_LOGGED_IN_USER_ALIAS"),
        client,
        modifiedResponse: options?.modifiedResponse,
        preprocessor: Cypress.c8ypact.preprocessor,
        schemaGenerator: Cypress.c8ypact.schemaGenerator,
      });
    }

    if (!pact || !_.isArray(pact.records) || _.isEmpty(pact.records)) return;
    if (_.isFunction(Cypress.c8ypact.on.saveRecord)) {
      let r = _.first(pact.records);
      if (r) {
        r = Cypress.c8ypact.on.saveRecord(r);
      }
      if (!r) return;
    }

    if (Cypress.c8ypact.current == null) {
      Cypress.c8ypact.current = new C8yDefaultPact(
        pact.records,
        pact.info,
        pact.id
      );
    } else {
      const recordingMode = Cypress.c8ypact.recordingMode();
      // should contain only one record, but making sure we append all
      if (
        recordingMode === "append" ||
        recordingMode === "new" ||
        // refresh is the same as append as for refresh we remove the pact in each tests beforeEach
        recordingMode === "refresh"
      ) {
        for (const record of pact.records) {
          Cypress.c8ypact.current.appendRecord(record, recordingMode === "new");
        }
      } else if (recordingMode === "replace") {
        for (const record of pact.records) {
          Cypress.c8ypact.current.replaceRecord(record);
        }
      }
    }

    let pactToSave: C8yPact | undefined = Cypress.c8ypact.current;
    if (_.isFunction(Cypress.c8ypact.on?.savePact)) {
      pactToSave = Cypress.c8ypact.on.savePact(Cypress.c8ypact.current);
    }
    if (pactToSave == null) return;
    save(Cypress.c8ypact.current, options);
  } catch (error) {
    console.error("Failed to save pact. ", error);
  }
}

function save(pact: any, options: C8yPactSaveOptions) {
  const taskName = "c8ypact:save";
  if (options?.noqueue === true) {
    if (
      Cypress.testingType === "component" &&
      semver.gte(Cypress.version, "12.15.0")
    ) {
      return new Promise((resolve) => setTimeout(resolve, 5))
        .then(() =>
          // @ts-expect-error
          Cypress.backend("run:privileged", {
            commandName: "task",
            userArgs: [taskName, pact],
            options: {
              task: taskName,
              arg: pact,
            },
          })
        )
        .catch(() => {
          /* noop */
        });
    }
    // @ts-expect-error
    const { args, promise } = Cypress.emitMap("command:invocation", {
      name: "task",
      args: [taskName, pact],
    })[0];
    new Promise((r) => promise.then(r))
      .then(() =>
        // @ts-expect-error
        Cypress.backend("run:privileged", {
          commandName: "task",
          args,
          options: {
            task: taskName,
            arg: pact,
          },
        })
      )
      .catch(() => {
        /* noop */
      });
  } else {
    cy.task("c8ypact:save", pact, debugLogger());
  }
}

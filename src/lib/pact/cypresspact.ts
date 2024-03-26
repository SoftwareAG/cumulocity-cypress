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
  C8yDefaultPactUrlMatcher,
  C8yPactUrlMatcher,
  C8yAjvSchemaMatcher,
  C8yQicktypeSchemaGenerator,
  C8ySchemaGenerator,
  C8ySchemaMatcher,
  C8yDefaultPactMatcher,
  C8yPactMatcher,
  toPactSerializableObject,
  C8yPactEnv,
  C8yPactSaveKeys,
} from "../../shared/c8ypact";
import { C8yDefaultPactRunner } from "./runner";
import { C8yClient } from "../../shared/c8yclient";

const { getBaseUrlFromEnv } = require("./../utils");
const semver = require("semver");

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
    /**
     * Loads the pact object for the current test from the pact file. If
     * there is no stored pact object for the current test, null is returned.
     */
    loadCurrent(): Cypress.Chainable<C8yPact | null>;
    /**
     * Resolves all environment variables as a C8yPactEnv object.
     */
    env(): C8yPactEnv;
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

if (_.get(Cypress, "c8ypact.initialized") === undefined) {
  _.set(Cypress, "c8ypact.initialized", true);
  const globalIgnore = Cypress.env("C8Y_PACT_IGNORE");

  Cypress.c8ypact = {
    current: null,
    getCurrentTestId,
    isRecordingEnabled,
    savePact,
    isEnabled,
    matcher: new C8yDefaultPactMatcher(),
    urlMatcher: new C8yDefaultPactUrlMatcher(
      ["dateFrom", "dateTo", "_"],
      getBaseUrlFromEnv()
    ),
    pactRunner: new C8yDefaultPactRunner(),
    schemaGenerator: new C8yQicktypeSchemaGenerator(),
    schemaMatcher: new C8yAjvSchemaMatcher([draft06Schema]),
    debugLog: false,
    preprocessor: new C8yCypressEnvPreprocessor({
      obfuscate: ["request.headers.Authorization", "response.body.password"],
    }),
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
  };
}

function debugLogger(): Cypress.Loggable {
  return { log: Cypress.c8ypact.debugLog };
}

before(() => {
  if (!Cypress.c8ypact.isRecordingEnabled()) {
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
    Cypress.c8ypact.loadCurrent().then((pact) => {
      Cypress.c8ypact.current = pact;
    });
  }
});

function isEnabled(): boolean {
  if (Cypress.env("C8Y_PLUGIN_LOADED") == null) return false;
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
        baseUrl: getBaseUrlFromEnv(),
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

    if (!pact) return;
    save(pact, options);
  } catch {}
}

export function save(pact: any, options: C8yPactSaveOptions) {
  const taskName = "c8ypact:save";
  if (options?.noqueue === true) {
    if (
      Cypress.testingType === "component" &&
      semver.gte(Cypress.version, "12.15.0")
    ) {
      return new Promise((resolve) => setTimeout(resolve, 5))
        .then(() =>
          // @ts-ignore
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
      .catch((err) => {
        /* noop */
      });
  } else {
    cy.task("c8ypact:save", pact, debugLogger());
  }
}

#!/usr/bin/env node

import _ from "lodash";
import debug from "debug";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { config as dotenv } from "dotenv";

import {
  C8yPactDefaultFileAdapter,
  C8yPactHttpController,
  C8yDefaultPactPreprocessor,
  C8yPactHttpControllerOptions,
  C8yPactHttpControllerConfig,
  C8yDefaultPactRecord,
} from "cumulocity-cypress/node";

import { cosmiconfig } from "cosmiconfig";
import { TypeScriptLoader } from "cosmiconfig-typescript-loader";

import { createLogger, format, transports } from "winston";
// https://github.com/winstonjs/winston/issues/2430
// use following import if transports is empty
import { default as transportsDirect } from "winston/lib/winston/transports/";

export * from "cumulocity-cypress/node";

const safeTransports = !_.isEmpty(transports) ? transports : transportsDirect;
const log = debug("c8y:pact:httpcontroller");

/**
 * Default logger for the HTTP controller. It logs to the console with colors and simple format.
 * This needs to be passed to the config, so it must be created before applying the default config.
 */
const defaultLogger = createLogger({
  transports: [
    new safeTransports.Console({
      format: format.combine(format.simple()),
    }),
  ],
});

/**
 * Default config object for the HTTP controller. It takes a configuration object and
 * adds required defaults, as for example the adapter, an error response record or the logger.
 *
 * This config can be overwritten by a config file, which is loaded by cosmiconfig.
 */
const applyDefaultConfig = (config: Partial<C8yPactHttpControllerConfig>) => {
  // check all default properties as _.defaults seems to still overwrite in some cases
  if (!("adapter" in config)) {
    config.adapter = new C8yPactDefaultFileAdapter(
      config.folder || "./c8ypact"
    );
  }
  if (!("errorResponseRecord" in config)) {
    config.errorResponseRecord = (url) => {
      return C8yDefaultPactRecord.from({
        status: 404,
        statusText: "Not Found",
        body: `Not Found: ${url}`,
        headers: {
          "content-type": "application/text",
        },
      });
    };
  }
  if (!("logger" in config)) {
    config.logger = defaultLogger;
  }
  if (!("requestMatching" in config)) {
    config.requestMatching = {
      ignoreUrlParameters: ["dateFrom", "dateTo", "_", "nocache"],
      baseUrl: config.baseUrl,
    };
  }
  if (!("preprocessor" in config)) {
    config.preprocessor = new C8yDefaultPactPreprocessor({
      obfuscate: ["request.headers.Authorization", "response.body.password"],
    });
  }
  return config;
};

(async () => {
  // load .env file first and overwrite with .c8yctrl file if present
  dotenv();
  dotenv({ path: ".c8yctrl", override: true });

  // read config from environment variables or command line arguments
  const [config, configFile] = getConfigFromArgsOrEnvironment();

  // load config file if provided and merge it with the current config
  if (configFile) {
    const configLoader = cosmiconfig("cumulocity-cypress", {
      searchPlaces: [configFile, "c8yctrl.config.ts"],
      loaders: {
        ".ts": TypeScriptLoader(),
      },
    });

    const result = await configLoader.search(process.cwd());
    if (result) {
      log("loaded config: ", result.filepath);
      if (_.isFunction(result.config)) {
        log("config exported a function");
        const configClone = _.cloneDeep(config);
        // assign logger after deep cloning: https://github.com/winstonjs/winston/issues/1730
        configClone.logger = defaultLogger;
        const c = result.config(configClone);
        _.defaults(config, c || configClone);
      } else {
        log("config exported an object");
        config.logger = defaultLogger;
        _.defaults(config, result.config);
      }
      config.logger?.info("Config: " + result.filepath);
    }
  }

  // load defaults and merge them with the current config
  applyDefaultConfig(config);

  // now config is complete and we can start the controller
  try {
    if (!config?.auth) {
      log("no auth options provided, trying to create from user and password.");
      const { user, password, tenant } = config;
      config.auth = user && password ? { user, password, tenant } : undefined;
    }

    const controller = new C8yPactHttpController(
      config as C8yPactHttpControllerOptions
    );
    await controller.start();
  } catch (error) {
    console.error("Error starting HTTP controller:", error);
  }
})();

function getEnvVar(name: string): string | undefined {
  return (
    process.env[name] ||
    process.env[_.camelCase(name)] ||
    process.env[name.replace(/^C8Y_/i, "")] ||
    process.env[_.camelCase(`CYPRESS_${name}`)] ||
    process.env[`CYPRESS_${_.camelCase(name.replace(/^C8Y_/i, ""))}`]
  );
}

function getConfigFromArgsOrEnvironment(): [
  Partial<C8yPactHttpControllerConfig>,
  string?
] {
  const result = yargs(hideBin(process.argv))
    .option("folder", {
      alias: "pactFolder",
      type: "string",
      description: "Folder recordings are loaded from and saved to.",
    })
    .option("port", {
      type: "number",
      description: "HTTP port the controller listens on.",
    })
    .option("baseUrl", {
      type: "string",
      description:
        "The Cumulocity URL REST requests are proxied and recorded from.",
    })
    .option("user", {
      alias: "username",
      type: "string",
      description: "Set the username to login at baseUrl.",
    })
    .option("password", {
      type: "string",
      description: "Set the password to login at baseUrl.",
    })
    .option("tenant", {
      type: "string",
      description: "Set the tenant of baseUrl.",
    })
    .option("staticRoot", {
      alias: "static",
      type: "string",
      description: "Set the static root to serve static files from.",
    })
    .option("recording", {
      type: "boolean",
      description: "Enable or disable recording",
    })
    .option("config", {
      type: "string",
      description: "Path to a config file. Supported formats: .ts",
    })
    .help()
    .parseSync();

  const configFile = result.config;

  // pick only the options that are set and apply defaults
  // yargs creates properties we do not want, this way we can filter them out
  return [
    {
      folder: result.folder || getEnvVar("C8Y_PACT_FOLDER"),
      port: result.port || +(getEnvVar("C8Y_HTTP_PORT") || 3000),
      baseUrl: result.baseUrl || getEnvVar("C8Y_BASE_URL"),
      user: result.user || getEnvVar("C8Y_BASE_USERNAME"),
      password: result.password || getEnvVar("C8Y_BASE_PASSWORD"),
      tenant: result.tenant || getEnvVar("C8Y_BASE_TENANT"),
      staticRoot: result.staticRoot || getEnvVar("C8Y_STATIC_ROOT"),
      isRecordingEnabled:
        result.recording || getEnvVar("C8Y_PACT_MODE") === "recording",
    },
    configFile,
  ];
}

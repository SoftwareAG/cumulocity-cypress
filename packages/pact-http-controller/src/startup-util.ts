import _ from "lodash";

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

import { createLogger, format, transports } from "winston";
// https://github.com/winstonjs/winston/issues/2430
// use following import if transports is empty
import { default as transportsDirect } from "winston/lib/winston/transports/";

import {
  C8yPactHttpControllerConfig,
  C8yDefaultPactPreprocessor,
  C8yPactDefaultFileAdapter,
} from "cumulocity-cypress/shared/c8yctrl";

import debug from "debug";
const log = debug("c8y:ctrl:startup");

export function getEnvVar(name: string): string | undefined {
  return (
    process.env[name] ||
    process.env[_.camelCase(name)] ||
    process.env[`CYPRESS_${name}`] ||
    process.env[name.replace(/^C8Y_/i, "")] ||
    process.env[_.camelCase(`CYPRESS_${name}`)] ||
    process.env[`CYPRESS_${_.camelCase(name.replace(/^C8Y_/i, ""))}`]
  );
}

export function getConfigFromArgs(): [
  Partial<C8yPactHttpControllerConfig>,
  string | undefined
] {
  const result = yargs(hideBin(process.argv))
    .option("folder", {
      alias: "pactFolder",
      type: "string",
      requiresArg: true,
      description: "Folder recordings are loaded from and saved to.",
    })
    .option("port", {
      type: "number",
      requiresArg: true,
      description: "HTTP port the controller listens on.",
    })
    .option("baseUrl", {
      type: "string",
      requiresArg: true,
      description:
        "The Cumulocity URL REST requests are proxied and recorded from.",
    })
    .option("user", {
      alias: "username",
      requiresArg: true,
      type: "string",
      description: "Set the username to login at baseUrl.",
    })
    .option("password", {
      type: "string",
      requiresArg: true,
      description: "Set the password to login at baseUrl.",
    })
    .option("tenant", {
      type: "string",
      requiresArg: true,
      description: "Set the tenant of baseUrl.",
    })
    .option("staticRoot", {
      alias: "static",
      requiresArg: true,
      type: "string",
      description: "Set the static root to serve static files from.",
    })
    .option("recording", {
      type: "boolean",
      requiresArg: false,
      default: true,
      description: "Enable or disable recording",
    })
    .option("config", {
      type: "string",
      requiresArg: true,
      description: "Path to a config file",
    })
    .help()
    .parseSync();

  // pick only the options that are set and apply defaults
  // yargs creates properties we do not want, this way we can filter them out
  return [
    {
      folder: result.folder,
      port: result.port,
      baseUrl: result.baseUrl,
      user: result.user,
      password: result.password,
      tenant: result.tenant,
      staticRoot: result.staticRoot,
      isRecordingEnabled: result.recording,
    },
    result.config,
  ];
}

export function getConfigFromEnvironment(): Partial<C8yPactHttpControllerConfig> {
  return {
    folder: getEnvVar("C8Y_PACT_FOLDER"),
    port: +(getEnvVar("C8Y_HTTP_PORT") || 3000),
    baseUrl: getEnvVar("C8Y_BASE_URL"),
    user: getEnvVar("C8Y_BASE_USERNAME"),
    password: getEnvVar("C8Y_BASE_PASSWORD"),
    tenant: getEnvVar("C8Y_BASE_TENANT"),
    staticRoot: getEnvVar("C8Y_STATIC_ROOT"),
    isRecordingEnabled: getEnvVar("C8Y_PACT_MODE") === "recording",
  } as Partial<C8yPactHttpControllerConfig>;
}

export function getConfigFromArgsOrEnvironment(): [
  Partial<C8yPactHttpControllerConfig>,
  string | undefined
] {
  const [args, config] = getConfigFromArgs();
  const env = getConfigFromEnvironment();
  return [_.defaults(args, env), config];
}

const safeTransports = !_.isEmpty(transports) ? transports : transportsDirect;

/**
 * Default logger for the HTTP controller. It logs to the console with colors and simple format.
 * This needs to be passed to the config, so it must be created before applying the default config.
 */
export const defaultLogger = createLogger({
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
export const applyDefaultConfig = (
  config: Partial<C8yPactHttpControllerConfig>
) => {
  if (!config?.auth) {
    log("no auth options provided, trying to create from user and password.");
    const { user, password, tenant } = config;
    config.auth = user && password ? { user, password, tenant } : undefined;
  }

  if (!("on" in config)) {
    log("configuring empty object callback 'on' property of config.");
    config.on = {};
  }

  // check all default properties as _.defaults seems to still overwrite in some cases
  if (!("adapter" in config)) {
    log(
      `configuring default file adapter for folder ${
        config.folder || "./c8ypact"
      }.`
    );
    config.adapter = new C8yPactDefaultFileAdapter(
      config.folder || "./c8ypact"
    );
  }
  if (!("mockNotFoundResponse" in config)) {
    log("configuring default 404 text mockNotFoundResponse.");
    config.mockNotFoundResponse = (url) => {
      return {
        status: 404,
        statusText: "Not Found",
        body: `Not Found: ${url}`,
        headers: {
          "content-type": "application/text",
        },
      };
    };
  }
  if (!("logger" in config)) {
    log("configuring default logger.");
    config.logger = defaultLogger;
  }
  if (!("requestMatching" in config)) {
    log("configuring default requestMatching.");
    config.requestMatching = {
      ignoreUrlParameters: ["dateFrom", "dateTo", "_", "nocache"],
      baseUrl: config.baseUrl,
    };
  }
  if (!("preprocessor" in config)) {
    log("configuring default preprocessor.");
    config.preprocessor = new C8yDefaultPactPreprocessor({
      obfuscate: ["request.headers.Authorization", "response.body.password"],
    });
  }
  return config;
};

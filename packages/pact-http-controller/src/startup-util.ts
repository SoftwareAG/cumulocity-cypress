import _ from "lodash";

import fs from "fs";
import path from "path";

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

import { createLogger, format, transports } from "winston";
// https://github.com/winstonjs/winston/issues/2430
// use following import if transports is empty
import { default as transportsDirect } from "winston/lib/winston/transports/";
import morgan from "morgan";

import {
  C8yPactHttpControllerConfig,
  C8yDefaultPactPreprocessor,
  C8yPactDefaultFileAdapter,
  C8yPactHttpControllerLogLevel,
} from "cumulocity-cypress/shared/c8yctrl";

import { RequestHandler } from "express";
import { safeStringify } from "cumulocity-cypress/shared/util";

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
      alias: "baseurl",
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
    .option("log", {
      type: "boolean",
      default: true,
      requiresArg: false,
      description: "Enable or disable logging",
    })
    .option("logLevel", {
      type: "string",
      default: "info",
      requiresArg: true,
      description: "Set the log level",
    })
    .option("logFile", {
      alias: "logFileName",
      type: "string",
      requiresArg: true,
      description: "Filename to log to",
    })
    .option("accessLogFile", {
      alias: "accessLogFileName",
      type: "string",
      requiresArg: true,
      description: "Filename to log access to",
    })
    .help()
    .parseSync();

  const logLevelValues: string[] = Object.values(C8yPactHttpControllerLogLevel);

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
      logFilename: result.logFile,
      accessLogFilename: result.accessLogFile,
      log: result.log,
      logLevel: logLevelValues.includes(result.logLevel || "")
        ? (result.logLevel as (typeof C8yPactHttpControllerLogLevel)[number])
        : undefined,
    },
    result.config,
  ];
}

export function getConfigFromEnvironment(): Partial<C8yPactHttpControllerConfig> {
  return {
    folder: getEnvVar("C8Y_PACT_FOLDER"),
    port: +(getEnvVar("C8Y_HTTP_PORT") || 3000),
    baseUrl: getEnvVar("C8Y_BASE_URL") || getEnvVar("C8Y_BASEURL"),
    user: getEnvVar("C8Y_BASE_USERNAME") || getEnvVar("C8Y_USERNAME"),
    password: getEnvVar("C8Y_BASE_PASSWORD") || getEnvVar("C8Y_PASSWORD"),
    tenant: getEnvVar("C8Y_BASE_TENANT") || getEnvVar("C8Y_TENANT"),
    staticRoot: getEnvVar("C8Y_STATIC_ROOT") || getEnvVar("C8Y_STATIC"),
    isRecordingEnabled: getEnvVar("C8Y_PACT_MODE") === "recording",
    logFilename: getEnvVar("C8Y_LOG_FILE"),
    accessLogFilename: getEnvVar("C8Y_ACCESS_LOG_FILE"),
    log: getEnvVar("C8Y_LOG") !== "false",
    logLevel: getEnvVar("C8Y_LOG_LEVEL"),
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
      format: format.combine(
        format.colorize({
          all: true,
          colors: {
            info: "green",
            error: "red",
            warn: "yellow",
            debug: "white",
          },
        }),
        format.simple()
      ),
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

  applyDefaultLogConfig(config);

  return config;
};

const applyDefaultLogConfig = (
  config: Partial<C8yPactHttpControllerConfig>
) => {
  if ("log" in config && config.log === false) {
    log("logging is disabled.");
    config.logger = undefined;
    config.requestLogger = undefined;
    return;
  }

  if (!("logger" in config)) {
    log("configuring default logger.");
    config.logger = defaultLogger;
    if (config.logFilename) {
      const p = path.isAbsolute(config.logFilename)
        ? config.accessLogFilename
        : path.join(process.cwd(), config.logFilename);
      log(`configuring logger file transport ${p}.`);

      config.logger.add(
        new safeTransports.File({
          format: format.simple(),
          filename: p,
        })
      );
    }
  }

  if (
    "logLevel" in config &&
    config.logLevel != null &&
    config.logger != null
  ) {
    log(`configuring log level ${config.logLevel}.`);
    config.logger.level = config.logLevel;
  }

  if (!("requestLogger" in config)) {
    log("configuring default requestLogger for /c8yctrl interface and errors");
    config.requestLogger = [
      morgan(":method :url :status :res[content-length] - :response-time ms", {
        skip: (req) => {
          return (
            !req.url.startsWith("/c8yctrl") ||
            req.url.startsWith("/c8yctrl/log")
          );
        },

        stream: {
          write: (message: string) => {
            config.logger?.warn(message.trim());
          },
        },
      }),
    ];
  }

  if (!("errorLogger" in config) && config.errorLogger == null) {
    if ((morgan as any)["error-object"] == null) {
      // eslint-disable-next-line import/no-named-as-default-member
      morgan.token("error-object", (req, res) => {
        let resBody = (res as any).body;
        if (
          _.isString(resBody) &&
          // parse as json only if body is a cumulocity error response
          /"error"\s*:\s*"/.test(resBody) &&
          /"message"\s*:\s*"/.test(resBody)
        ) {
          try {
            resBody = JSON.parse(resBody);
          } catch (e) {
            // ignore, use body as string
          }
        }
        // make sure we do not log too much
        if (_.isString(resBody)) {
          resBody = resBody.slice(0, 1000);
        }

        const errorObject = {
          url: req.url,
          status: `${res.statusCode} ${res.statusMessage}`,
          requestHeader: req.headers,
          responseHeader: res.getHeaders(),
          responseBody: resBody,
          requestBody: (req as any).body,
        };
        return safeStringify(errorObject);
      });
      log("default morgan error-object token compiled and registered.");
    }

    config.errorLogger = morgan(":error-object", {
      skip: (req, res) => {
        return (
          res.statusCode < 400 || req.url.startsWith("/notification/realtime")
        );
      },
      stream: {
        write: (message: string) => {
          config.logger?.error(message.trim());
        },
      },
    });
    log("configured error logger.");
  }

  if ("accessLogFilename" in config && config.accessLogFilename != null) {
    const p = path.isAbsolute(config.accessLogFilename)
      ? config.accessLogFilename
      : path.join(process.cwd(), config.accessLogFilename);
    log(`configuring access log file ${p}.`);

    const accessLogger = morgan("common", {
      stream: fs.createWriteStream(p, {
        flags: "a",
      }),
    });

    if (config.requestLogger != null) {
      if (_.isArrayLike(config.requestLogger)) {
        (config.requestLogger as RequestHandler[]).push(accessLogger);
        log("added access logger to existing requestLogger.");
      }
    } else {
      config.requestLogger = [accessLogger];
      log("added access logger as requestLogger.");
    }
  }
};

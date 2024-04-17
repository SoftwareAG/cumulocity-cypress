import _ from "lodash";
import debug from "debug";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

import { cosmiconfig } from "cosmiconfig";
import { TypeScriptLoader } from "cosmiconfig-typescript-loader";

import {
  C8yPactDefaultFileAdapter,
  C8yPactHttpProvider,
  C8yDefaultPactPreprocessor,
  C8yPactHttpProviderOptions,
  C8yPactHttpProviderConfig,
} from "cumulocity-cypress/node";

const log = debug("c8y:pactprovider");

(async () => {
  const config = getConfigFromArgsOrEnvironment();
  log("config from args or environment: ", config);

  const configLoader = cosmiconfig("cumulocity-cypress", {
    searchPlaces: [
      "cumulocity-cypress.config.ts",
      ".cumulocity-cypressrc.ts",
      "package.json",
      "packages/pactprovider/cumulocity-cypress.config.ts",
      "packages/pactprovider/.cumulocity-cypressrc.ts",
      "packages/pactprovider/package.json",
    ],
    loaders: {
      ".ts": TypeScriptLoader(),
    },
  });

  const result = await configLoader.search(process.cwd());
  if (result) {
    log("found config file: ", result.filepath);
    log("loaded config: ", result.config);
    _.defaults(config, result.config);
  }

  try {
    applyConfigDefaults(config);

    const provider = new C8yPactHttpProvider(
      config as C8yPactHttpProviderOptions
    );
    log("starting provider with config: ", config);
    await provider.start();

    console.log(`Listening: http://localhost:${config.port}`);
    console.log(`Recording: ${config.isRecordingEnabled}`);
    if (config?.staticRoot) {
      console.log(`Using static root: ${config?.staticRoot}`);
    }
  } catch (error) {
    console.error("Error starting provider:", error);
  }
})();

function getEnvVar(name: string): string | undefined {
  return (
    process.env[name] ||
    process.env[_.camelCase(name)] ||
    process.env[`CYPRESS_${name}`]
  );
}

function applyConfigDefaults(config: Partial<C8yPactHttpProviderConfig>) {
  if (!config) return;

  if (!config?.auth) {
    const { user, password, tenant } = config;
    config.auth = user && password ? { user, password, tenant } : undefined;
  }

  if (!config?.adapter && config?.folder) {
    config.adapter = new C8yPactDefaultFileAdapter(config.folder);
  }

  if (!config?.preprocessor) {
    config.preprocessor = new C8yDefaultPactPreprocessor({
      obfuscate: ["request.headers.Authorization", "response.body.password"],
    });
  }

  if (!config.requestMatching) {
    config.requestMatching = {
      ignoreUrlParameters: ["dateFrom", "dateTo", "_", "nocache"],
      baseUrl: config.baseUrl,
    };
  }
}

function getConfigFromArgsOrEnvironment(): Partial<C8yPactHttpProviderConfig> {
  const result = yargs(hideBin(process.argv))
    .option("folder", {
      type: "string",
      description: "Folder recordings are loaded from and saved to.",
    })
    .option("port", {
      type: "number",
      description: "HTTP port the provider listens on.",
    })
    .option("baseUrl", {
      type: "string",
      description:
        "The Cumulocity URL REST requests are proxied and recorded from.",
    })
    .option("user", {
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
      type: "string",
      description: "Set the static root to serve static files from.",
    })
    .option("recording", {
      type: "boolean",
      description: "Enable or disable recording",
    })
    .help()
    .parseSync();

  // pick only the options that are set and apply defaults
  // yargs creates properties we do not want, this way we can filter them out
  return {
    folder: result.folder || getEnvVar("C8Y_PACT_FOLDER"),
    port: result.port || +(getEnvVar("C8Y_HTTP_PORT") || 3000),
    baseUrl: result.baseUrl || getEnvVar("C8Y_BASE_URL"),
    user: result.user || getEnvVar("C8Y_BASE_USERNAME"),
    password: result.password || getEnvVar("C8Y_BASE_PASSWORD"),
    tenant: result.tenant || getEnvVar("C8Y_BASE_TENANT"),
    staticRoot: result.staticRoot || getEnvVar("C8Y_STATIC_ROOT"),
    isRecordingEnabled:
      result.recording || getEnvVar("C8Y_PACT_MODE") === "recording",
  };
}

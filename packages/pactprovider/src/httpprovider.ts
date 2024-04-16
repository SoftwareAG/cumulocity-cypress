import _ from "lodash";

import {
  C8yPactDefaultFileAdapter,
  C8yAuthOptions,
  oauthLogin,
  C8yPactHttpProvider,
  C8yQicktypeSchemaGenerator,
  C8yDefaultPactPreprocessor,
} from "cumulocity-cypress/node";

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const {
  folder,
  port,
  baseUrl,
  user,
  password,
  tenant,
  staticRoot,
  isRecordingEnabled,
} = getArgs();

if (!folder) {
  console.error("No pact folder specified. Please set C8Y_PACT_FOLDER.");
  process.exit(1);
}

const auth: C8yAuthOptions | undefined =
  user && password ? { user, password, tenant } : undefined;

if (staticRoot) {
  console.log(`Using static root: ${staticRoot}`);
}

(async () => {
  try {
    const provider = new C8yPactHttpProvider({
      port,
      baseUrl,
      tenant,
      staticRoot,
      auth,
      adapter: new C8yPactDefaultFileAdapter(folder),
      schemaGenerator: new C8yQicktypeSchemaGenerator(),
      preprocessor: new C8yDefaultPactPreprocessor({
        obfuscate: ["request.headers.Authorization", "response.body.password"],
      }),
      strictMocking: false,
      requestMatching: {
        ignoreUrlParameters: ["dateFrom", "dateTo", "_", "nocache"],
        baseUrl: baseUrl,
      },
      isRecordingEnabled,
    });
    await provider.start();

    console.log(`Listing: http://localhost:${port}`);
    console.log(`Recording: ${isRecordingEnabled}`);
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

function getArgs() {
  return yargs(hideBin(process.argv))
    .option("folder", {
      type: "string",
      description: "Folder recordings are loaded from and saved to.",
      default: getEnvVar("C8Y_PACT_FOLDER"),
    })
    .option("port", {
      type: "number",
      description: "HTTP port the provider listens on.",
      default: +(getEnvVar("C8Y_HTTP_PORT") || 3000),
    })
    .option("baseUrl", {
      type: "string",
      description:
        "The Cumulocity URL REST requests are proxied and recorded from.",
      default: getEnvVar("C8Y_BASE_URL"),
    })
    .option("user", {
      type: "string",
      description: "Set the username to login at baseUrl.",
      default: getEnvVar("C8Y_BASE_USERNAME"),
    })
    .option("password", {
      type: "string",
      description: "Set the password to login at baseUrl.",
      default: getEnvVar("C8Y_BASE_PASSWORD"),
    })
    .option("tenant", {
      type: "string",
      description: "Set the tenant of baseUrl.",
      default: getEnvVar("C8Y_BASE_TENANT"),
    })
    .option("staticRoot", {
      type: "string",
      description: "Set the static root to serve static files from.",
      default: getEnvVar("C8Y_STATIC_ROOT"),
    })
    .option("isRecordingEnabled", {
      type: "boolean",
      description: "Enable or disable recording",
      default: getEnvVar("C8Y_PACT_MODE") === "recording",
    })
    .help()
    .parseSync();
}

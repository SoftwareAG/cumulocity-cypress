import * as path from "path";
import * as fs from "fs";
import debug from "debug";

import {
  C8yPactFileAdapter,
  C8yPactDefaultFileAdapter,
} from "../shared/c8ypact/fileadapter";
import { C8yPact } from "../shared/c8ypact/c8ypact";
import { C8yAuthOptions, oauthLogin } from "../shared/c8yclient";

import * as yaml from "js-yaml";

import { C8yAjvSchemaMatcher } from "../contrib/ajv";
import schema from "./../screenshot/schema.json";

export { C8yPactFileAdapter, C8yPactDefaultFileAdapter };

/**
 * Configuration options for the Cumulocity Cypress plugin.
 */
export type C8yPluginConfig = {
  /**
   * Folder where to store or load pact files from.
   * Default is cypress/fixtures/c8ypact
   */
  pactFolder?: string;
  /**
   * Adapter to load and save pact objects.
   * Default is C8yPactDefaultFileAdapter
   */
  pactAdapter?: C8yPactFileAdapter;
};

/**
 * Configuration options for the Cumulocity Pact plugin. Sets up for example required tasks
 * to save and load pact objects.
 *
 * @param on Cypress plugin events
 * @param config Cypress plugin config
 * @param options Cumulocity plugin configuration options
 */
export function configureC8yPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options: C8yPluginConfig = {}
) {
  const log = debug("c8y:plugin");

  let adapter = options.pactAdapter;
  if (!adapter) {
    const folder =
      options.pactFolder ||
      options.pactAdapter?.getFolder() ||
      process.env.C8Y_PACT_FOLDER ||
      process.env.CYPRESS_C8Y_PACT_FOLDER ||
      // default folder is cypress/fixtures/c8ypact
      path.join(process.cwd(), "cypress", "fixtures", "c8ypact");
    adapter = new C8yPactDefaultFileAdapter(folder);
    log(`Created C8yPactDefaultFileAdapter with folder ${folder}`);
  } else {
    log(`Using adapter from options ${adapter}`);
  }

  // use C8Y_PLUGIN_LOADED to see if the plugin has been loaded
  config.env.C8Y_PLUGIN_LOADED = "true";
  // use C8Y_PACT_FOLDER to find out where the pact files have been loaded from
  config.env.C8Y_PACT_FOLDER = adapter.getFolder();

  function savePact(pact: C8yPact): null {
    const { id, info, records } = pact;
    log(`savePact() - ${pact.id} (${records?.length || 0} records)`);
    validateId(id);

    const version = getVersion();
    if (version && info) {
      if (!info.version) {
        info.version = {};
      }
      info.version.runner = version;
      info.version.c8ypact = "1";
    }

    adapter?.savePact(pact);
    return null;
  }

  function getPact(pact: string): C8yPact | null {
    log(`getPact() - ${pact}`);
    validateId(pact);
    return adapter?.loadPact(pact) || null;
  }

  function removePact(pact: string): boolean {
    log(`removePact() - ${pact}`);
    validateId(pact);

    adapter?.deletePact(pact);
    return true;
  }

  function validateId(id: string): void {
    log(`validateId() - ${id}`);
    if (!id || typeof id !== "string") {
      log(`Pact id validation failed, was ${typeof id}`);
      throw new Error(`c8ypact id must be a string, was ${typeof id}`);
    }
  }

  async function login(options: {
    auth: C8yAuthOptions;
    baseUrl: string;
  }): Promise<C8yAuthOptions> {
    log(
      `login() - ${options?.auth?.user}:${options?.auth?.password} -> ${options?.baseUrl}`
    );
    return await oauthLogin(options?.auth, options?.baseUrl);
  }

  if (on) {
    on("task", {
      "c8ypact:save": savePact,
      "c8ypact:get": getPact,
      "c8ypact:remove": removePact,
      "c8ypact:oauthLogin": login,
    });
  }
}

export function configureC8yScreenshotPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) {
  const log = debug("c8y:scrn:plugin");
  let configData = config.env._c8yscrnyaml;
  if (!configData) {
    const filePath = config.env._c8yscrnConfigFile;
    if (!filePath) {
      log("No config file provided. Skipping configuration.");
      return config;
    }
    log(`Using config file ${filePath}`);

    if (!schema) {
      log(`schem.json not found. Skipping configuration.`);
      throw new Error(
        `Failed to validate ${filePath}. No schema found for validation. Please check the schema.json file.`
      );
    }

    configData = readYamlFile(filePath);
    const ajv = new C8yAjvSchemaMatcher();
    log(`Validating config file ${filePath}`);
    ajv.match(configData, schema, true);
  } else {
    log("Using setup from _c8yscrnyaml.");
  }

  config.env._c8yscrnyaml = configData;
  config.baseUrl =
    config.baseUrl ?? configData?.baseUrl ?? "http://localhost:8080";
  log(`Using baseUrl to ${config.baseUrl}`);

  // https://github.com/cypress-io/cypress/issues/27260
  on("before:browser:launch", (browser, launchOptions) => {
    if (browser.name === "chrome") {
      const viewportWidth = configData?.global?.viewportWidth ?? 1920;
      const viewportHeight = configData?.global?.viewportHeight ?? 1080;
      launchOptions.args.push(
        `--window-size=${viewportWidth},${viewportHeight} --headless=old`
      );
      log(
        `Set chrome launch options: ${
          launchOptions.args[launchOptions.args.length - 1]
        }`
      );
    }
    return launchOptions;
  });

  on("after:screenshot", (details) => {
    return new Promise((resolve, reject) => {
      const newPath =
        details.specName.trim() == ""
          ? details.path
          : details.path?.replace(`${details.specName}${path.sep}`, "");

      const folder = newPath?.split(path.sep).slice(0, -1).join(path.sep);
      if (folder && !fs.existsSync(folder)) {
        const result = fs.mkdirSync(folder, { recursive: true });
        if (!result) {
          reject(`Failed to create folder ${folder}`);
        }
      }
      if (!folder) {
        resolve({
          path: details.path,
          size: details.size,
          dimensions: details.dimensions,
        });
      }
      log(`Moving screenshot ${details.path} to ${newPath}`);
      fs.rename(details.path, newPath, (err) => {
        if (err) return reject(err);
        resolve({
          path: newPath,
          size: details.size,
          dimensions: details.dimensions,
        });
      });
    });
  });

  return config;
}

function getVersion() {
  try {
    let currentDir = __dirname;
    let packageJsonPath;
    let maxLevels = 3;
    while (maxLevels > 0) {
      packageJsonPath = path.resolve(currentDir, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf8")
        );
        return packageJson.version;
      }
      currentDir = path.dirname(currentDir);
      maxLevels--;
    }
  } catch {
    console.error(
      "Failed to get version from package.json. package.json not found."
    );
  }
  return "unknown";
}

function readYamlFile(filePath: string): any {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const data = yaml.load(fileContent);
  return data;
}

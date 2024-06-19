import * as path from "path";
import * as fs from "fs";
import debug from "debug";

import {
  C8yPactFileAdapter,
  C8yPactDefaultFileAdapter,
} from "../shared/c8ypact/fileadapter";
import {
  C8yPactHttpController,
  C8yPactHttpControllerOptions,
} from "../shared/c8yctrl/httpcontroller";
import {
  C8yPact,
  getEnvVar,
  validatePactMode,
} from "../shared/c8ypact/c8ypact";
import { C8yAuthOptions, oauthLogin } from "../shared/c8yclient";
import { validateBaseUrl } from "cumulocity-cypress/shared/c8ypact/url";

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

const log = debug("c8y:plugin");

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
  let adapter = options.pactAdapter;
  const envFolder = getEnvVar("C8Y_PACT_FOLDER");
  if (!adapter) {
    const folder =
      options.pactFolder ||
      options.pactAdapter?.getFolder() ||
      envFolder ||
      // default folder is cypress/fixtures/c8ypact
      path.join(process.cwd(), "cypress", "fixtures", "c8ypact");
    adapter = new C8yPactDefaultFileAdapter(folder);
    log(`Created C8yPactDefaultFileAdapter with folder ${folder}`);
  } else {
    log(`Using adapter from options ${adapter}`);
  }

  // validate pact mode and base url before starting the plugin
  // use environment variables AND config.env for variables defined in cypress.config.ts
  const mode =
    getEnvVar("C8Y_PACT_MODE") || getEnvVar("C8Y_PACT_MODE", config.env);
  log(`validatePactMode() - ${mode}`);

  validatePactMode(mode); // throws on error
  const baseUrl =
    getEnvVar("C8Y_BASEURL") ||
    getEnvVar("CYPRESS_BASEURL") ||
    getEnvVar("C8Y_BASEURL", config.env) ||
    getEnvVar("CYPRESS_BASEURL", config.env);

  log(`validateBaseUrl() - ${baseUrl}`);
  validateBaseUrl(baseUrl); // throws on error

  let http: C8yPactHttpController | null = null;

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

  async function startHttpController(
    options: C8yPactHttpControllerOptions
  ): Promise<C8yPactHttpController> {
    if (http) {
      await stopHttpController();
    }
    http = new C8yPactHttpController(options);
    await http.start();
    return http;
  }

  async function stopHttpController(): Promise<null> {
    if (http) {
      await http.stop();
      http = null;
    }
    return null;
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
      "c8ypact:http:start": startHttpController,
      "c8ypact:http:stop": stopHttpController,
      "c8ypact:oauthLogin": login,
    });
  }
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

import * as path from "path";
import * as fs from "fs";
import debug from "debug";

import {
  C8yPactFileAdapter,
  C8yPactDefaultFileAdapter,
} from "../shared/c8ypact/fileadapter";
import { C8yPact } from "../shared/c8ypact/c8ypact";
import { C8yAuthOptions, oauthLogin } from "../shared/c8yclient";

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

  let pacts: { [key: string]: C8yPact } = {};

  // use C8Y_PLUGIN_LOADED to see if the plugin has been loaded
  config.env.C8Y_PLUGIN_LOADED = "true";
  // use C8Y_PACT_FOLDER to find out where the pact files have been loaded from
  config.env.C8Y_PACT_FOLDER = adapter.getFolder();

  function savePact(pact: C8yPact): null {
    const { id, info, records } = pact;
    log(`savePact() - ${pact.id} (${pact.records?.length || 0} records)`);
    validateId(id);

    const version = getVersion();
    if (version && info) {
      if (!info.version) {
        info.version = {};
      }
      info.version.runner = version;
      info.version.c8ypact = "1";
    }

    if (!pacts[id]) {
      pacts[id] = pact;
    } else {
      if (!pacts[id].records) {
        pacts[id].records = records;
      } else if (Array.isArray(records)) {
        Array.prototype.push.apply(pacts[id].records, records);
      } else {
        pacts[id].records.push(records);
      }
    }

    adapter?.savePact(pacts[id]);
    return null;
  }

  function getPact(pact: string): C8yPact | null {
    log(`getPact() - ${pact}`);
    validateId(pact);
    return pacts[pact] || null;
  }

  function loadPacts(): { [key: string]: C8yPact } | undefined {
    const p = adapter?.loadPacts();
    log(`loadPacts() - loaded ${p?.length}`);
    if (p) {
      pacts = p;
    }
    return p;
  }

  function removePact(pact: string): boolean {
    log(`removePact() - ${pact}`);
    validateId(pact);

    if (!pacts[pact]) return false;
    delete pacts[pact];

    adapter?.deletePact(pact);
    return true;
  }

  function clearAll(): { [key: string]: C8yPact } {
    log(`clearAll()`);
    pacts = {};
    return pacts;
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
      "c8ypact:load": loadPacts,
      "c8ypact:remove": removePact,
      "c8ypact:clearAll": clearAll,
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

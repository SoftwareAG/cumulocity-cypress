import * as path from "path";

import {
  C8yPactFileAdapter,
  C8yPactDefaultFileAdapter,
} from "../pacts/fileadapter";

export { C8yPactFileAdapter };

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
function configureC8yPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options: C8yPluginConfig = {}
) {
  let adapter: C8yPactFileAdapter = options.pactAdapter;
  if (!adapter) {
    const folder =
      options.pactFolder ||
      options.pactAdapter?.getFolder() ||
      // default folder is cypress/fixtures/c8ypact
      path.join(process.cwd(), "cypress", "fixtures", "c8ypact");
    adapter = new C8yPactDefaultFileAdapter(folder);
  }

  let pacts: { [key: string]: C8yPact } = {};

  // use C8Y_PLUGIN_LOADED to see if the plugin has been loaded
  config.env.C8Y_PLUGIN_LOADED = "true";
  // use C8Y_PACT_FOLDER to find out where the pact files have been loaded from
  config.env.C8Y_PACT_FOLDER = adapter.getFolder();

  function savePact(pact: C8yPact): null {
    const { id, info, records } = pact;
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
    validateId(pact);
    return pacts[pact] || null;
  }

  function loadPacts(): { [key: string]: C8yPact } {
    pacts = adapter?.loadPacts() || null;
    return pacts;
  }

  function removePact(pact: string): boolean {
    validateId(pact);

    if (!pacts[pact]) return false;
    delete pacts[pact];

    adapter.deletePact(pact);
    return true;
  }

  function clearAll(): { [key: string]: C8yPact } {
    pacts = {};
    return pacts;
  }

  function validateId(id: string): void {
    if (!id || typeof id !== "string") {
      throw new Error(`c8ypact id must be a string, was ${typeof id}`);
    }
  }

  on("task", {
    "c8ypact:save": savePact,
    "c8ypact:get": getPact,
    "c8ypact:load": loadPacts,
    "c8ypact:remove": removePact,
    "c8ypact:clearAll": clearAll,
  });
}

function getVersion() {
  let version = require("../../package.json").version;
  return version;
}

module.exports = { configureC8yPlugin, C8yPactDefaultFileAdapter };

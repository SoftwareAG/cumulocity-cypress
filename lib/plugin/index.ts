import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

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
 * Using C8yPactFileAdapter you can implement your own adapter to load and save pacts using any format you want.
 * This allows loading pact objects from different sources, such as HAR files, pact.io, etc.
 *
 * The default adapter is C8yPactDefaultFileAdapter which loads and saves pact objects from/to
 * json files using C8yPact objects. Default location is cypress/fixtures/c8ypact folder.
 */
export interface C8yPactFileAdapter {
  /**
   * Loads all pact objects. The key must be the pact id used in C8yPact.id.
   */
  loadPacts: () => { [key: string]: C8yPact };
  /**
   * Saves a pact object.
   */
  savePact: (pact: C8yPact) => void;
  /**
   * Deletes a pact object or file.
   */
  deletePact: (id: string) => void;
  /**
   * Gets the folder where the pact files are stored.
   */
  getFolder: () => string;
}

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

  // use C8Y_PACT_ENABLED to see if the plugin has been loaded
  config.env.C8Y_PACT_ENABLED = "true";
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

/**
 * Default implementation of C8yPactFileAdapter which loads and saves pact objects from/to
 * json files using C8yPact objects.
 */
class C8yPactDefaultFileAdapter implements C8yPactFileAdapter {
  folder: string;
  constructor(folder: string) {
    this.folder = folder;
  }

  getFolder(): string {
    return this.folder;
  }

  loadPacts(): { [key: string]: C8yPact } {
    const jsonFiles = this.loadPactObjects();
    return jsonFiles.reduce((acc, obj) => {
      acc[obj.info.id] = obj;
      return acc;
    }, {});
  }

  savePact(pact: C8yPact): void {
    this.createFolderRecursive(this.folder, true);
    const file = path.join(this.folder, `${pact.id}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          id: pact.id,
          info: pact.info,
          records: pact.records,
        },
        undefined,
        2
      ),
      "utf-8"
    );
  }

  deletePact(id: string): void {
    const filePath = path.join(this.folder, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.log(`File ${filePath} does not exist. Nothing to delete.`);
    }
  }

  readJsonFiles(): string[] {
    if (!this.folder || !fs.existsSync(this.folder)) {
      return [];
    }
    const jsonFiles = glob.sync(path.join(this.folder, "*.json"));
    const pacts = jsonFiles.map((file) => {
      return fs.readFileSync(file, "utf-8");
    });
    return pacts;
  }

  protected deleteJsonFiles(): void {
    if (!this.folder || !fs.existsSync(this.folder)) {
      return;
    }
    const jsonFiles = glob.sync(path.join(this.folder, "*.json"));
    jsonFiles.forEach((file) => {
      fs.unlinkSync(file);
    });
  }

  protected loadPactObjects() {
    const pacts = this.readJsonFiles();
    return pacts.map((pact) => JSON.parse(pact));
  }

  protected createFolderRecursive(f: string, absolutePath: boolean) {
    const parts = f?.split(path.sep);
    parts.forEach((part, i) => {
      let currentPath = path.join(...parts.slice(0, i + 1));
      if (absolutePath) {
        currentPath = path.join("/", currentPath);
      }
      try {
        fs.accessSync(currentPath, fs.constants.F_OK);
      } catch (err) {
        if (this.isNodeError(err, TypeError) && err.code === "ENOENT") {
          // Directory does not exist, create it
          fs.mkdirSync(currentPath);
        } else {
          throw err; // Other error, rethrow it
        }
      }
    });
  }

  protected isNodeError<T extends new (...args: any) => Error>(
    error: any,
    type: T
  ): error is InstanceType<T> & NodeJS.ErrnoException {
    return error instanceof type;
  }
}

module.exports = { configureC8yPlugin, C8yPactDefaultFileAdapter };

import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

type C8yPactPluginRecordObjects = { [key: string]: C8yPactRecord[] };
type C8yPactPluginInfoObjects = { [key: string]: C8yPactInfo };
type C8yPactPluginConfig = {
  folder?: string;
};

function c8yPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options: C8yPactPluginConfig = {}
) {
  let pactObjects: C8yPactPluginRecordObjects = {};
  let pactIndex: { [key: string]: number } = {};
  let pactInfo: C8yPactPluginInfoObjects = ({} = {});
  const folder =
    options?.folder || `${process.cwd()}${path.sep}cypress${path.sep}fixtures`;

  config.env.C8Y_PACT_ENABLED = "true";

  function savePact(pact: C8yPact): null {
    const { id, info, records } = pact;
    if (!id || typeof id !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof id}`);
    }

    const version = getVersion();
    if (version && info) {
      if (!info.version) {
        info.version = {};
      }
      info.version.runner = version;
      info.version.c8ypact = "1";
    }

    if (!pactObjects[id]) {
      pactObjects[id] = [];
    }
    if (Array.isArray(records)) {
      Array.prototype.push.apply(pactObjects[id], records);
    } else {
      pactObjects[id].push(records);
    }
    pactInfo[id] = info;

    const c8ypactFolder = `${folder}${path.sep}c8ypact`;
    createFolderRecursive(c8ypactFolder, true);

    const obj = { info, id: id, records: pactObjects[id] };

    const file = `${c8ypactFolder}${path.sep}${id}.json`;
    fs.writeFileSync(file, JSON.stringify(obj, undefined, 2), "utf-8");

    const exportDefinitions = Object.keys(pactObjects).map((key) => {
      const safeVariableName = key.replace(/[^a-zA-Z0-9_$]/g, "");
      return `export { default as ${safeVariableName} } from ".${path.sep}${key}.json";`;
    });

    const indexFile = `${c8ypactFolder}${path.sep}index.js`;
    fs.writeFileSync(indexFile, exportDefinitions.join("\n"), "utf-8");

    return null;
  }

  function getPactInfo(pact: string): C8yPactInfo | null {
    if (!pact || typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }
    return pactInfo[pact] || null;
  }

  function getPacts(pact: string): C8yPactRecord[] | null {
    if (!pact || typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }
    return pactObjects[pact] || null;
  }

  function getNextPact(
    pact: string
  ): { record: C8yPactRecord; info: C8yPactInfo; id: string } | null {
    if (!pact || typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }
    const index = pactIndex[pact] || 0;
    pactIndex[pact] = index + 1;
    return pactObjects[pact] && pactObjects[pact].length > index
      ? { record: pactObjects[pact][index], info: pactInfo[pact], id: pact }
      : null;
  }

  function loadPacts(folder: string): C8yPactPluginRecordObjects {
    const c8ypactFolder = `${folder}${path.sep}c8ypact`;
    const jsonFiles = loadJsonFiles(c8ypactFolder);
    pactObjects = jsonFiles.reduce((acc, obj) => {
      acc[obj.info.id] = obj.records;
      return acc;
    }, {});
    pactInfo = jsonFiles.reduce((acc, obj) => {
      acc[obj.info.id] = obj.info;
      return acc;
    }, {});
    pactIndex = {};
    return pactObjects || null;
  }

  function removePact(pact: string): boolean {
    if (typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }

    if (!pactObjects[pact]) return false;
    delete pactObjects[pact];
    delete pactIndex[pact];
    delete pactInfo[pact];

    return true;
  }

  function clearAll(): C8yPactPluginRecordObjects {
    pactObjects = {};
    pactIndex = {};
    pactInfo = {};
    return pactObjects;
  }

  on("task", {
    "c8ypact:save": savePact,
    "c8ypact:get": getPacts,
    "c8ypact:next": getNextPact,
    "c8ypact:info": getPactInfo,
    "c8ypact:load": loadPacts,
    "c8ypact:remove": removePact,
    "c8ypact:clearAll": clearAll,
  });
}

function loadJsonFiles(folderPath: string) {
  const jsonFiles = glob.sync(path.join(folderPath, "*.json"));

  let pact = [];
  for (const filePath of jsonFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      pact.push(JSON.parse(fileContent));
    } catch (error: any) {
      console.error(
        `Error reading pact at ${filePath}: ${
          error.message ? error.message : error
        }`
      );
    }
  }

  return pact;
}

function createFolderRecursive(folder: string, absolutePath: boolean) {
  const parts = folder.split(path.sep);

  for (let i = 1; i <= parts.length; i++) {
    let currentPath = path.join(...parts.slice(0, i));
    if (absolutePath) {
      currentPath = path.join("/", currentPath);
    }
    try {
      fs.accessSync(currentPath, fs.constants.F_OK);
    } catch (err) {
      if (isNodeError(err, TypeError) && err.code === "ENOENT") {
        // Directory does not exist, create it
        fs.mkdirSync(currentPath);
      } else {
        throw err; // Other error, rethrow it
      }
    }
  }
}

function getVersion() {
  let version = require("../../package.json").version;
  return version;
}

export function isNodeError<T extends new (...args: any) => Error>(
  error: any,
  type: T
): error is InstanceType<T> & NodeJS.ErrnoException {
  return error instanceof type;
}

module.exports = c8yPlugin;

import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

type C8yPactPluginRecordObjects = { [key: string]: C8yPactRecord[] };
type C8yPactPluginInfoObjects = { [key: string]: C8yPactInfo };
type C8yPactPluginConfig = {
  folder?: string;
};

let c8ypactFolder: string;

function c8yPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options: C8yPactPluginConfig = {}
) {
  let pactObjects: C8yPactPluginRecordObjects = {};
  let pactIndex: { [key: string]: number } = {};
  let pactInfo: C8yPactPluginInfoObjects = ({} = {});
  const folder =
    options?.folder || path.join(process.cwd(), "cypress", "fixtures");
  c8ypactFolder = path.join(folder, "c8ypact");

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

    createFolderRecursive(c8ypactFolder, true);

    const obj = { info, id: id, records: pactObjects[id] };

    const file = path.join(c8ypactFolder, `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(obj, undefined, 2), "utf-8");

    return null;
  }

  function getPactInfo(pact: string): C8yPactInfo | null {
    if (!pact || typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }
    return pactInfo[pact] || null;
  }

  function getPact(pact: string): C8yPact | null {
    if (!pact || typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }
    if (!pactObjects[pact]) return null;
    return { records: pactObjects[pact], info: pactInfo[pact], id: pact };
  }

  function getNextRecord(pact: string): C8yPactNextRecord | null {
    if (!pact || typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }
    const index = pactIndex[pact] || 0;
    pactIndex[pact] = index + 1;
    return pactObjects[pact] && pactObjects[pact].length > index
      ? { record: pactObjects[pact][index], info: pactInfo[pact] }
      : null;
  }

  function loadPacts(folder: string): C8yPactPluginRecordObjects {
    const c8ypactFolder = path.join(folder, `c8ypact`);
    const jsonFiles = loadPactObjects(c8ypactFolder);
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

    deletePactFile(pact, c8ypactFolder);
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
    "c8ypact:get": getPact,
    "c8ypact:next": getNextRecord,
    "c8ypact:info": getPactInfo,
    "c8ypact:load": loadPacts,
    "c8ypact:remove": removePact,
    "c8ypact:clearAll": clearAll,
  });
}

function readPactFiles(folderPath: string): string[] {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return [];
  }
  const jsonFiles = glob.sync(path.join(folderPath, "*.json"));
  const pacts = jsonFiles.map((file) => {
    return fs.readFileSync(file, "utf-8");
  });
  return pacts;
}

function deletePactFiles(folderPath: string): void {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return;
  }
  const jsonFiles = glob.sync(path.join(folderPath, "*.json"));
  jsonFiles.forEach((file) => {
    fs.unlinkSync(file);
  });
}

function deletePactFile(id: string, pactFolder: string): void {
  const filePath = path.join(pactFolder, `${id}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  } else {
    console.log(`File ${filePath} does not exist. Nothing to delete.`);
  }
}

function loadPactObjects(folderPath: string) {
  const pacts = readPactFiles(folderPath);
  return pacts.map((pact) => JSON.parse(pact));
}

function createFolderRecursive(folder: string, absolutePath: boolean) {
  const parts = folder.split(path.sep);
  parts.forEach((part, i) => {
    let currentPath = path.join(...parts.slice(0, i + 1));
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
  });
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

module.exports = { c8yPlugin, readPactFiles };

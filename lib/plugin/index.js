const fs = require("fs");
const path = require("path");
const glob = require("glob");

function c8yPlugin(on, config) {
  let savedValues = {};
  let pactIndex = {};

  config.env.C8Y_PACT_ENABLED = "true";

  function savePact({ pact, response, folder, info }) {
    if (typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }

    const version = getVersion();
    if (version && info) {
      if (!info.version) { 
        info.version = {};
      }
      info.version.runner = version;
      info.version.pact = "1";
    }

    if (!savedValues[pact]) {
      savedValues[pact] = [];
    }
    savedValues[pact].push(response);

    const c8ypactFolder = `${folder}${path.sep}c8ypact`;
    createFolderRecursive(c8ypactFolder, true);

    const obj = { info, id: pact, pact: savedValues[pact] };

    const file = `${c8ypactFolder}${path.sep}${pact}.json`;
    fs.writeFileSync(file, JSON.stringify(obj, undefined, 2), "utf-8");

    const exportDefinitions = Object.keys(savedValues).map((key) => {
      const safeVariableName = key.replace(/[^a-zA-Z0-9_$]/g, "");
      return `export { default as ${safeVariableName} } from ".${path.sep}${key}.json";`;
    });

    const indexFile = `${c8ypactFolder}${path.sep}index.js`;
    fs.writeFileSync(indexFile, exportDefinitions.join("\n"), "utf-8");

    return null;
  }

  function getPacts(pact) {
    if (typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }
    return savedValues[pact] || null;
  }

  function getNextPact(pact) {
    if (typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }
    const index = pactIndex[pact] || 0;
    pactIndex[pact] = index + 1;
    return savedValues[pact] && savedValues[pact].length > index
      ? savedValues[pact][index]
      : null;
  }

  function loadPacts(folder) {
    const c8ypactFolder = `${folder}${path.sep}c8ypact`;
    const jsonFiles = loadJsonFiles(c8ypactFolder);
    savedValues = jsonFiles.reduce((acc, obj) => {
      acc[obj.info.id] = obj.pact;
      return acc;
    }, {});
    pactIndex = {};
    return savedValues || null;
  }

  function removePact(pact) {
    if (typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }

    if (!pact in savedValues) {
      return false;
    }
    delete savedValues[pact];
    return true;
  }

  function clearAll() {
    savedValues = {};
    pactIndex = {};
    return savedValues;
  }

  on("task", {
    "c8ypact:save": savePact,
    "c8ypact:get": getPacts,
    "c8ypact:next": getNextPact,
    "c8ypact:load": loadPacts,
    "c8ypact:remove": removePact,
    "c8ypact:clearAll": clearAll,
  });
}

function loadJsonFiles(folderPath) {
  const jsonFiles = glob.sync(path.join(folderPath, "*.json"));

  let pact = [];
  for (const filePath of jsonFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      pact.push(JSON.parse(fileContent));
    } catch (error) {
      console.error(`Error reading pact at ${filePath}: ${error.message}`);
    }
  }

  return pact;
}

function createFolderRecursive(folder, absolutePath) {
  const parts = folder.split(path.sep);

  for (let i = 1; i <= parts.length; i++) {
    let currentPath = path.join(...parts.slice(0, i));
    if (absolutePath) {
      currentPath = path.join("/", currentPath);
    }
    try {
      fs.accessSync(currentPath, fs.constants.F_OK);
    } catch (err) {
      if (err.code === "ENOENT") {
        // Directory does not exist, create it
        fs.mkdirSync(currentPath);
      } else {
        throw err; // Other error, rethrow it
      }
    }
  }
}

function getVersion() {
  let version = require("../../package.json").version
  return version;
}

module.exports = c8yPlugin;

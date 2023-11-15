const fs = require("fs");
const path = require("path");
const glob = require("glob");

function c8yPlugin(on, config) {
  let savedValues = {};
  let pactIndex = {};

  config.env.C8Y_PACT_ENABLED = "true";

  function savePact({ pact, response, folder }) {
    if (typeof pact !== "string") {
      throw new Error(`c8ypact must be a string, was ${typeof pact}`);
    }
    if (!savedValues[pact]) {
      savedValues[pact] = [];
    }
    savedValues[pact].push(response);

    const c8ypactFolder = `${folder}${path.sep}c8ypact`;
    createFolderRecursive(c8ypactFolder, true);

    const file = `${c8ypactFolder}${path.sep}${pact}.json`;
    fs.writeFileSync(
      file,
      JSON.stringify(savedValues[pact], undefined, 2),
      "utf-8"
    );

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
    savedValues = loadJsonFiles(c8ypactFolder);
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

  let pact = {};
  for (const filePath of jsonFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const fileNameWithoutExtension = path.basename(filePath, ".json");
      pact[`${fileNameWithoutExtension}`] = JSON.parse(fileContent);
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

module.exports = c8yPlugin;

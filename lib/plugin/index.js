const debug = require("debug")("cypress-data-session");

function cypressC8ySessionPlugin(on, config) {
  const savedValues = {};

  function printDataSessions() {
    const n = Object.keys(savedValues).length;
    console.log("%d data session(s)", n);
    Object.keys(savedValues).forEach((key) => {
      console.log(
        "  %s: %o",
        key,
        JSON.stringify(savedValues[key], undefined, 2)
      );
    });

    return savedValues;
  }

  function saveResponse({ session, response }) {
    console.log(`saveResponse ${session} - ${response.status}`);
    if (typeof session !== "string") {
      throw new Error(`key must be a string, was ${typeof key}`);
    }
    if (!savedValues[session]) {
      savedValues[session] = [];
    }
    savedValues[session].push(response);

    return null;
  }

  function deepSave({ key, value }) {
    debug("deepSave", key, value);

    if (typeof key !== "string") {
      throw new Error(`key must be a string, was ${typeof key}`);
    }
    savedValues[key] = value;

    // Cypress tasks should return something, at least null
    return null;
  }

  function deepLoad(key) {
    debug("deepLoad", key);
    if (typeof key !== "string") {
      throw new Error(`key must be a string, was ${typeof key}`);
    }
    const value = savedValues[key];
    console.log("%s: value is %o", key, value);

    return value || null;
  }

  function deepClear(key) {
    if (typeof key !== "string") {
      throw new Error("Expected a string key");
    }
    debug("deepClear", key);
    debug("existing keys: %o", Object.keys(savedValues));

    if (!key in savedValues) {
      debug('could not find saved session "%s"', key);
      return false;
    }
    delete savedValues[key];
    debug(
      'removed key "%s", remaining keys: %o',
      key,
      Object.keys(savedValues)
    );

    return true;
  }

  function clearAll() {
    const n = Object.keys(savedValues).length;
    console.log("clearing %d data sessions", n);
    Object.keys(savedValues).forEach((key) => {
      delete savedValues[key];
    });
    console.log(savedValues);
    return savedValues;
  }

  on("task", {
    "c8ySession:saveResponse": saveResponse,
    "c8ySession:save": deepSave,
    "c8ySession:load": deepLoad,
    "c8ySession:clear": deepClear,
    "c8ySession:clearAll": clearAll,
    "c8ySession:print": printDataSessions,
  });

  debug("registered plugin tasks");
}

module.exports = cypressC8ySessionPlugin;

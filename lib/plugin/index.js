
function cypressC8ySessionPlugin(on, config) {
  const savedValues = {};

  function saveResponse({ session, response }) {
    if (typeof session !== "string") {
      throw new Error(`key must be a string, was ${typeof key}`);
    }
    if (!savedValues[session]) {
      savedValues[session] = [];
    }
    savedValues[session].push(response);

    return null;
  }

  function loadSession(key) {
    if (typeof key !== "string") {
      throw new Error(`session must be a string, was ${typeof key}`);
    }
    return savedValues[key] || null;
  }

  function clearSession(key) {
    if (typeof key !== "string") {
      throw new Error(`session must be a string, was ${typeof key}`);
    }

    if (!key in savedValues) {
      return false;
    }
    delete savedValues[key];
    return true;
  }

  function clearAll() {
    const n = Object.keys(savedValues).length;
    Object.keys(savedValues).forEach((key) => {
      delete savedValues[key];
    });
    return savedValues;
  }

  on("task", {
    "c8ySession:saveResponse": saveResponse,
    "c8ySession:load": loadSession,
    "c8ySession:clear": clearSession,
    "c8ySession:clearAll": clearAll,
  });
}

module.exports = cypressC8ySessionPlugin;

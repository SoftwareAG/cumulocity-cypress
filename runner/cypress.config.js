const { defineConfig } = require("cypress");
const { c8yPlugin, readPactFiles } = require("cumulocity-cypress/lib/plugin/");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      config.env.C8Y_PACT_FOLDER =
        "/Users/twi/Projects/cia/c8y-sensorapp-tests/cypress/fixtures";

      const fixture =
        config.env.C8Y_PACT_FOLDER ||
        config.env.pactFolder ||
        config.fixturesFolder;

      const jsonArray = readPactFiles(`${fixture}/c8ypact`);
      config.env._pacts = jsonArray;

      const baseUrl = config.env.baseUrl || null;
      if (baseUrl) {
        config.baseUrl = baseUrl;
      }

      c8yPlugin(on, config);
      return config;
    },
  },
});

const { defineConfig } = require("cypress");
const registerC8yPlugin = require("./cypress/plugin/");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const baseUrl = config.env.baseUrl || null;
      if (baseUrl) {
        config.baseUrl = baseUrl;
      }

      registerC8yPlugin(on, config);
      return config;
    },
  },
});

const { defineConfig } = require("cypress");
const registerC8yPlugin = require("../lib/plugin");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    setupNodeEvents(on, config) {
      registerC8yPlugin(on, config);
      return config;
    },
  },
});

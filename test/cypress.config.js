const { defineConfig } = require("cypress");
const { c8yPlugin } = require("../lib/plugin");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    setupNodeEvents(on, config) {
      c8yPlugin(on, config);
      return config;
    },
  },
});

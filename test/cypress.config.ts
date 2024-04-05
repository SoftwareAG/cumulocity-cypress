import { defineConfig } from "cypress";
import { configureC8yPlugin } from "../src/lib/plugin";

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    setupNodeEvents(on, config) {
      configureC8yPlugin(on, config);
      return config;
    },
  },
});

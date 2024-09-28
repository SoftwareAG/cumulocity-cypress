import { defineConfig } from "cypress";
import { configureC8yScreenshotPlugin } from "../plugin";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:4200",
    supportFile: false,
    video: false,
    videosFolder: "videos",
    screenshotsFolder: "screenshots",
    setupNodeEvents(on, config) {
      configureC8yScreenshotPlugin(on, config);
      return config;
    },
  },
});

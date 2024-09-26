import { defineConfig } from "cypress";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

function readYamlFile(filePath: string): any {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const data = yaml.load(fileContent);
  return data;
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    supportFile: false,
    video: false,
    setupNodeEvents(on, config) {
      const filePath = config.env._c8yScreenshotConfig 
      if (!filePath) {
        return config
      }
      const configData = readYamlFile(filePath);
      config.env._autoScreenshot = configData;

      // https://github.com/cypress-io/cypress/issues/27260
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.name === "chrome") {
          const viewportWidth = configData.config?.viewportWidth ?? 1920;
          const viewportHeight = configData.config?.viewportHeight ?? 1080;
          launchOptions.args.push(
            `--window-size=${viewportWidth},${viewportHeight} --headless=old`
          );
        }
        return launchOptions;
      });

      on("after:screenshot", (details) => {
        console.log("Screenshot details", details);
        return new Promise((resolve, reject) => {
          const newPath = details.specName.trim() == ""
            ? details.path
            : details.path?.replace(`${details.specName}${path.sep}`, "");

          const folder = newPath?.split(path.sep).slice(0, -1).join(path.sep);
          if (folder && !fs.existsSync(folder)) {
            const result = fs.mkdirSync(folder, { recursive: true });
            if (!result) {
              reject(`Failed to create folder ${folder}`);
            }
          }
          if (!folder) {
            resolve({
              path: details.path,
              size: details.size,
              dimensions: details.dimensions,
            });
          }
          fs.rename(details.path, newPath, (err) => {
            if (err) return reject(err);
            resolve({
              path: newPath,
              size: details.size,
              dimensions: details.dimensions,
            });
          });
        });
      });

      return config;
    },
  },
});

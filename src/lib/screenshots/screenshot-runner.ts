#!/usr/bin/env node

import cypress from "cypress";

import * as path from "path";
import * as fs from "fs";

(async () => {
  const args = process.argv.slice(2);
  if (!args.includes("run") && !args.includes("open")) {
    // insert the "run" command if it's not already there at the start of the array
    args.unshift("run");
  }
  let runOptions: any | undefined;
  if (args.includes("run") || args.includes("open")) {
    runOptions = await cypress.cli.parseRunArguments(args);
    if (runOptions.configFile?.endsWith(".yml")) {
      runOptions.configFile = path.resolve(runOptions.configFile);
      runOptions.env = {
        ...runOptions.env,
        ...{ _c8yScreenshotConfig: runOptions.configFile },
      };
      delete runOptions.configFile;
    } else {
      const configPaths = [
        "c8yscreenshot.config.yml",
        "c8yscreenshots.config.yml",
        "screenshots.config.yml",
      ];
      const config = configPaths.find((configPath) => {
        return fs.existsSync(path.resolve(configPath));
      });
      if (config) {
        console.log("Found config: ", config);
        runOptions = {
          env: {
            _c8yScreenshotConfig: path.resolve(config),
          },
        };
      }
    }
  }
  const config = {
    ...{
      configFile: path.resolve(path.dirname(__filename), "cypress.config.js"),
      browser: "chrome",
      testingType: "e2e",
      config: {
        e2e: {
          screenshotsFolder: path.resolve(process.cwd(), "myshots2"),
          baseUrl: "http://localhost:4200",
          specPattern: path.join(path.dirname(__filename), "*.cy.js"),
        },
      },
    },
    ...(runOptions ?? {}),
  };

  console.log("Running Cypress with config: ", config);

  if (args.includes("open")) {
    await cypress.open(config);
  } else {
    await cypress.run(config);
  }
})();

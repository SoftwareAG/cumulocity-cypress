#!/usr/bin/env node

import _ from "lodash";
import debug from "debug";
import { config as dotenv } from "dotenv";

import {
  C8yPactHttpController,
  C8yPactHttpControllerOptions,
} from "cumulocity-cypress/node";

import { cosmiconfig } from "cosmiconfig";
import { TypeScriptLoader } from "cosmiconfig-typescript-loader";

import {
  applyDefaultConfig,
  defaultLogger,
  getConfigFromArgsOrEnvironment,
} from "./startup-util";

export * from "cumulocity-cypress/node";

const log = debug("c8y:ctrl:startup");

(async () => {
  // load .env file first and overwrite with .c8yctrl file if present
  dotenv();
  dotenv({ path: ".c8yctrl", override: true });

  // read config from environment variables or command line arguments
  const [config, configFile] = getConfigFromArgsOrEnvironment();

  // load defaults and merge them with the current config
  applyDefaultConfig(config);

  // load config file if provided and merge it with the current config
  if (configFile) {
    const configLoader = cosmiconfig("cumulocity-cypress", {
      searchPlaces: [configFile, "c8yctrl.config.ts"],
      loaders: {
        ".ts": TypeScriptLoader(),
      },
    });

    const result = await configLoader.search(process.cwd());
    if (result) {
      log("loaded config: ", result.filepath);
      if (_.isFunction(result.config)) {
        log("config exported a function");
        const configClone = _.cloneDeep(config);
        // assign logger after deep cloning: https://github.com/winstonjs/winston/issues/1730
        configClone.logger = defaultLogger;
        const c = result.config(configClone);
        _.defaults(config, c || configClone);
      } else {
        log("config exported an object");
        config.logger = defaultLogger;
        _.defaults(config, result.config);
      }
      config.logger?.info("Config: " + result.filepath);
    }
  }

  // now config is complete and we can start the controller
  try {
    const c = config as C8yPactHttpControllerOptions;
    const controller = new C8yPactHttpController(c);
    config.on?.beforeStart?.(controller, c);
    await controller.start();
  } catch (error) {
    console.error("Error starting HTTP controller:", error);
  }
})();

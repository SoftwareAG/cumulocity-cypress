import cypress from "cypress";

import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { config as dotenv } from "dotenv";

import { C8yAjvSchemaMatcher } from "../contrib/ajv";
import schema from "./../screenshot/schema.json";
import {
  C8yScreenshotOptions,
  ScreenshotSetup,
} from "./../lib/screenshots/types";

(async () => {
  try {
    const args = getConfigFromArgs();
    if (!args.config) {
      throw new Error(
        "No config file provided. Use --config option to provide the config file."
      );
    }

    const yamlFile = path.resolve(process.cwd(), args.config);
    if (!fs.existsSync(yamlFile)) {
      throw new Error(`Config file ${yamlFile} does not exist.`);
    }

    const tags = (args.tags ?? []).join(",");
    const envs = {
      ...(dotenv().parsed ?? {}),
      ...(dotenv({ path: ".c8yscrn" }).parsed ?? {}),
      ...(tags.length > 0 ? { grepTags: tags } : {}),
    };

    let configData: ScreenshotSetup;
    try {
      configData = readYamlFile(yamlFile);
    } catch (error: any) {
      throw new Error(`Error reading config file. ${error.message}`);
    }

    try {
      const ajv = new C8yAjvSchemaMatcher();
      ajv.match(configData, schema, true);
    } catch (error: any) {
      throw new Error(`Invalid config file. ${error.message}`);
    }

    // might run in different environments, so we need to find the correct extension
    let fileExtension = __filename?.split(".")?.pop();
    if (!fileExtension || !["js", "ts", "mjs", "cjs"].includes(fileExtension)) {
      fileExtension = "js";
    }
    const cypressConfigFile = path.resolve(
      path.dirname(__filename),
      `config.${fileExtension}`
    );
    const config = {
      ...{
        configFile: cypressConfigFile,
        browser: args.browser ?? "chrome",
        testingType: "e2e" as const,
        quiet: args.quiet ?? true,
        config: {
          e2e: {
            baseUrl:
              args.baseUrl ??
              process.env.C8Y_BASEURL ??
              "http://localhost:8080",
            screenshotsFolder: path.resolve(
              process.cwd(),
              args.folder ?? "c8yscrn"
            ),
            specPattern: path.join(
              path.dirname(__filename),
              `*.cy.${fileExtension}`
            ),
          },
        },
      },
      ...{
        env: {
          ...envs,
          ...{ _c8yscrnConfigFile: yamlFile, _c8yscrnyaml: configData },
        },
      },
    };

    if (args.open === true) {
      await cypress.open(config);
    } else {
      await cypress.run(config);
    }
  } catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }
})();

export function getConfigFromArgs(): Partial<C8yScreenshotOptions> {
  const result = yargs(hideBin(process.argv))
    .usage("Usage: $0 [options]")
    .scriptName("c8yscrn")
    .option("config", {
      alias: "c",
      type: "string",
      requiresArg: true,
      description: "The yaml config file",
      required: true,
      default: "c8yscrn.config.yaml",
    })
    .option("folder", {
      alias: "f",
      type: "string",
      requiresArg: true,
      description: "The target folder for the screenshots",
    })
    .option("baseUrl", {
      alias: "u",
      type: "string",
      requiresArg: true,
      description: "The Cumulocity base url",
    })
    .option("browser", {
      alias: "b",
      type: "string",
      requiresArg: true,
      default: "chrome",
      description: "Browser to use",
    })
    .option("open", {
      type: "boolean",
      requiresArg: false,
      default: false,
      hidden: true,
    })
    .option("quiet", {
      type: "boolean",
      default: true,
      requiresArg: false,
      hidden: true,
    })
    .option("tags", {
      alias: "t",
      type: "array",
      requiresArg: false,
      description: "Run only screenshot workflows with the given tags",
      coerce: (arg) => {
        const result: string[] = [];
        (Array.isArray(arg) ? arg : [arg]).forEach((tag: string) => {
          const t = tag?.split(",");
          if (t != null) {
            result.push(...t);
          }
        });
        return result;
      },
    })
    .help()
    .wrap(100)
    .parseSync();

  const filteredResult = Object.fromEntries(
    Object.entries(result).filter(([, value]) => value !== undefined)
  );

  return filteredResult;
}

function readYamlFile(filePath: string): any {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const data = yaml.load(fileContent);
  return data;
}

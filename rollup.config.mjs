import dts from "rollup-plugin-dts";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import alias from "@rollup/plugin-alias";
import json from "@rollup/plugin-json";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import includePaths from "rollup-plugin-includepaths";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ccPath = path.resolve(
  __dirname,
  "./packages/pact-http-controller/dist/src"
);

console.log("Resolving cumulocity-cypress to", ccPath);

let includePathOptions = {
  include: {},
  paths: ["src"],
  external: [],
  extensions: [".js"],
};

const aliasConfig = {
  entries: [
    {
      find: "cumulocity-cypress",
      replacement: ccPath,
    },
  ],
};

export default [
  {
    input: "dist/plugin/index.js",
    output: [
      {
        name: "c8y",
        file: "dist/plugin/index.js",
        format: "umd",
        sourcemap: false,
      },
    ],
    plugins: [
      resolve({
        resolveOnly: ["./src/**"],
      }),
      commonjs(),
      json(),
    ],
  },
  {
    input: "dist/plugin/index.d.ts",
    output: [
      { file: "dist/plugin/index.d.ts", format: "es", sourcemap: false },
    ],
    plugins: [dts()],
  },
  {
    input:
      "./packages/pact-http-controller/dist/packages/pact-http-controller/src/startup.js",
    output: [
      {
        name: "c8yctrl",
        file: "dist/bin/c8yctrl.js",
        format: "cjs",
      },
    ],
    plugins: [
      includePaths(includePathOptions),
      resolve({
        extensions: [".js"],
        preferBuiltins: true,
        mainFields: ["main", "module"],
        resolveOnly: ["./packages/pact-http-controller/dist/**"],
      }),
      alias(aliasConfig),
      commonjs(),
      json(),
    ],
  },
  {
    input: "dist/shared/c8yctrl/index.d.ts",
    output: [{ file: "dist/bin/c8yctrl.d.ts", format: "es", sourcemap: false }],
    plugins: [dts()],
  },
];

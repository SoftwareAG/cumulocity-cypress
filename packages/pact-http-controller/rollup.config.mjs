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
  "./../../packages/pact-http-controller/dist/src"
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

function removeShebang() {
  return {
    name: "remove-shebang",
    renderChunk(code) {
      return code.replace("#!/usr/bin/env node\n", "");
    },
  };
}

export default [
  {
    input: "dist/packages/pact-http-controller/src/startup.js",
    output: [
      {
        name: "c8yctrl",
        file: "dist/ctrl/index.js",
        format: "cjs",
      },
    ],
    plugins: [
      includePaths(includePathOptions),
      resolve({
        extensions: [".js"],
        preferBuiltins: true,
        mainFields: ["main", "module"],
        resolveOnly: ["./dist/**"],
      }),
      alias(aliasConfig),
      commonjs(),
      json(),
    ],
  },
  {
    input: "dist/packages/pact-http-controller/src/startup.d.ts",
    output: [{ file: "dist/ctrl/index.d.ts", format: "es", sourcemap: true }],
    plugins: [dts(), alias(aliasConfig), removeShebang()],
  },
];

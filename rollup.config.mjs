import dts from "rollup-plugin-dts";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
// import typescript from "rollup-plugin-typescript2";
import json from "@rollup/plugin-json";

// eslint-disable-next-line import/no-named-as-default
import glob from 'glob';

import path from "node:path";
import { fileURLToPath } from "node:url";

export default [
  {
    input: "dist/plugin/index.js",
    output: [
      {
        name: "c8y",
        file: "dist/plugin/index.js",
        format: "umd",
        sourcemap: true,
      },
    ],
    plugins: [
      resolve({
        only: ["./src/**"],
      }),
      commonjs(),
      json(),
    ],
  },
  {
    input: "dist/plugin/index.d.ts",
    output: [{ file: "dist/plugin/index.d.ts", format: "es", sourcemap: true }],
    plugins: [dts()],
  },
  {
    input: Object.fromEntries(
      // eslint-disable-next-line import/no-named-as-default-member
      glob.sync("dist/lib/screenshots/*.js").map((file) => [
        path.relative(
          "dist",
          file.slice(0, file.length - path.extname(file).length)
        ),
        fileURLToPath(new URL(file, import.meta.url)),
      ])
    ),
    output: [
      {
        dir: "dist",
        format: "commonjs",
      },
    ],
    plugins: [
      resolve({
        only: ["./src/**"],
      }),
      commonjs(),
      json(),
    ],
  },
];

import dts from "rollup-plugin-dts";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

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
];

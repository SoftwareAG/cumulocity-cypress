/// <reference types="jest" />

import * as yaml from "yaml";

import { C8yAjvSchemaMatcher } from "../contrib/ajv";
import { createInitConfig } from "./helper";
import schema from "./../screenshot/schema.json";

jest.spyOn(process, "cwd").mockReturnValue("/home/user/test");

describe("startup", () => {
  const ajv = new C8yAjvSchemaMatcher();

  describe("createInitConfig", () => {
    it("should be valid yaml", () => {
      expect(() => {
        const data = yaml.parse(createInitConfig("http://localhost:8080"));
        expect(data).not.toBeNull();
        ajv.match(data, schema, true);
      }).not.toThrow();
    });
  });
});

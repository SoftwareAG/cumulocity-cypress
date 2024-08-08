/// <reference types="jest" />

import { C8yPactDefaultFileAdapter, configureC8yPlugin } from "./index";
import path from "path";

jest.spyOn(process, "cwd").mockReturnValue("/home/user/test");

describe("plugin", () => {
  describe("configurePlugin ", () => {
    it("should use pact folder from config", () => {
      const config = { env: {} };
      configureC8yPlugin(undefined as any, config as any, {
        pactFolder: "cypress/fixtures/c8ypact",
      });
      expect(path.resolve((config.env as any).C8Y_PACT_FOLDER)).toBe(
        path.resolve("/home/user/test/cypress/fixtures/c8ypact")
      );
      expect((config.env as any).C8Y_PLUGIN_LOADED).toBe("true");
    });

    it("should use pact folder from C8Y_PACT_FOLDER env variable", () => {
      const config = { env: {} };
      process.env.C8Y_PACT_FOLDER = "cypress/fixtures/c8ypact";
      configureC8yPlugin(undefined as any, config as any, {});
      expect(path.resolve((config.env as any).C8Y_PACT_FOLDER)).toBe(
        path.resolve("/home/user/test/cypress/fixtures/c8ypact")
      );
      expect((config.env as any).C8Y_PLUGIN_LOADED).toBe("true");
    });

    it("should use pact folder from CYPRESS_C8Y_PACT_FOLDER env variable", () => {
      const config = { env: {} };
      process.env.CYPRESS_C8Y_PACT_FOLDER = "cypress/fixtures/c8ypact";
      configureC8yPlugin(undefined as any, config as any, {});
      expect(path.resolve((config.env as any).C8Y_PACT_FOLDER)).toBe(
        path.resolve("/home/user/test/cypress/fixtures/c8ypact")
      );
      expect((config.env as any).C8Y_PLUGIN_LOADED).toBe("true");
    });

    it("should use default pact folder", () => {
      const config = { env: {} };
      configureC8yPlugin(undefined as any, config as any, {});
      expect(path.resolve((config.env as any).C8Y_PACT_FOLDER)).toBe(
        path.resolve("/home/user/test/cypress/fixtures/c8ypact")
      );
      expect((config.env as any).C8Y_PLUGIN_LOADED).toBe("true");
    });

    it("should use pact adapter from options", () => {
      const config = { env: {} };
      const pactAdapter = new C8yPactDefaultFileAdapter(
        "cypress/fixtures/c8ypact2"
      );
      configureC8yPlugin(undefined as any, config as any, {
        pactAdapter,
      });
      expect(path.resolve((config.env as any).C8Y_PACT_FOLDER)).toBe(
        path.resolve("/home/user/test/cypress/fixtures/c8ypact2")
      );
      expect((config.env as any).C8Y_PLUGIN_LOADED).toBe("true");
    });
  });
});

/// <reference types="jest" />

import _ from "lodash";
import {
  applyDefaultConfig,
  defaultLogger,
  getConfigFromArgs,
  getConfigFromArgsOrEnvironment,
  getConfigFromEnvironment,
  getEnvVar,
} from "./startup-util";

import {
  C8yPactDefaultFileAdapter,
  C8yPactHttpControllerOptions,
} from "../../../src/node";

describe("startup util tests", () => {
  describe("getEnvVar", () => {
    test("getEnvVar should return value for same key", () => {
      process.env.MY_VARIABLE = "my value";
      const result = getEnvVar("MY_VARIABLE");
      expect(result).toBe("my value");
    });

    test("getEnvVar should return value for camelCase key", () => {
      process.env.myVariable = "my value";
      const result = getEnvVar("MY_VARIABLE");
      expect(result).toBe("my value");
    });

    test("getEnvVar should return value for key with Cypress_ prefix", () => {
      process.env.CYPRESS_MY_VARIABLE = "my value";
      const result = getEnvVar("MY_VARIABLE");
      expect(result).toBe("my value");
    });

    test("getEnvVar should return value for key with C8Y_ prefix", () => {
      process.env.MY_VARIABLE = "my value";
      const result = getEnvVar("C8Y_MY_VARIABLE");
      expect(result).toBe("my value");
    });

    test("getEnvVar should return value for key with CYPRESS_ prefix and camel case variable", () => {
      process.env.CYPRESS_myVariable = "my value";
      const result = getEnvVar("MY_VARIABLE");
      expect(result).toBe("my value");
    });

    test("getEnvVar should return value for camelCase key with cypress prefix", () => {
      process.env.cypressMyVariable = "my value";
      const result = getEnvVar("MY_VARIABLE");
      expect(result).toBe("my value");
    });
  });

  describe("getConfigFromArgs", () => {
    test("getConfigFromArgs should return partial config", () => {
      process.argv = [
        "node",
        "script.js",
        "--folder",
        "/my/folder",
        "--port",
        "1234",
        "--baseUrl",
        "http://example.com",
        "--user",
        "user",
        "--password",
        "password",
        "--tenant",
        "tenant",
        "--staticRoot",
        "static",
        "--recording",
        "true",
        "--config",
        "c8yctrl.config.ts",
      ];
      const [config, configFile] = getConfigFromArgs();
      expect(config.folder).toBe("/my/folder");
      expect(config.port).toBe(1234);
      expect(config.baseUrl).toBe("http://example.com");
      expect(config.user).toBe("user");
      expect(config.password).toBe("password");
      expect(config.tenant).toBe("tenant");
      expect(config.staticRoot).toBe("static");
      expect(config.isRecordingEnabled).toBeTruthy();
      expect(configFile).toBe("c8yctrl.config.ts");
    });

    test("getConfigFromArgs should support aliases", () => {
      process.argv = [
        "node",
        "script.js",
        "--pactFolder",
        "/my/folder",
        "--static",
        "static",
      ];
      const [config] = getConfigFromArgs();
      expect(config.folder).toBe("/my/folder");
      expect(config.staticRoot).toBe("static");
    });

    test("getConfigFromArgs should use default values", () => {
      process.argv = ["node", "script.js", "--recording"];
      const [config] = getConfigFromArgs();
      expect(config.isRecordingEnabled).toBe(true);
    });
  });

  describe("getConfigFromEnvironment", () => {
    test("getConfigFromEnvironment should return partial config", () => {
      process.env.C8Y_PACT_FOLDER = "/my/folder";
      process.env.C8Y_HTTP_PORT = "1234";
      process.env.C8Y_BASE_URL = "http://example.com";
      process.env.C8Y_BASE_USERNAME = "user";
      process.env.C8Y_BASE_PASSWORD = "password";
      process.env.C8Y_BASE_TENANT = "tenant";
      process.env.C8Y_STATIC_ROOT = "/my/static/root";
      process.env.PACT_MODE = "recording";
      const config = getConfigFromEnvironment();
      expect(config.folder).toBe("/my/folder");
      expect(config.port).toBe(1234);
      expect(config.baseUrl).toBe("http://example.com");
      expect(config.user).toBe("user");
      expect(config.password).toBe("password");
      expect(config.tenant).toBe("tenant");
      expect(config.staticRoot).toBe("/my/static/root");
      expect(config.isRecordingEnabled).toBeTruthy();
    });
  });

  describe("getConfigFromArgsOrEnvironment", () => {
    test("getConfigFromArgsOrEnvironment should return config from args", () => {
      process.argv = [
        "node",
        "script.js",
        "--folder",
        "/my/folder",
        "--port",
        "1234",
        "--baseUrl",
        "http://example.com",
        "--user",
        "user",
        "--password",
        "password",
        "--tenant",
        "tenant",
        "--staticRoot",
        "static",
        "--recording",
        "true",
        "--config",
        "c8yctrl.config.ts",
      ];
      const [config, configFile] = getConfigFromArgsOrEnvironment();
      expect(config.folder).toBe("/my/folder");
      expect(config.port).toBe(1234);
      expect(config.baseUrl).toBe("http://example.com");
      expect(config.user).toBe("user");
      expect(config.password).toBe("password");
      expect(config.tenant).toBe("tenant");
      expect(config.staticRoot).toBe("static");
      expect(config.isRecordingEnabled).toBeTruthy();
      expect(configFile).toBe("c8yctrl.config.ts");
    });

    test("getConfigFromArgsOrEnvironment should return config from environment", () => {
      process.env.C8Y_PACT_FOLDER = "/my/folder";
      process.env.C8Y_HTTP_PORT = "1234";
      process.env.C8Y_BASE_URL = "http://example.com";
      process.env.C8Y_BASE_USERNAME = "user";
      process.env.C8Y_BASE_PASSWORD = "password";
      process.env.C8Y_BASE_TENANT = "tenant";
      process.env.C8Y_STATIC_ROOT = "/my/static/root";
      process.env.PACT_MODE = "recording";
      process.argv = ["node", "script.js"];
      const [config, configFile] = getConfigFromArgsOrEnvironment();
      expect(config.folder).toBe("/my/folder");
      expect(config.port).toBe(1234);
      expect(config.baseUrl).toBe("http://example.com");
      expect(config.user).toBe("user");
      expect(config.password).toBe("password");
      expect(config.tenant).toBe("tenant");
      expect(config.staticRoot).toBe("/my/static/root");
      expect(config.isRecordingEnabled).toBeTruthy();
      expect(configFile).toBeUndefined();
    });

    test("getConfigFromArgsOrEnvironment should return config from args and environment", () => {
      process.env.C8Y_PACT_FOLDER = "/my/folder";
      process.env.C8Y_HTTP_PORT = "1234";
      process.env.C8Y_BASE_URL = "http://example.com";
      process.argv = [
        "node",
        "script.js",
        "--user",
        "user",
        "--password",
        "password",
        "--tenant",
        "tenant",
        "--staticRoot",
        "/my/static/root",
        "--recording",
        "true",
        "--config",
        "c8yctrl.config.ts",
      ];
      const [config, configFile] = getConfigFromArgsOrEnvironment();
      expect(config.folder).toBe("/my/folder");
      expect(config.port).toBe(1234);
      expect(config.baseUrl).toBe("http://example.com");
      expect(config.user).toBe("user");
      expect(config.password).toBe("password");
      expect(config.tenant).toBe("tenant");
      expect(config.staticRoot).toBe("/my/static/root");
      expect(config.isRecordingEnabled).toBeTruthy();
      expect(configFile).toBe("c8yctrl.config.ts");
    });
  });

  describe("applyDefaultConfig", () => {
    test("applyDefaultConfig should apply defaults", () => {
      const config: any = {};
      applyDefaultConfig(config);
      expect(config.adapter).toBeDefined();
      expect(config.on).toBeDefined();
      expect(config.mockNotFoundResponse).toBeDefined();
      expect(config.logger).toBeDefined();
      expect(config.logger).toBe(defaultLogger);
      expect(config.requestMatching).toBeDefined();
      expect(config.preprocessor).toBeDefined();
    });

    test("applyDefaultConfig should not overwrite existing values", () => {
      const config: C8yPactHttpControllerOptions = {
        adapter: new C8yPactDefaultFileAdapter("/my/folder"),
        on: {
          beforeStart: () => {},
        },
      };
      applyDefaultConfig(config);
      expect(config.on.beforeStart).toBeDefined();
      expect(config.adapter.getFolder()).toBe("/my/folder");
    });

    test("should create C8yAuthOptions if not provided", () => {
      const config: any = {
        user: "user",
        password: "password",
        tenant: "tenant",
      };
      applyDefaultConfig(config);
      expect(config.auth).toBeDefined();
      expect(config.auth.user).toBe("user");
      expect(config.auth.password).toBe("password");
      expect(config.auth.tenant).toBe("tenant");
    });

    test("lodash isFunction should return false for undefined", () => {
      expect(_.isFunction(undefined)).toBeFalsy();
    });
  });
});

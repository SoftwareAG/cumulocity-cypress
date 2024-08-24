import _ from "lodash";
import fs from "fs";
import path from "path";

import {
  C8yPactHttpController,
  C8yPactHttpControllerConfig,
  C8yPactHttpResponse,
} from "cumulocity-cypress/shared/c8yctrl";

import { Request } from "express";

import { createLogger, format, transports } from "winston";
// https://github.com/winstonjs/winston/issues/2430
// use following import if transports is empty
import { default as transportsDirect } from "winston/lib/winston/transports/";
import morgan from "morgan";

const safeTransports = !_.isEmpty(transports) ? transports : transportsDirect;

export default (config: C8yPactHttpControllerConfig) => {
  config.logLevel = "debug";

  config.logger = createLogger({
    transports: [
      new safeTransports.Console({
        format: format.combine(
          format.colorize({
            all: true,
            colors: {
              info: "green",
              error: "red",
              warn: "yellow",
              debug: "white",
            },
          }),
          format.simple()
        ),
      }),
    ],
  });

  // morgan must not log with opts.immediate enabled
  const requestLogFormat =
    ":method :url :status :res[content-length] - :response-time ms";
  config.requestLogger = [
    morgan(`[:res[x-c8yctrl-type]] ${requestLogFormat}`, {
      skip: (req, res) => {
        return res.getHeader("x-c8yctrl-type") === undefined;
      },
      stream: {
        write: (message: string) => {
          config.logger?.debug(message.trim());
        },
      },
    }),
    morgan(`[c8yctrl] ${requestLogFormat}`, {
      skip: (req) => {
        return (
          !req.url.startsWith("/c8yctrl") || req.url.startsWith("/c8yctrl/log")
        );
      },
      stream: {
        write: (message: string) => {
          config.logger?.warn(message.trim());
        },
      },
    }),
    morgan("dev", {
      skip: (req, res) => {
        return (
          res.statusCode < 400 || req.url.startsWith("/notification/realtime")
        );
      },
      stream: {
        write: (message: string) => {
          config.logger?.error(message.trim());
        },
      },
    }),
    morgan("common", {
      stream: fs.createWriteStream(path.join(__dirname, "c8yctrl_access.log"), {
        flags: "a",
      }),
    }),
  ];

  /**
   * onProxyResponse is used to filter out requests that are already recorded. This is to avoid
   * recording the same request multiple times.
   */
  config.on.proxyResponse = (
    ctrl: C8yPactHttpController,
    req: Request,
    res: C8yPactHttpResponse
  ) => {
    // log some details of request and responses for failing requests
    if ((res.status || 200) >= 400) {
      ctrl.logger?.error({
        url: req.url,
        status: `${res.status} ${res.statusText}`,
        requestHeader: JSON.stringify(req.headers, undefined, 2),
        responseHeader: JSON.stringify(res.headers, undefined, 2),
        responseBody: _.isString(res.body)
          ? res.body
          : ctrl.stringify(res.body),
      });
    }
    // filter out requests that are already recorded
    const record = ctrl.currentPact?.nextRecordMatchingRequest(
      req,
      config.baseUrl
    );
    if (record) {
      res.headers = res.headers || {};
      res.headers["x-c8yctrl-type"] = "duplicate";
    }
    return record == null;
  };
};

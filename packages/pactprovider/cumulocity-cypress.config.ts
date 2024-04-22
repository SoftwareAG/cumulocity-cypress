import {
  C8yDefaultPactRecord,
  C8yPactDefaultFileAdapter,
  C8yPactHttpProviderOptions,
} from "cumulocity-cypress/node";
import _ from "lodash";

import { createLogger, format, transports } from "winston";
// https://github.com/winstonjs/winston/issues/2430
// use following import if transports is empty
import { default as transportsDirect } from "winston/lib/winston/transports/";

const safeTransports = !_.isEmpty(transports) ? transports : transportsDirect;

const config: C8yPactHttpProviderOptions = {
  adapter: new C8yPactDefaultFileAdapter(
    "/Users/twi/Projects/cumulocity-cypress/test/cypress/fixtures/c8ypact"
  ),
  errorResponseRecord: (url) => {
    return C8yDefaultPactRecord.from({
      status: 404,
      statusText: "Not Found",
      body: `Not Found: ${url}`,
      headers: {
        "content-type": "application/text",
      },
    });
  },
  logFormat: "short",
  logLevel: "info",
  logger: createLogger({
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
      new safeTransports.File({
        format: format.simple(),
        filename: "combined.log",
      }),
    ],
  }),
};

export default config;

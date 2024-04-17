import {
  C8yDefaultPactRecord,
  C8yPactDefaultFileAdapter,
  C8yPactHttpProviderOptions,
} from "cumulocity-cypress/node";

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
};

export default config;

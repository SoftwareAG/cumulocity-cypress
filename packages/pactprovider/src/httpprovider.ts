import _ from "lodash";

import {
  C8yPactDefaultFileAdapter,
  C8yAuthOptions,
  oauthLogin,
  C8yPactHttpProvider,
} from "cumulocity-cypress/node";

const folder = process.env.C8Y_PACT_FOLDER;
if (!folder) {
  console.error("No pact folder specified. Please set C8Y_PACT_FOLDER.");
  process.exit(1);
}

const port = +(process.env.C8Y_HTTP_PORT || 3000);
const baseUrl = process.env.C8Y_BASE_URL;
const user = process.env.C8Y_BASE_USERNAME;
const password = process.env.C8Y_BASE_PASSWORD;

const tenant = process.env.C8Y_BASE_TENANT;
const staticRoot = process.env.C8Y_STATIC_ROOT;

console.log(`Using pact folder: ${folder}`);

const adapter = new C8yPactDefaultFileAdapter(folder);
const pacts = adapter.loadPacts() || [];
// if (!pacts || _.isEmpty(pacts)) {
//   console.error(`No pacts found in folder: ${adapter.getFolder()}`);
//   process.exit(1);
// }

const auth: C8yAuthOptions | undefined =
  user && password ? { user, password, tenant } : undefined;

if (staticRoot) {
  console.log(`Using static root: ${staticRoot}`);
}

(async () => {
  try {
    if (auth) {
      const a = await oauthLogin(auth, baseUrl);
      _.extend(auth, _.pick(a, ["bearer", "xsfrToken"]));
    }

    const provider = new C8yPactHttpProvider(Object.values(pacts), {
      port,
      baseUrl,
      tenant,
      staticRoot,
      auth,
      adapter,
    });
    await provider.start();

    console.log(`Listing: http://localhost:${port}`);
  } catch (error) {
    console.error("Error starting provider:", error);
  }
})();

import { BasicAuth, FetchClient, IAuthentication } from "@c8y/client";
const { getAuthOptionsFromEnv, getBaseUrlFromEnv } = require("./../utils");

export class C8yPactFetchClient extends FetchClient {
  constructor(auth?: IAuthentication, public baseUrl?: string) {
    const authOptions = getAuthOptionsFromEnv();
    if (!auth && authOptions) {
      auth = new BasicAuth(authOptions);
    }
    baseUrl = baseUrl || getBaseUrlFromEnv();
    super(auth || getAuthOptionsFromEnv(), baseUrl || baseUrl);
  }
}

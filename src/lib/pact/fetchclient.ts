import {
  BasicAuth,
  FetchClient,
  IAuthentication,
  IFetchOptions,
  IFetchResponse,
} from "@c8y/client";
import {
  toWindowFetchResponse,
  wrapFetchResponse,
} from "../../shared/c8yclient";
import { C8yDefaultPact } from "../../shared/c8ypact";
const { getAuthOptions, getBaseUrlFromEnv } = require("./../utils");

const { _ } = Cypress;

export class C8yPactFetchClient extends FetchClient {
  private authOptions: C8yAuthOptions;
  private authentication: IAuthentication;
  private cypresspact: CypressC8yPact;

  constructor(options: {
    auth?: IAuthentication | string;
    baseUrl?: string;
    cypresspact?: CypressC8yPact;
  }) {
    let auth: IAuthentication;
    let baseUrl: string;

    const authOptions = getAuthOptions(options?.auth);
    if ((!options?.auth || _.isString(options?.auth)) && authOptions) {
      auth = new BasicAuth(authOptions);
    }

    baseUrl = baseUrl || getBaseUrlFromEnv();
    if (!auth) {
      throw new Error("C8yPactFetchClient Error. No authentication provided.");
    }
    if (!baseUrl) {
      throw new Error("C8yPactFetchClient Error. No baseUrl provided.");
    }

    super(auth, baseUrl);

    this.authOptions = authOptions;
    this.authentication = auth as IAuthentication;
    this.cypresspact = options?.cypresspact;
  }

  async fetch(
    url: string,
    fetchOptions?: IFetchOptions
  ): Promise<IFetchResponse> {
    const setUserEnv = () => {
      Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", this.authOptions.userAlias);
      Cypress.env("C8Y_LOGGED_IN_USER", this.authOptions.user);
    };

    const currentPact = this.cypresspact?.current as C8yDefaultPact;
    if (currentPact && this.cypresspact?.isRecordingEnabled() !== true) {
      const fullUrl: string = this.getUrl(url, fetchOptions);
      const record = currentPact.getRecordsMatchingRequest({
        url: fullUrl,
        method: fetchOptions?.method,
      });
      if (record) {
        const first = _.first(record);
        if (first) {
          const response = toWindowFetchResponse(first);
          if (response) {
            return Promise.resolve(response);
          }
        }
      }
    }

    try {
      const response = await super.fetch(url, fetchOptions);
      if (this.cypresspact == null) {
        return Promise.resolve(response);
      }

      const result = await this.savePact(response, url, fetchOptions);
      return Promise.resolve(result);
    } catch (failure) {
      if (this.cypresspact == null) {
        setUserEnv();
        return Promise.reject(failure);
      }

      const result = await this.savePact(
        failure as IFetchResponse,
        url,
        fetchOptions
      );
      return Promise.reject(result);
    }
  }

  protected async savePact(
    response: IFetchResponse,
    url: string,
    fetchOptions?: IFetchOptions
  ) {
    let result = response;

    let responseObj = response.responseObj as Cypress.Response<any>;
    if (!response.responseObj) {
      const fullUrl: string = this.getUrl(url, fetchOptions);
      result = await wrapFetchResponse(response, {
        url: new URL(fullUrl, this.baseUrl),
        fetchOptions: this.getFetchOptions(fetchOptions),
      });
      responseObj = result.responseObj as Cypress.Response<any>;
    } else {
      delete response.responseObj;
    }

    await Cypress.c8ypact.savePact(
      responseObj,
      {
        _auth: this.authentication,
      },
      {
        noqueue: true,
        loggedInUser: this.authOptions.user,
        loggedInUserAlias: this.authOptions.userAlias,
      }
    );

    return result;
  }
}

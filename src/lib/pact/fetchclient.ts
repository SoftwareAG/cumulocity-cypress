import {
  FetchClient,
  IAuthentication,
  IFetchOptions,
  IFetchResponse,
} from "@c8y/client";
import {
  getCookieValue,
  toWindowFetchResponse,
  wrapFetchResponse,
} from "../../shared/c8yclient";
import { C8yAuthOptions, isAuthOptions } from "../../shared/auth";
import {
  getAuthOptions,
  getBaseUrlFromEnv,
  getC8yClientAuthentication,
} from "../utils";

const { _ } = Cypress;

export class C8yPactFetchClient extends FetchClient {
  private authentication: IAuthentication;
  private cypresspact: CypressC8yPact | undefined;
  private authOptions: C8yAuthOptions | undefined;

  private user: string;
  private userAlias: string;

  constructor(options: {
    auth?: C8yAuthOptions | IAuthentication | string;
    baseUrl?: string;
    cypresspact?: CypressC8yPact;
  }) {
    const auth = getC8yClientAuthentication(options.auth);
    const url: string = options.baseUrl || getBaseUrlFromEnv();

    let authOptions: C8yAuthOptions | undefined;
    if (_.isString(auth)) {
      authOptions = getAuthOptions(auth);
    } else if (isAuthOptions(auth)) {
      authOptions = auth;
    }

    if (!auth) {
      throw new Error("C8yPactFetchClient Error. No authentication provided.");
    }
    if (!url) {
      throw new Error("C8yPactFetchClient Error. No baseUrl provided.");
    }

    const [user, userAlias] = [
      // @ts-expect-error
      authOptions?.user || auth?.user || Cypress.env("C8Y_LOGGED_IN_USER"),
      authOptions?.userAlias || Cypress.env("C8Y_LOGGED_IN_USER_ALIAS"),
    ];
    super(auth, url);

    this.authOptions = authOptions;
    this.authentication = auth;
    this.cypresspact = options?.cypresspact;
    this.user = user;
    this.userAlias = userAlias;
  }

  protected getUser(): [string, string] {
    return [this.user, this.userAlias];
  }

  async fetch(
    url: string,
    fetchOptions?: IFetchOptions
  ): Promise<IFetchResponse> {
    const setUserEnv = () => {
      Cypress.env("C8Y_LOGGED_IN_USER_ALIAS", this.userAlias);
      Cypress.env("C8Y_LOGGED_IN_USER", this.user);
    };

    const isRecordingEnabled = this.cypresspact?.isRecordingEnabled() === true;
    const currentPact = this.cypresspact?.current;

    if (!isRecordingEnabled) {
      const fullUrl: string = this.getUrl(url, fetchOptions);
      if (currentPact) {
        const record = currentPact.nextRecordMatchingRequest({
          url: fullUrl?.replace(this.baseUrl || "", ""),
          method: fetchOptions?.method,
        });
        if (record) {
          const response = toWindowFetchResponse(record);
          if (response) {
            return Promise.resolve(response);
          }
        }
      }

      if (this.cypresspact?.getConfigValue("strictMocking") === true) {
        const error = new Error(
          `Mocking failed in C8yPactFetchClient. No recording found for request "${fullUrl}". Do re-recording or disable Cypress.c8ypact.strictMocking.`
        );
        error.name = "C8yPactError";
        throw error;
      }
    }

    try {
      const response = await super.fetch(url, fetchOptions);
      if (this.cypresspact == null || !isRecordingEnabled) {
        return Promise.resolve(response);
      }

      const result = await this.savePact(response, url, fetchOptions);
      return Promise.resolve(result);
    } catch (failure) {
      if (this.cypresspact == null || !isRecordingEnabled) {
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

  getFetchOptions(options?: IFetchOptions): IFetchOptions {
    const result = super.getFetchOptions(options);

    // for full authentication xsrf token and bearer token are required
    // always add Bearer token if no authorization header is set
    if (!_.get(result, "headers.Authorization")) {
      const bearer =
        this.authOptions?.bearer || getCookieValue("Authorization");
      if (bearer) {
        // xsrf token header is set in CookieAuth
        result.headers = Object.assign(
          { Authorization: `Bearer ${bearer}` },
          result.headers
        );
      }
    }
    return result;
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
        loggedInUser: this.user,
        loggedInUserAlias: this.userAlias,
      }
    );

    return result;
  }
}

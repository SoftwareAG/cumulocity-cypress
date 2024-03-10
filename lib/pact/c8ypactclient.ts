import {
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

const { _ } = Cypress;

export class C8yPactFetchClient extends FetchClient {
  constructor(
    authOrBaseUrl?: IAuthentication | string,
    public baseUrl?: string
  ) {
    super(authOrBaseUrl, baseUrl);
  }

  async fetch(
    url: string,
    fetchOptions?: IFetchOptions
  ): Promise<IFetchResponse> {
    if (Cypress.c8ypact.current && !Cypress.c8ypact.isRecordingEnabled()) {
      const p = Cypress.c8ypact.current as C8yDefaultPact;
      const fullUrl: string = this.getUrl(url, fetchOptions);
      const record = p.getRecordsMatchingRequest({
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

    const savePact = async (response: IFetchResponse) => {
      if (Cypress.c8ypact.isRecordingEnabled()) {
        let responseObj = response.responseObj;
        if (!response.responseObj) {
          const r = await wrapFetchResponse(response, {
            url,
            fetchOptions: this.getFetchOptions(fetchOptions),
          });
          responseObj = r.responseObj;
        } else {
          delete response.responseObj;
        }
        await Cypress.c8ypact.savePact(
          // @ts-ignore
          responseObj,
          {},
          { noqueue: true }
        );
      }
    };

    try {
      const response = await super.fetch(url, fetchOptions);
      await savePact(response);
      return Promise.resolve(response);
    } catch (failure) {
      await savePact(failure as IFetchResponse);
      return Promise.reject(failure);
    }
  }
}

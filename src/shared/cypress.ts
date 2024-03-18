export {};

declare global {
  namespace Cypress {
    export interface Response<T> {
      allRequestResponses: any[];
      body: T;
      duration?: number;
      headers: { [key: string]: string | string[] };
      isOkStatusCode: boolean;
      redirects?: string[];
      redirectedToUrl?: string;
      requestHeaders: { [key: string]: string };
      status: number;
      statusText: string;

      url?: string;
      requestBody?: string | any;
      method?: string;
      $body?: any;
    }

    type RequestBody = string | object;
    type HttpMethod = string;
    type Encodings =
      | "ascii"
      | "base64"
      | "binary"
      | "hex"
      | "latin1"
      | "utf8"
      | "utf-8"
      | "ucs2"
      | "ucs-2"
      | "utf16le"
      | "utf-16le"
      | null;

    export interface Loggable {
      log: boolean;
    }

    export interface Timeoutable {
      timeout: number;
    }

    export interface Failable {
      failOnStatusCode: boolean;
      retryOnStatusCodeFailure: boolean;
      retryOnNetworkFailure: boolean;
    }

    export interface RequestOptions extends Loggable {
      timeout: number;
      failOnStatusCode: boolean;
      auth: object;
      body: RequestBody;
      encoding: Encodings;
      followRedirect: boolean;
      form: boolean;
      gzip: boolean;
      headers: object;
      method: HttpMethod;
      qs: object;
      url: string;
    }
  }
}

import { Client, IAuthentication, ICredentials } from "@c8y/client";

export type C8yClientOptions = Partial<Cypress.Loggable> &
  Partial<Cypress.Timeoutable> &
  Partial<Pick<Cypress.Failable, "failOnStatusCode">> &
  Partial<{
    auth: IAuthentication;
    baseUrl: string;
    client: Client;
    preferBasicAuth: boolean;
    skipClientAuthentication: boolean;
    failOnPactValidation: boolean;
    ignorePact: boolean;
    schema: any;
  }>;

export type C8yAuthentication = IAuthentication;

export interface C8yClient {
  _auth?: C8yAuthentication;
  _options?: C8yClientOptions;
  _client: Client;
}

export interface C8yAuthOptions extends ICredentials {
  // support cy.request properties
  sendImmediately?: boolean;
  bearer?: (() => string) | string;
  userAlias?: string;
  type?: string;
}

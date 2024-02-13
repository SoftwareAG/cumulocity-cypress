import { Client, IAuthentication, ICredentials } from "@c8y/client";

/**
 * Options used to configure c8yclient command.
 */
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

/**
 * Wrapper for Client to pass auth and options without extending Client.
 * Using underscore to avoid name clashes with Client and misunderstandings reading the code.
 */
export interface C8yClient {
  _auth?: C8yAuthentication;
  _options?: C8yClientOptions;
  _client: Client;
}

/**
 * C8yAuthOptions is used to configure the authentication for the cy.c8yclient command. It is
 * an extension of the ICredentials interface from the @c8y/client package adding
 * userAlias and type property.
 */
export interface C8yAuthOptions extends ICredentials {
  // support cy.request properties
  sendImmediately?: boolean;
  bearer?: (() => string) | string;
  userAlias?: string;
  type?: string;
}

export type C8yAuthArgs = string | C8yAuthOptions;

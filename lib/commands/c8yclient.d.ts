import {
  Client,
  IAuthentication,
  IFetchResponse,
  IIdentified,
  IResult,
  IResultList,
} from "@c8y/client";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Create a c8y/client `Client` to interact with Cumulocity API. Yielded
       * results are `Cypress.Response` objects as return by `cy.request`.
       *
       * Authentication can be passed via `cy.getAuth` or `cy.useAuth` for basic
       * auth. If there is a `X-XSRF-TOKEN` cookie, the token will be used for
       * cookie auth without basic auth. To get the cookie token, call `cy.login`
       * before using `cy.c8yclient`.
       *
       * `cy.c8yclient` supports chaining of requests. By chaining the response of
       * one request will be provided as second argument to the next request.
       *
       * Using the `options` argument it is possible to overwrite the default
       * behavior or configure `cy.c8yclient`.
       *
       * @example
       * cy.getAuth("admin")
       *   .c8yclient().then((c) => {
       *     Cypress.env("C8Y_TENANT", c.core.tenant);
       * });
       *
       * cy.c8yclient((c) => c.user.delete(newuser.username), {
       *   failOnStatusCode: false,
       * }).then((deleteResponse) => {
       *   expect(deleteResponse.status).to.be.oneOf([204, 404]);
       * });
       *
       * cy.c8yclient([
       *   (c) =>
       *     c.core.fetch(
       *       "/user/" + c.core.tenant + "/groupByName/" + permission
       *     ),
       *   (c, groupResponse) =>
       *     c.userGroup.addUserToGroup(groupResponse.body.id, userId),
       *   ]);
       * });
       *
       * cy.c8yclient((c) =>
       *   c.core.fetch("/user/" + c.core.tenant + "/groupByName/" + permission)
       * ).c8yclient((c, groupResponse) =>
       *   c.userGroup.addUserToGroup(groupResponse.body.id, userId),
       * );
       */
      c8yclient<T = any, R = any>(
        serviceFn: C8yClientServiceFn<R, T> | C8yClientServiceFn<R, any>[],
        options?: C8yClientOptions
      ): Chainable<Response<T>>;

      c8yclient<T = any, R = any>(
        serviceFn:
          | C8yClientServiceArrayFn<R, T>
          | C8yClientServiceArrayFn<R, any>[],
        options?: C8yClientOptions
      ): Chainable<Response<T>[]>;

      c8yclient<T = any, R = any>(
        serviceFn: C8yClientServiceListFn<R, T>,
        options?: C8yClientOptions
      ): Chainable<Response<T[]>>;

      c8yclient(): Chainable<Client>;
    }

    type C8yOptions = Partial<{
      auth: IAuthentication;
      baseUrl: string;
      client: Client;
      preferBasicAuth: boolean;
      skipClientAuthenication: boolean;
      session: string;
    }>;

    type C8yClientIResult<T> = IResult<T> | IResult<null> | IFetchResponse;

    type C8yClientServiceFn<R, T> = (
      client: Client,
      previousResponse?: Response<R>
    ) => Promise<C8yClientIResult<T>>;

    type C8yClientServiceArrayFn<R, T> = (
      client: Client,
      previousResponse?: Response<R>
    ) => Promise<C8yClientIResult<T>>[];

    type C8yClientServiceListFn<R, T> = (
      client: Client,
      previousResponse?: Response<R>
    ) => Promise<IResultList<T>>;

    export type C8yClientOptions = C8yOptions &
      // Partial<Timeoutable> &
      Partial<Loggable> &
      Partial<Pick<Failable, "failOnStatusCode">>;
  }
}

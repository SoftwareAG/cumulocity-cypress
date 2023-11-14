import {
  Client,
  IAuthentication,
  IFetchResponse,
  IResult,
  IResultList,
} from "@c8y/client";

declare global {
  namespace Cypress {
    interface Cypress {
      c8ypact: C8yPact;
    }
 
    interface Chainable {
      /**
       * Create a c8y/client `Client` to interact with Cumulocity API. Yielded
       * results are `Cypress.Response` objects as returned by `cy.request`.
       *
       * `cy.c8yclient` supports c8y/client `BasicAuth` and `CookieAuth`. To use
       * any other auth method, such as `BearerAuth`, create a custom `Client` and
       * pass it in `options`.
       *
       * Note: If there is a `X-XSRF-TOKEN` cookie, `CookieAuth` will be used as
       * auth method and basic auth credentials will be ignored. To create the
       * cookie token, call `cy.login` before using `cy.c8yclient`. To force using
       * basic auth method, pass credentials via `cy.getAuth().c8yclient()` or use
       * `preferBasicAuth` option.
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

    interface SuiteConfigOverrides {
      c8ypact: string;
    }

    interface TestConfigOverrides {
      c8ypact: string;
    }

    interface RuntimeConfigOptions {
      c8ypact: string;
    }
  }

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

  type C8yClientOptions = Partial<C8yOptions> &
    // Partial<Timeoutable> &
    Partial<Cypress.Loggable> &
    Partial<Pick<Cypress.Failable, "failOnStatusCode">>;

  interface C8yOptions {
    auth: IAuthentication;
    baseUrl: string;
    client: Client;
    preferBasicAuth: boolean;
    skipClientAuthenication: boolean;
  }

  interface C8yPact {
    matcher: C8yPactMatcher;
    currentPactIdentifier: () => string;
    currentPactFilename: () => string;
    currentNextPact: <T = any>() => Cypress.Chainable<Cypress.Response<T>>;
    currentPacts: () => Cypress.Chainable<Cypress.Response<any>[]>;
    isRecordingEnabled: () => boolean;
  }

  interface C8yPactMatcher {
    match: (obj1: unknown, obj2: unknown) => boolean;
  }
}

export {};

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Retry a request for a given number of max retries and delay. When test function
       * `testFn` returns `true` stop retrying and continue.
       *
       * Use `retries` to pass number of retries and `retryDelay` to pass delay in milliseconds.
       *
       * @example
       *  cy.retryRequest(
       *    {
       *      method: "GET",
       *      url: "/service/apama-oeeapp/mon/ping",
       *      retries: Cypress.env("livenessRetries") || 5,
       *      retryDelay: Cypress.env("livenessRetryTimeout") || 10000,
       *    },
       *    (response) => {
       *      return response.status === 200;
       *    }
       *  );
       */
      retryRequest<T = any>(
        options: Partial<Cypress.RequestOptions> & RetryOptions,
        testFn: (response: any) => boolean
      ): Chainable<Response<T>>;
    }
  }

  type RetryOptions = { retries: number; retryDelay: number };
}

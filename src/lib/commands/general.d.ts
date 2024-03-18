export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Disables the Cumulocity cookie banner. Run before visit.
       */
      hideCookieBanner(): Chainable<void>;

      /**
       * Sets the language in user preferences.
       *
       * @param {C8yLanguage} lang - the language to be enabled in user preferences
       */
      setLanguage(lang: C8yLanguage): Chainable<void>;

      /**
       * Visits a given page and waits for a selector to become visible.
       *
       * @example
       * cy.visitAndWaitToFinishLoading('/');
       * cy.visitAndWaitToFinishLoading('/', 'en', '[data-cy=myelement]');
       *
       * @param {string} url - the page to be visited
       * @param {string} selector - the selector to wait  to become visible. Defaults to `c8y-navigator-outlet c8y-app-icon`.
       * @param {number} timeout - the timeout in milliseconds to wait for the selector to become visible. Defaults to `60000`.
       */
      visitAndWaitForSelector(
        url: string,
        language?: C8yLanguage,
        selector?: string,
        timeout?: number
      ): Chainable<void>;

      /**
       * Disables Gainsight by intercepting tenant options and configuring
       * `gainsightEnabled: false` for `customProperties`.
       *
       * ```
       * {
       *   customProperties: {
       *     ...
       *     gainsightEnabled: false,
       *   }
       * }
       * ```
       */
      disableGainsight(): Chainable<void>;
    }
  }

  export type C8yLanguage = "de" | "en";
}

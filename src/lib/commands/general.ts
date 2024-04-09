const { _ } = Cypress;

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
      visitAndWaitForSelector(options: C8yVisitOptions): Chainable<void>;

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

  export type C8yVisitOptions = {
    language?: C8yLanguage;
    selector?: string;
    timeout?: number;
    url?: string;
    shellTarget?: string;
    shellExtension?: string;
  };

  export type C8yLanguage = "de" | "en";
}

Cypress.Commands.add("hideCookieBanner", () => {
  const COOKIE_NAME = "acceptCookieNotice";
  const COOKIE_VALUE = '{"required":true,"functional":true}';

  Cypress.on("window:before:load", (window) => {
    window.localStorage.setItem(COOKIE_NAME, COOKIE_VALUE);
  });
  window.localStorage.setItem(COOKIE_NAME, COOKIE_VALUE);

  Cypress.log({
    name: "hideCookieBanner",
    message: "",
  });
});

Cypress.Commands.add(
  "visitAndWaitForSelector",
  (
    _url: string | C8yVisitOptions,
    _language = "en",
    _selector = "c8y-navigator-outlet c8y-app-icon",
    _timeout: number = Cypress.config().pageLoadTimeout || 60000
  ) => {
    let url = _.isString(_url) ? _url : _url?.url || "";
    const options: C8yVisitOptions = _.isObjectLike(_url)
      ? (_url as C8yVisitOptions)
      : {};
    const shellTarget: string =
      options?.shellTarget || Cypress.env("C8Y_SHELL_TARGET");
    if (shellTarget && _.isString(shellTarget)) {
      url = `/apps/${shellTarget}/index.html#/${url}`;
    }

    const shellExtension: string =
      options?.shellExtension || Cypress.env("C8Y_SHELL_EXTENSION");

    const language = options?.language || _language;
    const selector = options?.selector || _selector;
    const timeout = options?.timeout || _timeout;

    const consoleProps = {
      url,
      language,
      selector,
      timeout,
      shellTarget,
      shellExtension,
      options,
    };

    Cypress.log({
      name: "visitShellAndWaitForSelector",
      message: url,
      consoleProps: () => consoleProps,
    });
    cy.setLanguage(language);

    if (shellExtension) {
      const qs = { remotes: shellExtension };
      cy.visit(`${url}`, { qs });
    } else {
      cy.visit(url);
    }

    cy.get(selector, { timeout }).should("be.visible");
  }
);

Cypress.Commands.add("setLanguage", (lang: string) => {
  globalThis.setLocale(lang);

  Cypress.log({
    name: "setLanguage",
    message: lang,
  });
  cy.intercept(
    {
      method: "GET",
      url: "/inventory/managedObjects?fragmentType=language*",
    },
    (req) => {
      req.continue((res) => {
        const languageFragment = req.query.fragmentType.toString();
        if (res.body[languageFragment]) {
          res.body[languageFragment] = lang;
        } else if (
          res.body.managedObjects &&
          _.isArrayLike(res.body.managedObjects)
        ) {
          res.body.managedObjects.forEach((mo: any) => {
            if (mo[languageFragment]) {
              mo[languageFragment] = lang;
            }
          });
        }
        res.send();
      });
    }
  );

  window.localStorage.setItem("c8y_language", lang);
  Cypress.on("window:before:load", (window) => {
    window.localStorage.setItem("c8y_language", lang);
  });
});

Cypress.Commands.add("disableGainsight", () => {
  Cypress.log({
    name: "disableGainsight",
  });

  cy.intercept("/tenant/system/options/gainsight/api.key*", (req) => {
    req.reply({ statusCode: 404, body: {} });
    throw new Error(
      "Intercepted Gainsight API key call, but Gainsight should have been disabled. Failing..."
    );
  }).as("GainsightAPIKey");

  cy.intercept("/tenant/currentTenant*", (req) => {
    req.continue((res) => {
      const customProperties: any = res.body.customProperties || {};
      customProperties.gainsightEnabled = false;
      res.body.customProperties = customProperties;
      res.send();
    });
  });
});

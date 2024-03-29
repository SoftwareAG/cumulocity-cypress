const { _ } = Cypress;

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
    consoleProps: () => {},
  });
});

Cypress.Commands.add(
  "visitAndWaitForSelector",
  (
    url,
    language = "en",
    selector = "c8y-navigator-outlet c8y-app-icon",
    timeout = Cypress.config().pageLoadTimeout || 60000
  ) => {
    const consoleProps = {
      url,
      language,
      selector,
      timeout,
    };
    Cypress.log({
      name: "visitAndWaitForSelector",
      message: url,
      consoleProps: () => consoleProps,
    });
    cy.setLanguage(language);
    cy.visit(url);
    cy.get(selector, { timeout }).should("be.visible");
  }
);

Cypress.Commands.add("setLanguage", (lang) => {
  setLocale(lang);

  Cypress.log({
    name: "setLanguage",
    message: lang,
    consoleProps: () => {},
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
          res.body.managedObjects.forEach((mo) => {
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
    consoleProps: () => {},
  });

  cy.intercept("/tenant/system/options/gainsight/api.key*", (req) => {
    req.reply({ statusCode: 404, body: {} });
    throw new Error(
      "Intercepted Gainsight API key call, but Gainsight should have been disabled. Failing..."
    );
  }).as("GainsightAPIKey");

  cy.intercept("/tenant/currentTenant*", (req) => {
    req.continue((res) => {
      let customProperties = res.body.customProperties || {};
      customProperties.gainsightEnabled = false;
      res.body.customProperties = customProperties;
      res.send();
    });
  });
});

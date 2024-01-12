import { url } from "../support/util";
const { $, _ } = Cypress;

describe("general", () => {
  context("disableGainsight", () => {
    it("current tenant returns gainsightEnabled false", () => {
      cy.disableGainsight()
        .as("interception")
        .then(() => {
          return $.get(url(`/tenant/currentTenant`));
        })
        .then((response) => {
          expect(response.customProperties.gainsightEnabled).to.eq(false);
        })
        .wait("@interception");
    });

    it("gainsight api.key request will throw exception", (done) => {
      Cypress.once("fail", (err) => {
        expect(err.message).to.eq(
          "Intercepted Gainsight API key call, but Gainsight should have been disabled. Failing..."
        );
        done();
      });

      cy.disableGainsight()
        .as("interception")
        .then(() => {
          $.get(url(`/tenant/system/options/gainsight/api.key`));
        });
    });
  });

  context("hideCookieBanner", () => {
    it("hideCookieBanner should update localStorage cookie value", () => {
      cy.window().then((win) => {
        const cookie = win.localStorage.getItem("acceptCookieNotice");
        expect(cookie).to.be.null;
      });

      cy.hideCookieBanner();

      cy.window().then((win) => {
        const cookie = JSON.parse(
          win.localStorage.getItem("acceptCookieNotice")
        );
        expect(cookie).to.deep.eq({ required: true, functional: true });
      });
    });
  });

  context("setLanguage", () => {
    it("should call setLocale to init language ", () => {
      const language = "en"; // replace with the language you want to test
      const setLanguageStub = cy.stub(global, "setLocale");
      cy.setLanguage(language).then(() => {
        expect(setLanguageStub).to.be.calledWith(language);
      });
    });

    it("should update localStorage to set c8y_language", () => {
      const language = "en"; // replace with the language you want to test
      cy.window().then((win) => {
        const lang = win.localStorage.getItem("c8y_language");
        expect(lang).to.be.null;
      });

      cy.setLanguage(language).then(() => {
        expect(window.localStorage.getItem("c8y_language")).to.eq(language);
        cy.window().then((win) => {
          const lang = win.localStorage.getItem("c8y_language");
          expect(lang).to.deep.eq(language);
        });
      });
    });

    it("should intercept inventory request and update language key", () => {
      cy.setLanguage("de")
        .as("interception")
        .then(() => {
          return $.get(
            url(`/inventory/managedObjects?fragmentType=languageXYZ`)
          );
        })
        .then((response) => {
          expect(response.managedObjects[0].languageXYZ).to.eq("de");
        })
        .wait("@interception");
    });
  });
});

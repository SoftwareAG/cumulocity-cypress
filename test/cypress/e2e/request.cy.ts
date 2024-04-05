import {
  expectHttpRequest,
  stubResponse,
  stubResponses,
  initRequestStub,
  url as _url,
} from "../support/testutils";
const { _, Promise } = Cypress;

describe("request", () => {
  beforeEach(() => {
    initRequestStub();
    stubResponse({
      isOkStatusCode: true,
      status: 201,
      body: undefined,
    });

    Cypress.env("C8Y_USERNAME", undefined);
    Cypress.env("C8Y_PASSWORD", undefined);
  });

  context("auth from environment", () => {
    it("use auth from env variables", () => {
      Cypress.env("C8Y_USERNAME", "admin");
      Cypress.env("C8Y_PASSWORD", "password");

      cy.request("/my/test/request").then(() => {
        expectHttpRequest({
          url: _url(`/my/test/request`),
          method: "GET",
          auth: { user: "admin", password: "password" },
          body: undefined,
        });
      });
    });

    it("do not override auth in request", () => {
      Cypress.env("C8Y_USERNAME", "admin");
      Cypress.env("C8Y_PASSWORD", "password");

      cy.request({
        method: "POST",
        url: "/my/test/request",
        auth: { user: "myadmin", password: "mypassword" },
      }).then(() => {
        expectHttpRequest({
          url: _url(`/my/test/request`),
          method: "POST",
          auth: { user: "myadmin", password: "mypassword" },
          body: undefined,
        });
      });
    });
  });

  context("auth from useAuth()", () => {
    it("use auth configured with useAuth command", () => {
      cy.useAuth({ user: "admin", password: "password" });

      cy.request("/my/test/request").then(() => {
        expectHttpRequest({
          url: _url(`/my/test/request`),
          method: "GET",
          auth: { user: "admin", password: "password" },
          body: undefined,
        });
      });
    });

    it("do not override auth in request", () => {
      cy.useAuth({ user: "admin", password: "password" });

      cy.request({
        method: "POST",
        url: "/my/test/request",
        auth: { user: "myadmin", password: "mypassword" },
      }).then(() => {
        expectHttpRequest({
          url: _url(`/my/test/request`),
          method: "POST",
          auth: { user: "myadmin", password: "mypassword" },
          body: undefined,
        });
      });
    });
  });

  context("auth from test config overrides", () => {
    it(
      "use auth from config overrides",
      { auth: { user: "myadmin", password: "mypassword" } },
      () => {
        cy.request({
          method: "POST",
          url: "/my/test/request",
          auth: { user: "myadmin", password: "mypassword" },
        }).then(() => {
          expectHttpRequest({
            url: _url(`/my/test/request`),
            method: "POST",
            auth: { user: "myadmin", password: "mypassword" },
            body: undefined,
          });
        });
      }
    );

    it(
      "do not override auth in request",
      { auth: { user: "admin", password: "password" } },
      () => {
        cy.request({
          method: "POST",
          url: "/my/test/request",
          auth: { user: "myadmin", password: "mypassword" },
        }).then(() => {
          expectHttpRequest({
            url: _url(`/my/test/request`),
            method: "POST",
            auth: { user: "myadmin", password: "mypassword" },
            body: undefined,
          });
        });
      }
    );
  });

  context("request command overwrite", () => {
    // @ts-expect-error
    const orgRequestFn = Cypress.cy["request"];

    beforeEach(() => {
      // @ts-expect-error
      Cypress.cy["request"] = _.cloneDeep(orgRequestFn);
    });

    it("overwritten request uses auth from env variables", () => {
      Cypress.Commands.overwrite("request", (originalFn, ...args) => {
        // assume its called with options as a single argument
        const options = args[0];
        // set custom timeout to verify overwritten request is used
        options.timeout = 100077;
        return originalFn(options);
      });

      Cypress.env("C8Y_USERNAME", "admin2");
      Cypress.env("C8Y_PASSWORD", "password2");

      cy.request({
        method: "POST",
        url: "/my/test/request",
      }).then(() => {
        expectHttpRequest({
          url: _url(`/my/test/request`),
          method: "POST",
          auth: { user: "admin2", password: "password2" },
          body: undefined,
          timeout: 100077,
        });
      });
    });

    it(
      "overwritten requests uses auth from config overrides",
      { auth: { user: "admin", password: "password" } },
      () => {
        Cypress.Commands.overwrite("request", (originalFn, ...args) => {
          // assume its called with options as a single argument
          const options = args[0];
          // set custom timeout to verify overwritten request is used
          options.timeout = 100099;
          return originalFn(options);
        });

        cy.request({
          method: "POST",
          url: "/my/test/request",
        }).then(() => {
          expectHttpRequest({
            url: _url(`/my/test/request`),
            method: "POST",
            auth: { user: "admin", password: "password" },
            body: undefined,
            timeout: 100099,
          });
        });
      }
    );

    it("overwritten request uses auth from useAuth()", () => {
      Cypress.Commands.overwrite("request", (originalFn, ...args) => {
        // assume its called with options as a single argument
        const options = args[0];
        // set custom timeout to verify overwritten request is used
        options.timeout = 100088;
        return originalFn(options);
      });

      cy.useAuth({ user: "admin", password: "password" });

      cy.request({
        method: "POST",
        url: "/my/test/request",
      }).then(() => {
        expectHttpRequest({
          url: _url(`/my/test/request`),
          method: "POST",
          auth: { user: "admin", password: "password" },
          body: undefined,
          timeout: 100088,
        });
      });
    });
  });

  context("retryRequest", () => {
    let lastLog: any;
    let delaySpy: Cypress.Agent<sinon.SinonSpy<any[], any>>;

    beforeEach(() => {
      delaySpy = cy.spy(Promise, "delay");

      cy.on("log:added", (attrs, log) => {
        if (attrs.name === "request") {
          lastLog = log;
        }
      });
    });

    it("should retry requests", () => {
      Cypress.env("C8Y_USERNAME", "admin");
      Cypress.env("C8Y_PASSWORD", "password");

      stubResponses([
        {
          isOkStatusCode: false,
          status: 400,
          body: undefined,
        },
        {
          isOkStatusCode: false,
          status: 400,
          body: undefined,
        },
        {
          isOkStatusCode: true,
          status: 200,
          body: undefined,
        },
      ]);

      cy.retryRequest(
        {
          method: "POST",
          url: "/my/test/request",
          retryDelay: 1000,
          retries: 2,
        },
        (response) => {
          return response.status === 200;
        }
      ).then((response) => {
        expect(delaySpy).to.be.calledWith(1000, "wait");
        expect(delaySpy).to.be.callCount(2);

        expectHttpRequest(
          Array(3).fill({
            url: _url(`/my/test/request`),
            method: "POST",
            auth: { user: "admin", password: "password" },
            body: undefined,
          })
        );
        expect(response).to.not.be.undefined;
        expect(response.status).to.eq(200);
        expect(response.isOkStatusCode).to.eq(true);
      });
    });

    it("should fail when retry requests exceeds max - failOnStatusCode true", (done) => {
      Cypress.env("C8Y_USERNAME", "admin");
      Cypress.env("C8Y_PASSWORD", "password");

      stubResponses(
        Array(3).fill({
          isOkStatusCode: false,
          status: 400,
          body: undefined,
        })
      );

      Cypress.on("fail", (error) => {
        expect(delaySpy).to.be.calledWith(555, "wait");
        expect(delaySpy).to.be.callCount(2);

        expectHttpRequest(
          Array(3).fill({
            url: _url(`/my/test/request`),
            method: "POST",
            auth: { user: "admin", password: "password" },
            body: undefined,
          })
        );

        expect(lastLog.get("error")).to.eq(error);
        expect(lastLog.get("state")).to.eq("failed");

        done();
      });

      cy.retryRequest(
        {
          method: "POST",
          url: "/my/test/request",
          failOnStatusCode: true,
          retryDelay: 555,
          retries: 2,
        },
        (response) => {
          return response.status === 200;
        }
      );
    });

    it("should fail when retry requests exceeds max - failOnStatusCode false", () => {
      Cypress.env("C8Y_USERNAME", "admin");
      Cypress.env("C8Y_PASSWORD", "password");

      stubResponses(
        Array(3).fill({
          isOkStatusCode: false,
          status: 400,
          body: undefined,
        })
      );

      cy.retryRequest(
        {
          method: "POST",
          url: "/my/test/request",
          failOnStatusCode: false,
          retryDelay: 222,
          retries: 2,
        },
        (response) => {
          return response.status === 200;
        }
      ).then((response) => {
        expect(delaySpy).to.be.calledWith(222, "wait");
        expect(delaySpy).to.be.callCount(2);

        expectHttpRequest(
          Array(3).fill({
            url: _url(`/my/test/request`),
            method: "POST",
            auth: { user: "admin", password: "password" },
            body: undefined,
          })
        );

        expect(response).to.not.be.undefined;
        expect(response.status).to.eq(400);
        expect(response.isOkStatusCode).to.eq(false);
      });
    });
  });
});

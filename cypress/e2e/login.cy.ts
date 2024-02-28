import { IDeviceCredentials } from "@c8y/client";
import {
  expectHttpRequest,
  stubResponse,
  initRequestStub,
  url as _url,
} from "../support/util";

const { _, $ } = Cypress;

describe("login", () => {
  let url: string;

  beforeEach(() => {
    Cypress.session.clearAllSavedSessions();
    initRequestStub();

    Cypress.env("C8Y_TENANT", "t702341987");
    url = _url(`/tenant/oauth?tenant_id=t702341987`);

    const headers = new Headers();
    headers.append(
      "set-cookie",
      "authorization=eyJhbGciOiJ; path=/; domain=localhost; HttpOnly"
    );
    headers.append(
      "set-cookie",
      "XSRF-TOKEN=pQWAHZQfhLRcDVqVsCjV; Path=/; Domain=localhost; Secure"
    );
    stubResponse({
      isOkStatusCode: true,
      status: 200,
      headers,
      body: undefined,
    });
  });

  context("without cy.session", () => {
    it("login with user and password", () => {
      let validationCalled = false;
      cy.login("user", "password", {
        useSession: false,
        disableGainsight: false,
        hideCookieBanner: false,
        validationFn: cy.stub(() => {
          validationCalled = true;
        }),
      }).then((auth) => {
        expect(auth).to.not.be.undefined;
        expect(auth.user).to.eq("user");
        expect(auth.password).to.eq("password");

        expect(validationCalled).to.be.true;
        expect(Cypress.env("C8Y_LOGGED_IN_USER")).to.eq("user");

        expectHttpRequest({
          url,
          method: "POST",
          body: {
            grant_type: "PASSWORD",
            username: "user",
            password: "password",
            tfa_code: undefined,
          },
          form: true,
        });
      });
    });

    it("login with test annotation", { auth: "testadmin" }, () => {
      Cypress.env("testadmin_username", "testuser");
      Cypress.env("testadmin_password", "testpasswd");

      cy.getAuth()
        .login({
          useSession: false,
          validationFn: cy.stub(() => {}),
        })
        .then((auth) => {
          expect(auth.user).to.eq("testuser");
          expect(auth.password).to.eq("testpasswd");
          expect(Cypress.env("C8Y_LOGGED_IN_USER")).to.eq("testuser");
        });
    });

    it("login reset c8yclient", () => {
      cy.getAuth({
        user: "admin",
        password: "mypassword",
        tenant: "t12345678",
      })
        .c8yclient()
        .then((client) => {
          expect(client).to.not.be.undefined;
          // @ts-ignore
          expect(cy.state("ccs.client")).to.not.be.undefined;
        });

      let validationCalled = false;
      cy.login("user", "password", {
        useSession: false,
        hideCookieBanner: false,
        disableGainsight: false,
        validationFn: cy.stub(() => {
          validationCalled = true;
        }),
      }).then(() => {
        expectHttpRequest({ url });
        expect(validationCalled).to.be.true;
        expect(Cypress.env("C8Y_LOGGED_IN_USER")).to.eq("user");
        // @ts-ignore
        expect(cy.state("ccs.client")).to.be.undefined;
      });
    });

    it("login with subject from cypress chain", () => {
      let validationCalled = false;
      cy.getAuth("x", "y")
        .login({
          useSession: false,
          hideCookieBanner: false,
          disableGainsight: false,
          validationFn: cy.stub(() => {
            validationCalled = true;
          }),
        })
        .then(() => {
          expectHttpRequest({
            url,
            method: "POST",
            body: {
              grant_type: "PASSWORD",
              username: "x",
              password: "y",
              tfa_code: undefined,
            },
            form: true,
          });
          expect(Cypress.env("C8Y_LOGGED_IN_USER")).to.eq("x");
          expect(validationCalled).to.be.true;
        });
    });
  });

  context("use cy.session", () => {
    it("login set cookies in session", () => {
      cy.login({
        user: "pvtuser",
        password: "pvtpassword",
        tenant: "t702341987",
      }).then((auth) => {
        Cypress.session.getCurrentSessionData().then((sessionData) => {
          expect(sessionData.cookies).to.have.length(2);
          expect(sessionData.cookies[0].name).to.eq("authorization");
          expect(sessionData.cookies[0].value).to.eq("eyJhbGciOiJ");
          expect(sessionData.cookies[1].name).to.eq("XSRF-TOKEN");
          expect(sessionData.cookies[1].value).to.eq("pQWAHZQfhLRcDVqVsCjV");
        });

        cy.getCookies().then((cookies) => {
          expect(cookies).to.have.length(2);
          expect(cookies[0].name).to.eq("authorization");
          expect(cookies[0].value).to.eq("eyJhbGciOiJ");
          expect(cookies[1].name).to.eq("XSRF-TOKEN");
          expect(cookies[1].value).to.eq("pQWAHZQfhLRcDVqVsCjV");
        });

        expect(auth).to.not.be.undefined;
        expect(auth.user).to.eq("pvtuser");
        expect(auth.password).to.eq("pvtpassword");
        expect(Cypress.env("C8Y_LOGGED_IN_USER")).to.eq("pvtuser");
      });
    });

    it("hideCookieBanner", () => {
      cy.login(
        {
          user: "pvtuser",
          password: "pvtpassword",
          tenant: "t702341987",
        },
        {
          hideCookieBanner: true,
        }
      ).then(() => {
        cy.window().then((win) => {
          const cookie = JSON.parse(
            win.localStorage.getItem("acceptCookieNotice")
          );
          expect(cookie).to.deep.eq({ required: true, functional: true });
        });
      });
    });

    it("gainsight is disabled", (done) => {
      cy.login(
        {
          user: "pvtuser",
          password: "pvtpassword",
          tenant: "t702341987",
        },
        {
          disableGainsight: true,
        }
      ).then(() => {
        Cypress.once("fail", (err) => {
          expect(err.message).to.eq(
            "Intercepted Gainsight API key call, but Gainsight should have been disabled. Failing..."
          );
          done();
        });

        cy.then(() => {
          $.get(_url(`/tenant/system/options/gainsight/api.key`));
        });
      });
    });
  });

  context("getAuth", () => {
    beforeEach(() => {
      Cypress.env("myauthuser_password", "myadminpassword");
      Cypress.env("C8Y_TENANT", "t1234567");
    });

    it("always returns wrapped auth options", () => {
      const auth = cy.getAuth("admin", "password");
      expect(Cypress.isCy(auth)).to.be.true;
      expect(Cypress.isCy(auth.getAuth())).to.be.true;

      auth.getAuth().then((result) => {
        expect(result.user).to.eq("admin");
        expect(result.password).to.eq("password");
        expect(result.tenant).to.eq("t1234567");
      });

      cy.wrap({ user: "admin", password: "password" })
        .getAuth()
        .then((result) => {
          expect(result.user).to.eq("admin");
          expect(result.password).to.eq("password");
          expect(result.tenant).to.eq("t1234567");
        });
    });

    it("accepts chained input from prev subject", () => {
      cy.wrap(["user", "password"])
        .getAuth()
        .then((result) => {
          expect(result.user).to.eq("user");
          expect(result.password).to.eq("password");
          expect(result.tenant).to.eq("t1234567");
        });
      cy.wrap({ user: "admin", password: "other" })
        .getAuth()
        .then((result) => {
          expect(result.user).to.eq("admin");
          expect(result.password).to.eq("other");
          expect(result.tenant).to.eq("t1234567");
        });
      Cypress.env("admin_password", "password");
      cy.wrap("admin")
        .getAuth()
        .then((result) => {
          expect(result.user).to.eq("admin");
          expect(result.password).to.eq("password");
          expect(result.tenant).to.eq("t1234567");
        });
    });

    it("should not overwrite tenant", () => {
      cy.wrap({ user: "admin", password: "password", tenant: "t7654321" })
        .getAuth()
        .then((result) => {
          expect(result.user).to.eq("admin");
          expect(result.password).to.eq("password");
          expect(result.tenant).to.eq("t7654321");
        });
    });

    it("should filter additional keys", () => {
      cy.wrap({
        user: "admin",
        password: "password",
        tenant: "t7654321",
        test: "test",
        x: "y",
      })
        .getAuth()
        .then((result) => {
          expect(result.user).to.eq("admin");
          expect(result.password).to.eq("password");
          expect(result.tenant).to.eq("t7654321");
          expect(Object.keys(result)).to.have.length(3);
          expect(
            _.isEqual(
              Object.keys(result).sort(),
              ["user", "password", "tenant"].sort()
            )
          ).to.be.true;
        });
    });

    it("should work without tenant environment variable", () => {
      Cypress.env("C8Y_TENANT", undefined);
      cy.wrap({ user: "admin", password: "password" })
        .getAuth()
        .then((result) => {
          expect(result.user).to.eq("admin");
          expect(result.password).to.eq("password");
          expect(result.tenant).to.be.undefined;
        });
    });

    it(
      "gets auth from test options",
      { auth: { user: "myadmin", password: "mypassword" } },
      () => {
        cy.getAuth().then((result) => {
          expect(result.user).to.eq("myadmin");
          expect(result.password).to.eq("mypassword");
          expect(result.tenant).to.eq("t1234567");
        });
      }
    );

    it(
      "gets auth from test options with password from environment",
      { auth: "myauthuser" },
      () => {
        cy.getAuth().then((result) => {
          expect(result.user).to.eq("myauthuser");
          expect(result.password).to.eq("myadminpassword");
          expect(result.tenant).to.eq("t1234567");
        });
      }
    );
    it("should get auth options from IDeviceCredentials with username key", () => {
      const dc: IDeviceCredentials = {
        username: "myusername",
        password: "mypassword",
        id: "123",
        self: "https://localhost",
        tenantId: "t1234567890",
      };
      cy.getAuth(dc).then((result) => {
        expect(result.user).to.eq("myusername");
        expect(result.password).to.eq("mypassword");
        expect(result.tenant).to.eq("t1234567890");
        expect(Object.keys(result)).to.have.length(3);
        expect(
          _.isEqual(
            Object.keys(result).sort(),
            ["user", "password", "tenant"].sort()
          )
        ).to.be.true;
      });
    });

    it("should throw if no auth options found", (done) => {
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("No valid C8yAuthOptions found");
        done();
      });

      cy.getAuth();
    });
  });

  context("useAuth", () => {
    beforeEach(() => {
      Cypress.env("C8Y_TENANT", "t1234567");
    });

    it("store and restore auth in current test context", () => {
      cy.useAuth("admin", "password");

      cy.getAuth().then((result) => {
        expect(result.user).to.eq("admin");
        expect(result.password).to.eq("password");
        expect(result.tenant).to.eq("t1234567");
      });
    });

    it("store and restore auth with tenant", () => {
      cy.useAuth({
        user: "admin",
        password: "password",
        tenant: "t7654321",
      });

      cy.getAuth().then((result) => {
        expect(result.user).to.eq("admin");
        expect(result.password).to.eq("password");
        expect(result.tenant).to.eq("t7654321");
      });
    });

    it("should allow to overwrite auth", () => {
      cy.useAuth({
        user: "admin",
        password: "password",
        tenant: "t7654321",
      });

      cy.useAuth({
        user: "admin2",
        password: "password2",
        tenant: "t76543210",
      });

      cy.getAuth().then((result) => {
        expect(result.user).to.eq("admin2");
        expect(result.password).to.eq("password2");
        expect(result.tenant).to.eq("t76543210");
      });
    });

    it(
      "should allow to overwrite auth from annotation",
      { auth: "myauthuser" },
      () => {
        cy.getAuth().then((result) => {
          expect(result.user).to.eq("myauthuser");
          expect(result.password).to.eq("myadminpassword");
          expect(result.tenant).to.eq("t1234567");
        });

        cy.useAuth({
          user: "admin2",
          password: "password2",
          tenant: "t76543210",
        });

        cy.getAuth().then((result) => {
          expect(result.user).to.eq("admin2");
          expect(result.password).to.eq("password2");
          expect(result.tenant).to.eq("t76543210");
        });
      }
    );

    it(
      "should use previousSubject instead of annotation",
      { auth: "myauthuser" },
      () => {
        cy.getAuth().then((result) => {
          expect(result.user).to.eq("myauthuser");
          expect(result.password).to.eq("myadminpassword");
          expect(result.tenant).to.eq("t1234567");
        });

        cy.getAuth({ user: "test", password: "test" }).useAuth();

        cy.getAuth().then((result) => {
          expect(result.user).to.eq("test");
          expect(result.password).to.eq("test");
        });
      }
    );

    it("should throw if no auth options found", (done) => {
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("No valid C8yAuthOptions found");
        done();
      });

      cy.useAuth("userthatdoesnotexist");
    });

    it("should throw for undefined object", (done) => {
      Cypress.once("fail", (err) => {
        expect(err.message).to.contain("No valid C8yAuthOptions found");
        done();
      });

      cy.useAuth(undefined);
    });
  });
});

import { IDeviceCredentials } from "@c8y/client";
import {
  expectHttpRequest,
  stubResponse,
  initRequestStub,
  url as _url,
} from "../support/util";
const { _ } = Cypress;

describe("login", () => {
  context("without cy.session", () => {
    let url: string;

    beforeEach(() => {
      Cypress.session.clearAllSavedSessions();
      initRequestStub();

      Cypress.env("C8Y_TENANT", "t702341987");
      url = _url(`/tenant/oauth?tenant_id=t702341987`);

      stubResponse({
        isOkStatusCode: true,
        status: 200,
        // seems not to work
        headers: {
          "Set-Cookie":
            "authorization=eyJhbGciOiJ; Path=/; Domain=localhost; HttpOnly",
        },
        body: undefined,
      });
    });

    it("login with user and password", () => {
      let validationCalled = false;
      cy.login("user", "password", {
        useSession: false,
        validationFn: cy.stub(() => {
          validationCalled = true;
        }),
      }).then((auth) => {
        expect(auth).to.not.be.undefined;
        expect(auth.user).to.eq("user");
        expect(auth.password).to.eq("password");

        expect(validationCalled).to.be.true;
        expect(Cypress.env("C8Y_LOGGED_IN_USER")).to.eq("user");

        const options = expectHttpRequest({
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
        // cy.log(JSON.stringify(options));
        // const sessionData = await Cypress.session.getCurrentSessionData();
        // cy.log(JSON.stringify(sessionData));
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
    let url: string;

    beforeEach(() => {
      Cypress.session.clearAllSavedSessions();
      initRequestStub();

      Cypress.env("C8Y_TENANT", "t702341987");
      url = _url(`/tenant/oauth?tenant_id=t702341987`);

      stubResponse({
        isOkStatusCode: true,
        status: 200,
        // seems not to work
        headers: {
          "Set-Cookie":
            "authorization=eyJhbGciOiJ; Path=/; Domain=localhost; HttpOnly",
        },
        body: undefined,
      });
    });

    it.skip("login with user and password", () => {
      cy.login({
        user: "pvtuser",
        password: "pvtpassword",
        tenant: "t702341987",
      }).then((auth) => {
        expect(auth).to.not.be.undefined;
        expect(auth.user).to.eq("user");
        expect(auth.password).to.eq("password");
        expect(Cypress.env("C8Y_LOGGED_IN_USER")).to.eq("pvtuser");
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

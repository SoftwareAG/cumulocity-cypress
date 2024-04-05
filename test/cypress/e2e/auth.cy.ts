import { IDeviceCredentials } from "@c8y/client";
import { url as _url } from "../support/testutils";

const { _, $ } = Cypress;

describe("auth", () => {
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

    it("should not overwrite tenant from env", () => {
      cy.wrap({ user: "admin", password: "password", tenant: "t7654321" })
        .getAuth()
        .then((result) => {
          expect(result.user).to.eq("admin");
          expect(result.password).to.eq("password");
          expect(result.tenant).to.eq("t7654321");
        });
    });

    it("should use userAlias from options if available", () => {
      cy.wrap({ userAlias: "myauthuser", type: "CookieAuth" })
        .getAuth()
        .then((result) => {
          expect(result.user).to.eq("myauthuser");
          expect(result.password).to.eq("myadminpassword");
          expect(result.tenant).to.eq("t1234567");
          expect(result.userAlias).to.eq("myauthuser");
          expect(result.type).to.eq("CookieAuth");
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
      "gets auth from test annotation",
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
      "gets auth from test annotation with password from environment",
      { auth: "myauthuser" },
      () => {
        cy.getAuth().then((result) => {
          expect(result.user).to.eq("myauthuser");
          expect(result.password).to.eq("myadminpassword");
          expect(result.tenant).to.eq("t1234567");
          expect(result.userAlias).to.eq("myauthuser");
        });
      }
    );

    it(
      "gets auth from test annotation with userAlias and type",
      { auth: { userAlias: "myauthuser", type: "CookieAuth" } },
      () => {
        cy.getAuth().then((result) => {
          expect(result.user).to.eq("myauthuser");
          expect(result.password).to.eq("myadminpassword");
          expect(result.tenant).to.eq("t1234567");
          expect(result.userAlias).to.eq("myauthuser");
          expect(result.type).to.eq("CookieAuth");
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

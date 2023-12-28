import { normalizedArguments, getAuthOptions } from "../../../lib/commands/utils";

describe("utils", () => {
  beforeEach(() => {
    Cypress.env("C8Y_USERNAME", undefined);
    Cypress.env("C8Y_PASSWORD", undefined);
    expect(Cypress.env("C8Y_USERNAME")).to.be.undefined;
    expect(Cypress.env("C8Y_PASSWORD")).to.be.undefined;
    cy.clearAllLocalStorage();
  });

  context("normalizedArguments", () => {
    it("from array of arrays", () => {
      const args = [
        [{ user: "admin", password: "password" }, "newuser"],
        ["business"],
      ];
      const result = normalizedArguments(args);
      expect(result.length).to.eq(3);
      expect(result).to.deep.eq([
        { user: "admin", password: "password" },
        "newuser",
        ["business"],
      ]);
    });

    it("from array of objects", () => {
      const args = [
        { user: "admin", password: "password" },
        {
          userName: "newuser",
          password: "newpassword",
          email: "newuser@example.com",
          displayName: "New User",
        },
      ];
      const result = normalizedArguments(args);
      expect(result.length).to.eq(2);
      expect(result).to.deep.eq([
        { user: "admin", password: "password" },
        {
          userName: "newuser",
          password: "newpassword",
          email: "newuser@example.com",
          displayName: "New User",
        },
      ]);
    });

    it("from object of arrays", () => {
      const args = {
        "0": [{ user: "admin", password: "password" }, "newuser"],
        "1": ["business"],
      };
      const result = normalizedArguments(args);
      expect(result.length).to.eq(3);
      expect(result).to.deep.eq([
        { user: "admin", password: "password" },
        "newuser",
        ["business"],
      ]);
    });
  });

  context("getAuthOptions", () => {
    it("auth options from auth options", () => {
      const result = getAuthOptions({
        user: "admin",
        password: "password",
      });
      expect(result.user).to.eq("admin");
      expect(result.password).to.eq("password");
    });

    it("auth options from auth options with additional argument", () => {
      const result2 = getAuthOptions(
        {
          user: "admin",
          password: "password",
        },
        {
          validationFn: () => {
            return false;
          },
        }
      );
      expect(result2.user).to.eq("admin");
      expect(result2.password).to.eq("password");
    });

    it("auth options from user and password from env variable", () => {
      Cypress.env("admin_password", "mypassword");
      const result = getAuthOptions("admin");
      expect(result).to.not.be.undefined;
      expect(result.user).to.eq("admin");
      expect(result.password).to.eq("mypassword");

      Cypress.env("admin_username", "oeeadmin2");
      Cypress.env("admin_password", "oeeadminpassword2");
      const result2 = getAuthOptions("admin");
      expect(result2).to.not.be.undefined;
      expect(result2.user).to.eq("oeeadmin2");
      expect(result2.password).to.eq("oeeadminpassword2");
    });

    it("auth options from user and password from env variable with additional argument", () => {
      Cypress.env("admin_username", undefined);
      Cypress.env("admin_password", "mypassword");
      const result = getAuthOptions("admin", {
        validationFn: () => {
          return false;
        },
      });
      expect(result).to.not.be.undefined;
      expect(result.user).to.eq("admin");
      expect(result.password).to.eq("mypassword");

      Cypress.env("admin_username", "oeeadmin");
      Cypress.env("admin_password", "oeeadminpassword");
      const result2 = getAuthOptions("admin", {
        validationFn: () => {
          return false;
        },
      });
      expect(result2).to.not.be.undefined;
      expect(result2.user).to.eq("oeeadmin");
      expect(result2.password).to.eq("oeeadminpassword");

      Cypress.env("admin_username", undefined);
      Cypress.env("admin_password", undefined);
    });

    it("auth options from user and password", () => {
      const result = getAuthOptions("admin2", "password2");
      expect(result.user).to.eq("admin2");
      expect(result.password).to.eq("password2");
    });

    it("auth options from user and password with login options", () => {
      const result2 = getAuthOptions("admin3", "password3", {
        validationFn: () => {
          return false;
        },
      });
      expect(result2.user).to.eq("admin3");
      expect(result2.password).to.eq("password3");
    });

    it("auth options from useAuth", () => {
      cy.useAuth("admin", "password");
      cy.then(() => {
        const result2 = getAuthOptions();
        expect(result2.user).to.eq("admin");
        expect(result2.password).to.eq("password");
      });
    });

    it(
      "auth options from test options",
      { auth: { user: "myadmin", password: "mypassword" } },
      () => {
        const result2 = getAuthOptions();
        expect(result2.user).to.eq("myadmin");
        expect(result2.password).to.eq("mypassword");
      }
    );

    it("auth options from env variables", () => {
      Cypress.env("C8Y_USERNAME", "oeeadmin");
      Cypress.env("C8Y_PASSWORD", "oeeadminpassword");

      const result = getAuthOptions();
      expect(result.user).to.eq("oeeadmin");
      expect(result.password).to.eq("oeeadminpassword");
    });

    it("auth options in arguments overwrites auth env variables", () => {
      Cypress.env("C8Y_USERNAME", "admin");
      Cypress.env("C8Y_PASSWORD", "password");

      const result = getAuthOptions({
        user: "oeeadmin",
        password: "oeeadminpassword",
      });
      expect(result.user).to.eq("oeeadmin");
      expect(result.password).to.eq("oeeadminpassword");
    });

    it("auth options from env variables with login options", () => {
      Cypress.env("C8Y_USERNAME", "oeeadmin2");
      Cypress.env("C8Y_PASSWORD", "oeeadminpassword2");
      const result2 = getAuthOptions({
        validationFn: () => {
          return false;
        },
      });
      expect(result2.user).to.eq("oeeadmin2");
      expect(result2.password).to.eq("oeeadminpassword2");
    });

    it("auth options failure ", () => {
      // @ts-ignore
      const result1 = getAuthOptions({ abc: false });
      expect(result1).to.be.undefined;
      // @ts-ignore
      const result2 = getAuthOptions({ user: "test" });
      expect(result2).to.be.undefined;
      // @ts-ignore
      const result3 = getAuthOptions();
      expect(result3).to.be.undefined;
    });
  });
});

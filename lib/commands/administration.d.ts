import { IUser, IApplication, ICurrentTenant } from "@c8y/client";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Create a new user in Cumulocity. Assigns requested permissions and subcribes to
       * applications with given names.
       *
       * Uses cy.c8yclient internally. Will fail if user already exists.
       *
       * Pass auth if required or call `cy.login()` before to use `XSRF-TOKEN`cookie for
       * authentication.
       *
       * @example
       * cy.createUser({
       *   userName: "newuser",
       *   password: "newpassword",
       *   email: "newuser@example.com",
       *   displayName: "New User",
       * });
       *
       * @param {C8yAuthOptions} authOptions the authentication options to use for the request
       * @param {C8yUserOptions} userOptions the user options defining the user to be created
       * @param {string[]} permissions the permissions to be assigned to the user
       * @param {string[] | IApplication[]} applications the name of applications to subscribe the user to
       *
       * @returns {[C8yAuthOptions, string]} the auth options and id of the user created for chaining
       */
      createUser(
        ...args:
          | [
              authOptions: C8yAuthOptions,
              userOptions: C8yUserOptions,
              permissions?: string[],
              applications?: string[] | IApplication[]
            ]
          | [
              userOptions: C8yUserOptions,
              permissions?: string[],
              applications?: string[] | IApplication[]
            ]
      ): Chainable<Cypress.Response<IUser>>;

      /**
       * Delete a user from Cumulocity. Will automatically deal with response status codes
       * to check if the user was deleted or did not exist. Will return success in both cases.
       *
       * Pass auth if required or call `cy.login()` before to use `XSRF-TOKEN`cookie for
       * authentication.
       *
       * @example
       * cy.deleteUser("newuser");
       *
       * @param {C8yAuthOptions} authOptions the authentication options to use for the request
       * @param {string} username the name of the user to be deleted
       *
       * @returns {C8yAuthOptions} the auth options for chaining
       */
      deleteUser(
        ...args:
          | [username: string | C8yUserOptions]
          | [authOptions: C8yAuthOptions, username: string]
      ): Chainable<Cypress.Response<null>>;

      /**
       * Gets information about the current tenant.
       *
       * If no authentication session cookie is used.
       *
       * @example
       * cy.getCurrentTenant();
       * cy.getAuth("admin").getCurrentTenant();
       *
       * @param {C8yAuthOptions} options the authentication options including username and password
       */
      getCurrentTenant(authOptions?: C8yAuthOptions): Chainable<Cypress.Response<ICurrentTenant>>;

      /**
       * Convenience getter for name of the current tenant. 
       * 
       * If no authentication session cookie is used. 
       * 
       * Tenant id is stored in C8Y_TENANT environment variable. C8Y_TENANT is used 
       * internally and checked before quering current tenant for it's id. 
       *
       * @example
       * cy.getTenantId();
       * cy.getAuth("admin").getTenantId();
       *
       * @param {C8yAuthOptions} options - The authentication options including username and password
       * @returns {Chainable<string>}
       */
      getTenantId(authOptions?: C8yAuthOptions): Chainable<string>;
    }
  }

  type C8yUserOptions = Omit<IUser, "id" | "self">;
}

import { IUser, IApplication, ICurrentTenant, IDeviceCredentials } from '@c8y/client';

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
       * @param {C8yAuthOptions} authOptions the C8yAuthOptions authentication options including username and password
       * @param {IUser} userOptions the user options defining the user to be created
       * @param {string[]} permissions the permissions to be assigned to the user
       * @param {string[] | IApplication[]} applications the name of applications to subscribe the user to
       * @param {C8yClientOptions} c8yoptions the C8yClientOptions options passed to cy.c8yclient
       *
       * @returns {[C8yAuthOptions, string]} the auth options and id of the user created for chaining
       */
      createUser(
        ...args:
          | [
              authOptions: C8yAuthOptions,
              userOptions: IUser,
              permissions?: string[],
              applications?: string[] | IApplication[],
              c8yoptions?: C8yClientOptions
            ]
          | [
              userOptions: IUser,
              permissions?: string[],
              applications?: string[] | IApplication[],
              c8yoptions?: C8yClientOptions
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
       * @param {C8yAuthOptions} authOptions the C8yAuthOptions authentication options including username and password
       * @param {string} username the name of the user to be deleted
       * @param {C8yClientOptions} c8yoptions the C8yClientOptions options passed to cy.c8yclient
       *
       * @returns {C8yAuthOptions} the auth options for chaining
       */
      deleteUser(
        ...args:
          | [username: string | IUser, c8yoptions?: C8yClientOptions]
          | [authOptions: C8yAuthOptions, username: string | IUser, c8yoptions?: C8yClientOptions]
      ): Chainable<Cypress.Response<null>>;

      /**
       * Clear all roles currently assigned to a user.
       *
       * Pass auth if required or call `cy.login()` before to use `XSRF-TOKEN`cookie for
       * authentication.
       *
       * @example
       * cy.clearUserRoles("user");
       *
       * @param {C8yAuthOptions} authOptions the C8yAuthOptions authentication options including username and password
       * @param {string} username the name of the user to be deleted
       * @param {C8yClientOptions} c8yoptions the C8yClientOptions options passed to cy.c8yclient
       *
       * @returns {C8yAuthOptions} the auth options for chaining
       */
      clearUserRoles(
        ...args:
          | [username: string | IUser, c8yoptions?: C8yClientOptions]
          | [authOptions: C8yAuthOptions, username: string | IUser, c8yoptions?: C8yClientOptions]
      ): Chainable<C8yAuthOptions>;

      /**
       * Assign roles to a user.
       *
       * Pass auth if required or call `cy.login()` before to use `XSRF-TOKEN`cookie for
       * authentication.
       *
       * @example
       * cy.assignUserRoles("user", ["role1", "role2"]);
       *
       * @param {C8yAuthOptions} authOptions the C8yAuthOptions authentication options including username and password
       * @param {string} username the name of the user to be deleted
       * @param {string[]} roles the roles to be assigned to the user
       * @param {C8yClientOptions} c8yoptions the C8yClientOptions options passed to cy.c8yclient
       *
       * @returns {C8yAuthOptions} the auth options for chaining
       */
      assignUserRoles(
        ...args:
          | [username: string | IUser, roles: string[], c8yoptions?: C8yClientOptions]
          | [
              authOptions: C8yAuthOptions,
              username: string | IUser,
              roles: string[],
              c8yoptions?: C8yClientOptions
            ]
      ): Chainable<C8yAuthOptions>;

      /**
       * Gets information about the current tenant.
       *
       * If no authentication session cookie is used.
       *
       * @example
       * cy.getCurrentTenant();
       * cy.getAuth("admin").getCurrentTenant();
       *
       * @param {C8yAuthOptions} authOptions the C8yAuthOptions authentication options including username and password
       * @param {C8yClientOptions} c8yoptions the C8yClientOptions options passed to cy.c8yclient
       */
      getCurrentTenant(
        authOptions?: C8yAuthOptions,
        c8yoptions?: C8yClientOptions
      ): Chainable<Cypress.Response<ICurrentTenant>>;

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

      /**
       * Get Cumulocity system version. Requires bootstrap credentials.
       *
       * @param {C8yAuthOptions} options - The authentication options including username and password
       * @returns {Chainable<string>}
       */
      getSystemVersion(
        authOptions?: C8yAuthOptions,
        c8yoptions?: C8yClientOptions
      ): Chainable<string>;

      /**
       * Bootstrap device credentials. Doing the same as c.deviceRegistration.bootstrap(), but works
       * with getAuth(). Requires bootstrap credentials to be passed via getAuth().
       *
       * @example
       * cy.getAuth("devicebootstrap")
       *   .bootstrapDeviceCredentials(id)
       *   .useAuth()
       *
       * @param {C8yAuthOptions} options - The authentication options including username and password
       * @returns {Chainable<IDeviceCredentials | undefined>}
       */
      bootstrapDeviceCredentials(
        ...args:
          | [id: string | IUser, c8yoptions?: C8yClientOptions]
          | [authOptions: C8yAuthOptions, id: string, c8yoptions?: C8yClientOptions]
      ): Chainable<IDeviceCredentials>;
    }
  }
}

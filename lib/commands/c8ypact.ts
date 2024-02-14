import "../pact/cypresspact";
import "../pact/c8ymatch";

import * as P from "@shared/c8ypact";
import * as C from "@shared/c8yclient";

export { P };

declare global {
  /**
   * Checks if the given object is a Cypress.Response.
   *
   * @param obj The object to check.
   * @returns True if the object is a Cypress.Response, false otherwise.
   */
  function isCypressResponse(obj: any): obj is Cypress.Response<any>;
  /**
   * Checks if the given object is a C8yPactError. A C8yPactError is an error
   * with the name "C8yPactError".
   *
   * @param error The object to check.
   * @returns True if the object is a C8yPactError, false otherwise.
   */
  function isPactError(error: any): boolean;
  /**
   * Checks if the given object is a C8yPactRecord.
   *
   * @param obj The object to check.
   * @returns True if the object is a C8yPactRecord, false otherwise.
   */
  function isPactRecord(obj: any): obj is P.C8yPactRecord;
  /**
   * Checks if the given object is a C8yPact. This also includes checking
   * all records to be valid C8yPactRecord instances.
   *
   * @param obj The object to check.
   * @returns True if the object is a C8yPact, false otherwise.
   */
  function isPact(obj: any): obj is P.C8yPact;
  /**
   * Checks if the given object is a C8yAuthOptions and contains at least a user
   * and a type or userAlias property.
   *
   * @param obj The object to check.
   * @returns True if the object is a C8yAuthOptions, false otherwise.
   */
  function isAuthOptions(obj: any): obj is C.C8yAuthOptions;
}

globalThis.isCypressResponse = P.isCypressResponse;
globalThis.isPactError = P.isPactError;
globalThis.isPactRecord = P.isPactRecord;
globalThis.isPact = P.isPact;
globalThis.isAuthOptions = P.isAuthOptions;

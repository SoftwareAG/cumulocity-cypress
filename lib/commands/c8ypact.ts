import "../pacts/cypresspact";
import "../pacts/c8ymatch";

import * as P from "@shared/c8ypact";

export { P };

declare global {
  function isCypressResponse(obj: any): obj is Cypress.Response<any>;
  function isPactError(error: any): boolean;
  function isPactRecord(obj: any): obj is P.C8yPactRecord;
  function isPact(obj: any): obj is P.C8yPact;
  function isAuthOptions(obj: any): obj is C8yAuthOptions;
}

globalThis.isCypressResponse = P.isCypressResponse;
globalThis.isPactError = P.isPactError;
globalThis.isPactRecord = P.isPactRecord;
globalThis.isPact = P.isPact;
globalThis.isAuthOptions = P.isAuthOptions;

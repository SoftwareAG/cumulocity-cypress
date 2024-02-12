import "../pacts/cypresspact";
import "../pacts/c8ymatch";
import {
  C8yPact,
  C8yPactRecord,
  isCypressResponse,
  isPactRecord,
  isPactError,
  isPact,
} from "../../shared/c8ypact";

declare global {
  function isCypressResponse(obj: any): obj is Cypress.Response<any>;
  function isPactError(error: any): boolean;
  function isPactRecord(obj: any): obj is C8yPactRecord;
  function isPact(obj: any): obj is C8yPact;
}

globalThis.isCypressResponse = isCypressResponse;
globalThis.isPactError = isPactError;
globalThis.isPactRecord = isPactRecord;
globalThis.isPact = isPact;

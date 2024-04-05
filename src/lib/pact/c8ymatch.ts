import {
  C8yDefaultPactRecord,
  C8yPactInfo,
  C8yPactRecord,
  C8yPactMatcher,
  C8ySchemaMatcher,
} from "../../shared/c8ypact";
import { C8yClientOptions, isCypressError } from "../../shared/c8yclient";
import { throwError } from "../utils";

const { _ } = Cypress;

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Compares a given Cypress.Response object with a C8yPactRecord contract or a json schema.
       * match ing fails, an C8yPactError is thrown.
       *
       * @param response - A Cypress.Response object representing the HTTP response.
       * @param record - A C8yPactRecord object representing the contract.
       * @param info - An optional C8yPactInfo object that may contain additional information for processing the contract.
       * @param options - An optional C8yClientOptions object that may contain various options for the behavior of the c8ymatch function.
       */
      c8ymatch(
        response: Cypress.Response<any>,
        record: Partial<C8yPactRecord>,
        info?: C8yPactInfo,
        options?: C8yClientOptions
      ): Cypress.Chainable<void>;
      c8ymatch(
        response: Cypress.Response<any>,
        schema: any
      ): Cypress.Chainable<void>;
    }
  }
}

Cypress.Commands.add("c8ymatch", (response, pact, info = {}, options = {}) => {
  let matcher: C8yPactMatcher | C8ySchemaMatcher = Cypress.c8ypact.matcher;
  const isSchemaMatching =
    !("request" in pact) && !("response" in pact) && _.isObjectLike(pact);
  if (isSchemaMatching) {
    matcher = Cypress.c8ypact.schemaMatcher;
    options.failOnPactValidation = true;
  }

  const consoleProps: any = { response, matcher };
  const logger = Cypress.log({
    autoEnd: false,
    consoleProps: () => consoleProps,
    message: matcher.constructor.name || "-",
  });

  try {
    if (isSchemaMatching) {
      const schema = pact;
      _.extend(consoleProps, { response }, { schema });
      matcher.match(response.body, schema);
    } else {
      const matchingProperties = ["request", "response"];
      const pactToMatch = _.pick(pact, matchingProperties);
      const responseAsRecord = _.pick(
        C8yDefaultPactRecord.from(response),
        matchingProperties
      );

      Cypress.c8ypact.preprocessor?.apply(responseAsRecord, info.preprocessor);
      _.extend(
        consoleProps,
        { responseAsRecord },
        { response },
        { pact: pactToMatch }
      );
      const strictMatching = Cypress.c8ypact.getConfigValue(
        "strictMatching",
        true
      );
      (matcher as C8yPactMatcher).match(responseAsRecord, pactToMatch, {
        strictMatching,
        loggerProps: consoleProps,
        schemaMatcher: Cypress.c8ypact.schemaMatcher,
      });
    }
  } catch (error: any) {
    if (options.failOnPactValidation) {
      if (isCypressError(error) || isPactError(error)) {
        throw error;
      } else {
        throwError(`Matching schema failed. Error: ${error}`);
      }
    }
  } finally {
    logger.end();
  }
});

const { _ } = Cypress;

declare global {
  /**
   * Preprocessor for C8yPact objects. Use C8yPactPreprocessor to preprocess any
   * Cypress.Response, C8yPactRecord or C8yPact. The preprocessor could be used to
   * obfuscate or remove sensitive data from the pact objects. It is called on save
   * and load of the pact objects.
   */
  interface C8yPactPreprocessor {
    /**
     * Applies the preprocessor to the given object.
     *
     * @param obj Object to preprocess.
     * @param options Preprocessor options.
     */
    apply: (
      obj: Partial<Cypress.Response | C8yPactRecord | C8yPact>,
      options?: C8yPactPreprocessorOptions
    ) => void;
    defaultObfuscationPattern: string;
  }

  /**
   * Configuration options for the C8yPactPreprocessor.
   */
  interface C8yPactPreprocessorOptions {
    /**
     * Key paths to obfuscate.
     *
     * @example
     * response.body.password
     */
    obfuscate?: string[];
    /**
     * Key paths to remove.
     *
     * @example
     * request.headers.Authorization
     */
    ignore?: string[];
    /**
     * Obfuscation pattern to use. Default is ********.
     */
    obfuscationPattern?: string;
  }
}

/**
 * Default implementation of C8yPactPreprocessor. Preprocessor for C8yPact objects
 * that can be used to obfuscate or remove sensitive data from the pact objects.
 * Use C8ypactPreprocessorOptions to configure the preprocessor. Also uses environment
 * variables C8Y_PACT_OBFUSCATE and C8Y_PACT_IGNORE.
 */
export class C8yPactDefaultPreprocessor implements C8yPactPreprocessor {
  constructor() {}

  defaultObfuscationPattern = "********";

  apply(
    obj: Partial<Cypress.Response | C8yPactRecord | C8yPact>,
    options: C8yPactPreprocessorOptions = {}
  ): void {
    if (!obj || !_.isObjectLike(obj)) return;
    const objs: any[] = "records" in obj ? _.get(obj, "records") : [obj];
    const reservedKeys = ["id", "pact", "info", "records"];

    const keysToObfuscate: string[] =
      options.obfuscate || Cypress.env("C8Y_PACT_OBFUSCATE") || [];
    const obfuscationPattern = options.obfuscationPattern || "********";
    objs.forEach((obj) => {
      const notExistingKeys = keysToObfuscate.filter((key) => {
        return !_.get(obj, key);
      });
      _.without(keysToObfuscate, ...reservedKeys, ...notExistingKeys).forEach(
        (key) => {
          _.set(obj, key, obfuscationPattern);
        }
      );
    });

    const keysToRemove: string[] =
      options.ignore || Cypress.env("C8Y_PACT_IGNORE") || [];
    _.without(keysToRemove, ...reservedKeys).forEach((key) => {
      objs.forEach((obj) => {
        _.unset(obj, key);
      });
    });
  }
}

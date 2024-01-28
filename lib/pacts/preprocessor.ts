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
     * Preprocessor options used by preprocessor.
     */
    options: C8yPactPreprocessorOptions;

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
export class C8yDefaultPactPreprocessor implements C8yPactPreprocessor {
  options: C8yPactPreprocessorOptions;
  constructor(options: C8yPactPreprocessorOptions = {}) {
    this.options = options;
    if (!this.options.ignore) {
      this.options.ignore = Cypress.env("C8Y_PACT_IGNORE") || [];
    }
    if (!this.options.obfuscate) {
      this.options.obfuscate = Cypress.env("C8Y_PACT_OBFUSCATE") || [];
    }
    if (!this.options.obfuscationPattern) {
      this.options.obfuscationPattern =
        Cypress.env("C8Y_PACT_OBFUSCATION_PATTERN") ||
        C8yDefaultPactPreprocessor.defaultObfuscationPattern;
    }
  }

  static defaultObfuscationPattern = "********";

  apply(
    obj: Partial<Cypress.Response | C8yPactRecord | C8yPact>,
    options?: C8yPactPreprocessorOptions
  ): void {
    if (!obj || !_.isObjectLike(obj)) return;
    const objs: any[] = "records" in obj ? _.get(obj, "records") : [obj];
    const reservedKeys = ["id", "pact", "info", "records"];

    const keysToObfuscate = (options || this.options).obfuscate;
    const obfuscationPattern = (options || this.options).obfuscationPattern;

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

    const keysToRemove = (options || this.options).ignore;
    _.without(keysToRemove, ...reservedKeys).forEach((key) => {
      objs.forEach((obj) => {
        _.unset(obj, key);
      });
    });
  }
}

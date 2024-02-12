import _ from "lodash";
import { C8yPact, C8yPactRecord } from "./c8ypact";

/**
 * Preprocessor for C8yPact objects. Use C8yPactPreprocessor to preprocess any
 * Cypress.Response, C8yPactRecord or C8yPact. The preprocessor could be used to
 * obfuscate or remove sensitive data from the pact objects. It is called on save
 * and load of the pact objects.
 */
export interface C8yPactPreprocessor {
  /**
   * Applies the preprocessor to the given object.
   *
   * @param obj Object to preprocess.
   * @param options Preprocessor options.
   */
  apply: (
    obj: Partial<Cypress.Response<any> | C8yPactRecord | C8yPact>,
    options?: C8yPactPreprocessorOptions
  ) => void;
}

/**
 * Configuration options for the C8yPactPreprocessor.
 */
export interface C8yPactPreprocessorOptions {
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

/**
 * Default implementation of C8yPactPreprocessor. Preprocessor for C8yPact objects
 * that can be used to obfuscate or remove sensitive data from the pact objects.
 * Use C8ypactPreprocessorOptions to configure the preprocessor. Also uses environment
 * variables C8Y_PACT_PREPROCESSOR_OBFUSCATE and C8Y_PACT_PREPROCESSOR_IGNORE.
 */
export class C8yDefaultPactPreprocessor implements C8yPactPreprocessor {
  static defaultObfuscationPattern = "********";

  options?: C8yPactPreprocessorOptions;

  constructor(options?: C8yPactPreprocessorOptions) {
    this.options = options;
  }

  apply(
    obj: Partial<Cypress.Response<any> | C8yPactRecord | C8yPact>,
    options?: C8yPactPreprocessorOptions
  ): void {
    if (!obj || !_.isObjectLike(obj)) return;
    const objs = "records" in obj ? _.get(obj, "records") : [obj];
    if (!_.isArray(objs)) return;

    const reservedKeys = ["id", "pact", "info", "records"];

    const o = this.resolveOptions(options);
    const keysToObfuscate = o.obfuscate || [];
    const keysToRemove = o.ignore || [];
    const obfuscationPattern = o.obfuscationPattern;

    objs.forEach((obj) => {
      const notExistingKeys = keysToObfuscate.filter((key) => {
        return _.get(obj, key) == null;
      });
      _.without(keysToObfuscate, ...reservedKeys, ...notExistingKeys).forEach(
        (key) => {
          _.set(obj, key, obfuscationPattern);
        }
      );
    });

    _.without(keysToRemove, ...reservedKeys).forEach((key) => {
      objs.forEach((obj) => {
        _.unset(obj, key);
      });
    });
  }

  protected resolveOptions(
    options?: Partial<C8yPactPreprocessorOptions>
  ): C8yPactPreprocessorOptions {
    return _.defaults(options, this.options, {
      ignore: [],
      obfuscate: [],
      obfuscationPattern: C8yDefaultPactPreprocessor.defaultObfuscationPattern,
    });
  }
}

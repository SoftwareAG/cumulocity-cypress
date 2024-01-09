const { _ } = Cypress;

declare global {
  interface C8yPactPreprocessor {
    apply: (
      obj: Partial<Cypress.Response | C8yPactRecord | C8yPact>,
      options?: C8yPactPreprocessorOptions
    ) => void;
    defaultObfuscationPattern: string;
  }

  interface C8yPactPreprocessorOptions {
    obfuscate?: string[];
    ignore?: string[];
    obfuscationPattern?: string;
  }
}

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

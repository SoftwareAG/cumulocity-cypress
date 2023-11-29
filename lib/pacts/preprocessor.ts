const { _ } = Cypress;

declare global {
  interface C8yPactPreprocessor {
    preprocess: (obj: unknown, options?: C8yPactPreprocessorOptions) => void;
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

  preprocess(obj?: any, options: C8yPactPreprocessorOptions = {}): void {
    if (!obj || !_.isPlainObject(obj)) return;
    const reservedKeys = ["id", "pact"];

    const keysToObfuscate: string[] =
      options.obfuscate || Cypress.env("C8Y_PACT_OBFUSCATE") || [];
    const obfuscationPattern = options.obfuscationPattern || "********";
    _.without(keysToObfuscate, ...reservedKeys).forEach((key: string) => {
      if (_.has(obj, key)) {
        _.set(obj, key, obfuscationPattern);
      }
    });

    const keysToRemove: string[] =
      options.ignore || Cypress.env("C8Y_PACT_IGNORE") || [];
    _.without(keysToRemove, ...reservedKeys).forEach((key: string) => {
      if (_.has(obj, key)) {
        _.unset(obj, key);
      }
    });
  }
}

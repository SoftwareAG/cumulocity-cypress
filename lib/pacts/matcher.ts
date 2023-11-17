const { _ } = Cypress;

export class C8yDefaultPactMatcher {
  private propertyMatchers: { [key: string]: C8yPactMatcher } = {};

  constructor(
    propertyMatchers: { [key: string]: C8yPactMatcher } = {
      body: new C8yPactContentMatcher(),
      requestBody: new C8yPactContentMatcher(),
    }
  ) {
    this.propertyMatchers = propertyMatchers;

    this.addPropertyMatcher("duration", new C8yNumberMatcher());
    this.addPropertyMatcher("date", new C8yIgnoreMatcher());
    this.addPropertyMatcher("Authorization", new C8yIgnoreMatcher());
    this.addPropertyMatcher("location", new C8yIgnoreMatcher());
    this.addPropertyMatcher("url", new C8yIgnoreMatcher());
    this.addPropertyMatcher("lastMessage", new C8yISODateStringMatcher());
  }

  match(
    obj1: any,
    obj2: any,
    consoleProps: { [key: string]: any } = {}
  ): boolean {
    if (obj1 === obj2) {
      return true;
    }

    const throwPactError = (message: string, key?: string) => {
      const newErr = new Error(message);
      newErr.name = "C8yPactError";
      if (consoleProps) {
        consoleProps.error = message;
        consoleProps.key = key;
        consoleProps.objects =
          key && _.isPlainObject(obj1) && _.isPlainObject(obj2)
            ? [_.pick(obj1, [key]), _.pick(obj2, [key])]
            : [obj1, obj2];
      }
      throw newErr;
    };

    if (_.isString(obj1) && _.isString(obj2) && !_.isEqual(obj1, obj2)) {
      throwPactError("Pact validation failed! Response bodies not matching.");
    }

    if (!_.isObject(obj1) || !_.isObject(obj2)) {
      throwPactError(
        "Pact validation failed! Expected 2 objects as input for matching."
      );
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
      throwPactError(
        "Pact validation failed! Objects have different number of keys."
      );
    }

    if (_.isEmpty(keys1) && _.isEmpty(keys2)) {
      return true;
    }

    for (const key of keys1) {
      const value1 = obj1[key];
      const value2 = obj2[key];

      if (!keys2.includes(key)) {
        throwPactError(
          `Pact validation failed! Pact does not have key: "${key}".`
        );
      }
      if (this.propertyMatchers[key]) {
        if (!this.propertyMatchers[key].match(value1, value2, consoleProps)) {
          throwPactError(
            `Pact validation failed for key "${key}" with propertyMatcher ${this.propertyMatchers[key]}`,
            key
          );
        }
      } else if (_.isPlainObject(value1) && _.isPlainObject(value2)) {
        if (!this.match(value1, value2, consoleProps)) {
          throwPactError(
            `Pact validation of objects failed for key: "${key}"`,
            key
          );
        }
      } else if (_.isArray(value1) && _.isArray(value2)) {
        const v = [value1, value2].sort(
          (a1: any[], a2: any[]) => a2.length - a1.length
        );
        const diff = _.difference(v[0], v[1]);
        if (_.isEmpty(diff)) {
          continue;
        } else {
          throwPactError(
            `Pact validation failed for array with key "${key}". Different values are ${diff}.`,
            key
          );
        }
      } else {
        if (!_.isEqual(value1, value2)) {
          throwPactError(
            `Pact validation failed for key: "${key}". Values ${value1} and ${value2} are not equal.`,
            key
          );
        }
      }
    }
    return true;
  }

  addPropertyMatcher(propertyName: string, matcher: C8yPactMatcher) {
    this.propertyMatchers[propertyName] = matcher;
  }

  removePropertyMatcher(propertyName: string) {
    delete this.propertyMatchers[propertyName];
  }
}

export class C8yPactContentMatcher extends C8yDefaultPactMatcher {
  constructor(propertyMatchers = {}) {
    super(propertyMatchers);

    this.addPropertyMatcher("id", new C8yStringMatcher());
    this.addPropertyMatcher("statistics", new C8yIgnoreMatcher());
    this.addPropertyMatcher("lastUpdated", new C8yISODateStringMatcher());
    this.addPropertyMatcher("creationTime", new C8yISODateStringMatcher());
    this.addPropertyMatcher("next", new C8yIgnoreMatcher());
    this.addPropertyMatcher("self", new C8yIgnoreMatcher());
    this.addPropertyMatcher("password", new C8yIgnoreMatcher());
  }
}

export class C8yIdentifierMatcher implements C8yPactMatcher {
  match(obj1: any, obj2: any): boolean {
    return (
      _.isString(obj1) &&
      /^\d+$/.test(obj1) &&
      _.isString(obj2) &&
      /^\d+$/.test(obj2)
    );
  }
}

export class C8yNumberMatcher implements C8yPactMatcher {
  match(obj1: any, obj2: any): boolean {
    return _.isNumber(obj1) && _.isNumber(obj2);
  }
}

export class C8yStringMatcher implements C8yPactMatcher {
  match(obj1: any, obj2: any): boolean {
    return _.isString(obj1) && _.isString(obj2);
  }
}
export class C8yIgnoreMatcher implements C8yPactMatcher {
  match(obj1: any, obj2: any): boolean {
    return true;
  }
}

export class C8yISODateStringMatcher implements C8yPactMatcher {
  match(obj1: any, obj2: any): boolean {
    if (!_.isString(obj1) || !_.isString(obj2)) {
      return false;
    }

    const d1 = Cypress.datefns.parseISO(obj1);
    const d2 = Cypress.datefns.parseISO(obj2);
    return Cypress.datefns.isValid(d1) && Cypress.datefns.isValid(d2);
  }
}

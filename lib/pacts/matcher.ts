const { _ } = Cypress;

export class C8yDefaultPactMatcher {
  private propertyMatchers: { [key: string]: C8yPactMatcher } = {};
  private parents: string[] = [];

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
    this.addPropertyMatcher("auth", new C8yIgnoreMatcher());
    this.addPropertyMatcher("options", new C8yIgnoreMatcher());
    this.addPropertyMatcher("createdObject", new C8yIgnoreMatcher());
    this.addPropertyMatcher("location", new C8yIgnoreMatcher());
    this.addPropertyMatcher("url", new C8yIgnoreMatcher());
    this.addPropertyMatcher("X-XSRF-TOKEN", new C8yIgnoreMatcher());
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
      const errorMessage = `Pact validation failed! ${message}`;
      const newErr = new Error(errorMessage);
      newErr.name = "C8yPactError";
      if (consoleProps) {
        consoleProps.error = errorMessage;
        consoleProps.key = key;
        consoleProps.objects =
          key && _.isPlainObject(obj1) && _.isPlainObject(obj2)
            ? [_.pick(obj1, [key]), _.pick(obj2, [key])]
            : [obj1, obj2];
      }
      throw newErr;
    };

    const keyPath = (k?: string) => {
      return `${[...this.parents, ...(k ? [k] : [])].join(" > ")}`;
    };

    const isArrayOfPrimitives = (value: any) => {
      if (!_.isArray(value)) {
        return false;
      }
      const primitiveTypes = ["undefined", "boolean", "number", "string"];
      return (
        value.filter((p) => primitiveTypes.includes(typeof p)).length ===
        value.length
      );
    };

    if (_.isString(obj1) && _.isString(obj2) && !_.isEqual(obj1, obj2)) {
      throwPactError(`"${keyPath()}" text did not match.`);
    }

    if (!_.isObject(obj1) || !_.isObject(obj2)) {
      throwPactError(
        `Expected 2 objects as input for matching, but got "${typeof obj1}" and ${typeof obj2}".`
      );
    }

    const strictMode = Cypress.c8ypact.strictMatching;
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length && strictMode) {
      throwPactError(
        `${
          keyPath() ? '"' + keyPath() + '" ' : ""
        }objects have different number of keys (${keys1.length} and ${
          keys2.length
        }).`
      );
    }

    if (_.isEmpty(keys1) && _.isEmpty(keys2)) {
      return true;
    }

    // if strictMatching is disabled, only check properties of the pact
    const keys = !strictMode ? keys2 : keys1;
    for (const key of keys) {
      const value1 = (strictMode ? obj1 : obj2)[key];
      const value2 = (strictMode ? obj2 : obj1)[key];

      if (!(strictMode ? keys2 : keys1).includes(key)) {
        throwPactError(`"${keyPath(key)}" not found in ${strictMode ? 'pact' : 'response'} object.`);
      }
      if (this.propertyMatchers[key]) {
        // @ts-ignore
        this.propertyMatchers[key].parents = [...this.parents, key];
        if (!this.propertyMatchers[key].match(value1, value2, consoleProps)) {
          throwPactError(`Values for "${keyPath(key)}" do not match.`, key);
        }
      } else if (_.isPlainObject(value1) && _.isPlainObject(value2)) {
        this.parents.push(key);
        if (this.match(value1, value2, consoleProps)) {
          this.parents.pop();
        }
      } else if (isArrayOfPrimitives(value1) && isArrayOfPrimitives(value2)) {
        const v = [value1, value2].sort(
          (a1: any[], a2: any[]) => a2.length - a1.length
        );
        const diff = _.difference(v[0], v[1]);
        if (_.isEmpty(diff)) {
          continue;
        } else {
          throwPactError(
            `Array with key "${keyPath(key)}" has unexpected values "${diff}".`,
            key
          );
        }
      } else {
        if (!_.isEqual(value1, value2)) {
          throwPactError(`Values for "${keyPath(key)}" do not match.`, key);
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
    this.addPropertyMatcher("owner", new C8yIgnoreMatcher());
    this.addPropertyMatcher("tenantId", new C8yIgnoreMatcher());
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

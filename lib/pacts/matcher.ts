const { _ } = Cypress;

export class C8yDefaultPactMatcher {
  private propertyMatchers: { [key: string]: C8yPactMatcher } = {};

  constructor(
    propertyMatchers: { [key: string]: C8yPactMatcher } = {
      body: new C8yPactContentMatcher(),
    }
  ) {
    this.propertyMatchers = propertyMatchers;

    this.addPropertyMatcher("duration", new C8yNumberMatcher());
  }

  match(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) {
      return true;
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
          `Pact validation failed! Pact does not have ${key} key.`
        );
      }
      if (this.propertyMatchers[key]) {
        if (!this.propertyMatchers[key].match(value1, value2)) {
          throwPactError(
            `Pact validation failed for ${key} with propertyMatcher ${this.propertyMatchers[key]}`
          );
        }
      } else if (_.isObject(value1) && _.isObject(value2)) {
        if (!this.match(value1, value2))
          throwPactError(`Pact validation of objects failed for ${key}`);
      } else {
        if (!_.isEqual(value1, value2)) {
          throwPactError(
            `Pact validation failed for ${key}. Values ${value1} and ${value2} are not equal.`
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

function throwPactError(message: string) {
  const newErr = new Error(message);
  newErr.name = "C8yPactError";
  throw newErr;
}

export class C8yPactContentMatcher extends C8yDefaultPactMatcher {
  constructor(propertyMatchers = {}) {
    super(propertyMatchers);

    this.addPropertyMatcher("id", new C8yIdentifierMatcher());
    this.addPropertyMatcher("statistics", new C8yIgnoreMatcher());
    this.addPropertyMatcher("lastUpdated", new C8yISODateStringMatcher());
    this.addPropertyMatcher("creationTime", new C8yISODateStringMatcher());
    this.addPropertyMatcher("next", new C8yIgnoreMatcher());
    this.addPropertyMatcher("self", new C8yIgnoreMatcher());
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

    const d1 = new Date(obj1);
    const d2 = new Date(obj2);
    return (
      !Number.isNaN(d1.valueOf()) &&
      d1.toISOString() === obj1 &&
      !Number.isNaN(d2.valueOf()) &&
      d2.toISOString() === obj2
    );
  }
}

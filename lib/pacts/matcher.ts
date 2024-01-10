const { _ } = Cypress;
import * as datefns from "date-fns";

declare global {
  /**
   * Matcher for C8yPactRecord objects. Use C8yPactMatcher to match any two
   * records. Depending on the matcher implementation an Error will be thrown
   * or boolean is returned.
   */
  interface C8yPactMatcher {
    /**
     * Matches two objects.
     *
     * @param obj1 First object to match.
     * @param obj2 Second object to match.
     * @param loggerProps Properties to log in Cypress debug log.
     */
    match: (
      obj1: Partial<C8yPactRecord>,
      obj2: Partial<C8yPactRecord>,
      loggerProps?: { [key: string]: any }
    ) => boolean;
  }
}

/**
 * Default implementation of C8yPactMatcher to match C8yPactRecord objects.
 * In case objects do not match an C8yPactError will be thrown.
 *
 * C8yDefaultPactMatcher can be configured with custom property matchers. Use
 * addPropertyMatcher to add a new property matcher for a specific property.
 */
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
    obj1: Partial<C8yPactRecord>,
    obj2: Partial<C8yPactRecord>,
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
        consoleProps.keypath = keyPath(key);
        consoleProps.objects =
          key && _.isPlainObject(obj1) && _.isPlainObject(obj2)
            ? [_.pick(obj1, [key]), _.pick(obj2, [key])]
            : [obj1, obj2];
      }

      this.parents = [];
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
      const value1 = _.get(strictMode ? obj1 : obj2, key);
      const value2 = _.get(strictMode ? obj2 : obj1, key);

      if (!(strictMode ? keys2 : keys1).includes(key)) {
        throwPactError(
          `"${keyPath(key)}" not found in ${
            strictMode ? "pact" : "response"
          } object.`
        );
      }
      if (this.propertyMatchers[key]) {
        if (!strictMode && !value1) {
          continue;
        }
        // @ts-ignore
        this.propertyMatchers[key].parents = [...this.parents, key];
        if (!this.propertyMatchers[key].match(value1, value2, consoleProps)) {
          throwPactError(`Values for "${keyPath(key)}" do not match.`, key);
        }
      } else if (_.isPlainObject(value1) && _.isPlainObject(value2)) {
        this.parents.push(key);
        if (
          // if strictMatching is disabled, value1 and value2 have been swapped
          // swap back to ensure swapping in next iteration works as expected
          this.match(
            strictMode ? value1 : value2,
            strictMode ? value2 : value1,
            consoleProps
          )
        ) {
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
        if (value1 && value2 && !_.isEqual(value1, value2)) {
          throwPactError(`Values for "${keyPath(key)}" do not match.`, key);
        }
      }
    }

    this.parents = [];
    return true;
  }

  /**
   * Adds a new property matcher for the given property name.
   */
  addPropertyMatcher(propertyName: string, matcher: C8yPactMatcher) {
    this.propertyMatchers[propertyName] = matcher;
  }

  /**
   * Removes the property matcher for the given property name.
   */
  removePropertyMatcher(propertyName: string) {
    delete this.propertyMatchers[propertyName];
  }
}

/**
 * Extends C8yDefaultPactMatcher with default property matchers for Cumulocity
 * response bodies. It has rules configured at least for the following properties:
 * id, statistics, lastUpdated, creationTime, next, self, password, owner, tenantId
 * and lastPasswordChange. It is registered for the properties body and requestBody.
 */
export class C8yPactContentMatcher extends C8yDefaultPactMatcher {
  constructor(propertyMatchers = {}) {
    super(propertyMatchers);

    this.addPropertyMatcher("id", new C8ySameTypeMatcher());
    this.addPropertyMatcher("statistics", new C8yIgnoreMatcher());
    this.addPropertyMatcher("lastUpdated", new C8yISODateStringMatcher());
    this.addPropertyMatcher("creationTime", new C8yISODateStringMatcher());
    this.addPropertyMatcher("next", new C8yIgnoreMatcher());
    this.addPropertyMatcher("self", new C8yIgnoreMatcher());
    this.addPropertyMatcher("password", new C8yIgnoreMatcher());
    this.addPropertyMatcher("owner", new C8yIgnoreMatcher());
    this.addPropertyMatcher("tenantId", new C8yIgnoreMatcher());
    this.addPropertyMatcher(
      "lastPasswordChange",
      new C8yISODateStringMatcher()
    );
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

export class C8ySameTypeMatcher implements C8yPactMatcher {
  match(obj1: any, obj2: any): boolean {
    return typeof obj1 === typeof obj2;
  }
}

export class C8yISODateStringMatcher implements C8yPactMatcher {
  match(obj1: any, obj2: any): boolean {
    if (!_.isString(obj1) || !_.isString(obj2)) {
      return false;
    }

    const d1 = datefns.parseISO(obj1);
    const d2 = datefns.parseISO(obj2);
    return datefns.isValid(d1) && datefns.isValid(d2);
  }
}

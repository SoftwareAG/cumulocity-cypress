const { _ } = Cypress;
import * as datefns from "date-fns";
import Ajv, { AnySchemaObject, SchemaObject } from "ajv";
import addFormats from "ajv-formats";

declare global {
  /**
   * Matcher for C8yPactRecord objects. Use C8yPactMatcher to match any two
   * records. Depending on the matcher implementation an Error will be thrown
   * or boolean is returned.
   */
  interface C8yPactMatcher {
    /**
     * Matches objectToMatch against objectPact. Returns false if objectToMatch
     * does not match objectPact or throws an error with details on failing match.
     *
     * @param obj1 Object to match.
     * @param obj2 Pact to match obj1 against.
     * @param loggerProps Properties to log in Cypress debug log.
     */
    match: (
      objectToMatch: any,
      objectPact: any,
      loggerProps?: { [key: string]: any }
    ) => boolean;
  }

  /**
   * Matcher for matching objects against a schema. If the object does not match
   * the schema an Error will be thrown.
   */
  interface C8ySchemaMatcher {
    match(obj: any, schema: any): boolean;
  }
}

/**
 * Default implementation of C8yPactMatcher to match C8yPactRecord objects. Pacts
 * are matched by comparing the properties of the objects using property matchers.
 * If no property matcher is configured for a property, the property will be matched
 * by equality. Disable Cypress.c8ypact.strictMatching to ignore properties that are
 * missing in matched objects. In case objects do not match an C8yPactError is thrown.
 */
export class C8yDefaultPactMatcher {
  propertyMatchers: { [key: string]: C8yPactMatcher } = {};
  private parents: string[] = [];

  constructor(
    propertyMatchers: { [key: string]: C8yPactMatcher } = {
      body: new C8yPactBodyMatcher(),
      requestBody: new C8yPactBodyMatcher(),
      duration: new C8yNumberMatcher(),
      date: new C8yIgnoreMatcher(),
      Authorization: new C8yIgnoreMatcher(),
      auth: new C8yIgnoreMatcher(),
      options: new C8yIgnoreMatcher(),
      createdObject: new C8yIgnoreMatcher(),
      location: new C8yIgnoreMatcher(),
      url: new C8yIgnoreMatcher(),
      "X-XSRF-TOKEN": new C8yIgnoreMatcher(),
      lastMessage: new C8yISODateStringMatcher(),
    }
  ) {
    this.propertyMatchers = propertyMatchers;
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
    // get keys of objects without schema keys and schema keys separately
    const objectKeys = Object.keys(obj1).filter((k) => !k.startsWith("$"));
    const schemaKeys = Object.keys(obj2).filter((k) => k.startsWith("$"));
    // normalize pact keys and remove keys that have a schema defined
    // we do not want for example body and $body
    const pactKeys = Object.keys(obj2).reduce((acc, key) => {
      if (!schemaKeys.includes(`$${key}`)) {
        acc.push(key);
      }
      return acc;
    }, [] as string[]);

    if (_.isEmpty(objectKeys) && _.isEmpty(pactKeys)) {
      return true;
    }

    // if strictMatching is disabled, only check properties of the pact for object matching
    // strictMatching for schema matching is considered within the matcher -> schema.additionalProperties
    const keys = !strictMode ? pactKeys : objectKeys;
    for (const key of keys) {
      // schema is always defined on the pact object - needs special consideration
      const isSchema = key.startsWith("$") || schemaKeys.includes(`$${key}`);
      const value = _.get(
        strictMode || isSchema ? obj1 : obj2,
        key.startsWith("$") ? key.slice(1) : key
      );
      const pact = _.get(
        strictMode || isSchema ? obj2 : obj1,
        isSchema && !key.startsWith("$") ? `$${key}` : key
      );

      if (!(strictMode ? pactKeys : objectKeys).includes(key) && !isSchema) {
        throwPactError(
          `"${keyPath(key)}" not found in ${
            strictMode ? "pact" : "response"
          } object.`
        );
      }
      if (isSchema && Cypress.c8ypact.schemaMatcher != null) {
        try {
          if (!Cypress.c8ypact.schemaMatcher.match(value, pact)) {
            throwPactError(`Schema for "${keyPath(key)}" does not match.`, key);
          }
        } catch (error) {
          throwPactError(
            `Schema for "${keyPath(key)}" does not match. (${error})`,
            key
          );
        }
      } else if (this.propertyMatchers[key] != null) {
        if (!strictMode && !value) {
          continue;
        }
        // @ts-ignore
        this.propertyMatchers[key].parents = [...this.parents, key];
        if (!this.propertyMatchers[key].match(value, pact, consoleProps)) {
          throwPactError(`Values for "${keyPath(key)}" do not match.`, key);
        }
      } else if (_.isPlainObject(value) && _.isPlainObject(pact)) {
        this.parents.push(key);
        if (
          // if strictMatching is disabled, value1 and value2 have been swapped
          // swap back to ensure swapping in next iteration works as expected
          this.match(
            strictMode ? value : pact,
            strictMode ? pact : value,
            consoleProps
          )
        ) {
          this.parents.pop();
        }
      } else if (isArrayOfPrimitives(value) && isArrayOfPrimitives(pact)) {
        const v = [value, pact].sort(
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
        if (value && pact && !_.isEqual(value, pact)) {
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
export class C8yPactBodyMatcher extends C8yDefaultPactMatcher {
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

export class C8yISODateStringMatcher {
  match(obj1: any, obj2: any): boolean {
    if (!_.isString(obj1) || !_.isString(obj2)) {
      return false;
    }

    const d1 = datefns.parseISO(obj1);
    const d2 = datefns.parseISO(obj2);
    return datefns.isValid(d1) && datefns.isValid(d2);
  }
}

/**
 * Default implementation of C8ySchemaMatcher using AJV. By default
 * json-schema-draft-07 meta schema is used. Other meta schema can be added
 * by passing in constructor. If Cypress.c8ypact.strictMatching is disabled,
 * additionalProperties will be set to true allowing additional properties
 * in the object to match the schema.
 */
export class C8yAjvSchemaMatcher implements C8ySchemaMatcher {
  ajv: Ajv;

  constructor(metas?: AnySchemaObject[]) {
    this.ajv = new Ajv();
    addFormats(this.ajv);

    this.ajv.addFormat("integer", {
      type: "number",
      validate: (x) => _.isInteger(x),
    });

    this.ajv.addFormat("boolean", {
      type: "string",
      validate: (x) => _.isBoolean(x) || x === "true" || x === "false",
    });

    if (metas && _.isArrayLike(metas)) {
      metas.forEach((m) => {
        this.ajv.addMetaSchema(m);
      });
    }
  }

  match(obj: any, schema: SchemaObject): boolean {
    if (!schema) return false;
    const schemaClone = _.cloneDeep(schema);
    this.updateAdditionalProperties(
      schemaClone,
      !Cypress.c8ypact.strictMatching
    );

    const valid = this.ajv.validate(schemaClone, obj);
    if (!valid) {
      throw new Error(this.ajv.errorsText());
    }
    return valid;
  }

  protected updateAdditionalProperties(schema: any, value: boolean) {
    if (_.isObjectLike(schema)) {
      schema.additionalProperties = value;
      Object.values(schema).forEach((v: any) => {
        this.updateAdditionalProperties(v, value);
      });
    } else if (_.isArray(schema)) {
      schema.forEach((v: any) => {
        this.updateAdditionalProperties(v, value);
      });
    }
  }
}

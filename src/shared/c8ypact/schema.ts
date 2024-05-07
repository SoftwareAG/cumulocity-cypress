/**
 * Matcher for matching objects against a schema. If the object does not match
 * the schema an Error will be thrown.
 */
export interface C8ySchemaMatcher {
  /**
   * Matches the given object against the given schema. Throws an error when
   * schema does not match. Strict matching controls whether additional properties
   * are allowed in the object.
   *
   * @param obj Object to match.
   * @param schema Schema to match obj against.
   * @param strictMatching If true, additional properties are not allowed.
   */
  match(obj: any, schema: any, strictMatching?: boolean): boolean;
}

/**
 * A C8ySchemaGenerator is used to generate json schemas from json objects.
 */
export interface C8ySchemaGenerator {
  /**
   * Generates a json schema for the given object.
   *
   * @param obj The object to generate the schema for.
   * @param options The options passed to the schema generator.
   */
  generate: (obj: any, options?: any) => Promise<any>;
}

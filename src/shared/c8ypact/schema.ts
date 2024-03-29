import _ from "lodash";

import Ajv, { AnySchemaObject, SchemaObject } from "ajv";
import addFormats from "ajv-formats";

import {
  InputData,
  jsonInputForTargetLanguage,
  quicktype,
} from "quicktype-core";

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
    //https://ajv.js.org/options.html
    this.ajv = new Ajv({ strict: "log" });
    addFormats(this.ajv);

    this.ajv.addFormat("integer", {
      type: "number",
      validate: (x) => _.isInteger(x),
    });

    this.ajv.addFormat("boolean", {
      validate: (x: any) => _.isBoolean(x),
    });

    this.ajv.addFormat("boolean", {
      type: "string",
      validate: (x: any) =>
        _.isString(x) && ["true", "false"].includes(_.lowerCase(x)),
    });

    if (metas && _.isArrayLike(metas)) {
      metas.forEach((m) => {
        this.ajv.addMetaSchema(m);
      });
    }
  }

  match(
    obj: any,
    schema: SchemaObject,
    strictMatching: boolean = true
  ): boolean {
    if (!schema) return false;
    const schemaClone = _.cloneDeep(schema);
    this.updateAdditionalProperties(schemaClone, !strictMatching);

    const valid = this.ajv.validate(schemaClone, obj);
    if (!valid) {
      throw new Error(this.ajv.errorsText());
    }
    return valid;
  }

  protected updateAdditionalProperties(schema: any, value: boolean) {
    if (_.isObjectLike(schema)) {
      if ("additionalProperties" in schema || schema.type === "object") {
        schema.additionalProperties = value;
      }
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

/**
 * C8ySchemaGenerator implementation using quicktype library with target language
 * json-schema. From the generated schema, all non-standard keywords are removed
 * to ensure compatibility with any json-schema validators.
 */
export class C8yQicktypeSchemaGenerator implements C8ySchemaGenerator {
  async generate(obj: any, options: any = {}): Promise<any> {
    const { name } = options;
    const inputData = new InputData();
    const jsonInput = jsonInputForTargetLanguage("json-schema");
    await jsonInput.addSource({
      name: name || "root",
      samples: [JSON.stringify(obj)],
    });
    inputData.addInput(jsonInput);

    const result = await quicktype({
      inputData,
      lang: "json-schema",
    });
    const schema = JSON.parse(result.lines.join("\n"));
    this.removeNonStandardKeywords(schema);
    return schema;
  }

  protected removeNonStandardKeywords(schema: any) {
    for (const key in schema) {
      if (key.startsWith("qt-")) {
        delete schema[key];
      } else if (typeof schema[key] === "object") {
        this.removeNonStandardKeywords(schema[key]);
      }
    }
  }
}

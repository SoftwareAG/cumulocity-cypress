'use strict';

var cypress = require('cypress');
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var _ = require('lodash');
var semver = require('semver');
var Ajv = require('ajv');
var addFormats = require('ajv-formats');
require('ajv/lib/refs/json-schema-draft-06.json');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs);
var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);
var yaml__namespace = /*#__PURE__*/_interopNamespaceDefault(yaml);
var semver__namespace = /*#__PURE__*/_interopNamespaceDefault(semver);

/**
 * Default implementation of C8ySchemaMatcher using AJV. By default
 * json-schema-draft-07 meta schema is used. Other meta schema can be added
 * by passing in constructor. If options.strictMatching is disabled for match,
 * additionalProperties will be set to true allowing additional properties
 * in the object to match the schema.
 */
class C8yAjvSchemaMatcher {
    constructor(metas) {
        //https://ajv.js.org/options.html
        this.ajv = new Ajv({ strict: "log" });
        addFormats(this.ajv, [
            "uri",
            "url",
            "uuid",
            "hostname",
            "date-time",
            "date",
            "password",
        ]);
        this.ajv.addFormat("integer", {
            type: "number",
            validate: (x) => _.isInteger(x),
        });
        this.ajv.addFormat("boolean", {
            validate: (x) => _.isBoolean(x),
        });
        this.ajv.addFormat("boolean", {
            type: "string",
            validate: (x) => _.isString(x) && ["true", "false"].includes(_.lowerCase(x)),
        });
        this.ajv.addFormat("semver-range", {
            type: "string",
            validate: (x) => {
                return semver__namespace.validRange(x) != null;
            },
        });
        this.ajv.addFormat("semver-version", {
            type: "string",
            validate: (x) => {
                return semver__namespace.valid(x) != null;
            },
        });
        if (metas && _.isArrayLike(metas)) {
            metas.forEach((m) => {
                this.ajv.addMetaSchema(m);
            });
        }
    }
    match(obj, schema, strictMatching = true) {
        if (!schema)
            return false;
        const schemaClone = _.cloneDeep(schema);
        this.updateAdditionalProperties(schemaClone, !strictMatching);
        const valid = this.ajv.validate(schemaClone, obj);
        if (!valid) {
            throw new Error(this.ajv.errorsText());
        }
        return valid;
    }
    updateAdditionalProperties(schema, value) {
        if (_.isObjectLike(schema)) {
            if ("additionalProperties" in schema || schema.type === "object") {
                schema.additionalProperties = value;
            }
            Object.values(schema).forEach((v) => {
                this.updateAdditionalProperties(v, value);
            });
        }
        else if (_.isArray(schema)) {
            schema.forEach((v) => {
                this.updateAdditionalProperties(v, value);
            });
        }
    }
}

var $schema = "http://json-schema.org/draft-07/schema#";
var additionalProperties = false;
var definitions = {
	Action: {
		anyOf: [
			{
				additionalProperties: false,
				properties: {
					click: {
						additionalProperties: false,
						properties: {
							selector: {
								$ref: "#/definitions/Selector"
							}
						},
						required: [
							"selector"
						],
						type: "object"
					}
				},
				type: "object"
			},
			{
				additionalProperties: false,
				properties: {
					type: {
						additionalProperties: false,
						properties: {
							selector: {
								$ref: "#/definitions/Selector"
							},
							value: {
								type: "string"
							}
						},
						required: [
							"selector",
							"value"
						],
						type: "object"
					}
				},
				type: "object"
			},
			{
				additionalProperties: false,
				properties: {
					screenshot: {
						additionalProperties: false,
						properties: {
							clip: {
								additionalProperties: false,
								properties: {
									height: {
										type: "number"
									},
									width: {
										type: "number"
									},
									x: {
										type: "number"
									},
									y: {
										type: "number"
									}
								},
								required: [
									"height",
									"width",
									"x",
									"y"
								],
								type: "object"
							},
							path: {
								type: "string"
							},
							selector: {
								anyOf: [
									{
										additionalProperties: false,
										properties: {
											"data-cy": {
												type: "string"
											}
										},
										type: "object"
									},
									{
										type: "string"
									}
								]
							}
						},
						type: "object"
					}
				},
				type: "object"
			},
			{
				additionalProperties: false,
				properties: {
					highlight: {
						anyOf: [
							{
								additionalProperties: false,
								properties: {
									border: {
										type: "string"
									},
									selector: {
										$ref: "#/definitions/Selector"
									},
									styles: {
									},
									text: {
										type: "string"
									}
								},
								required: [
									"selector"
								],
								type: "object"
							},
							{
								items: {
									additionalProperties: false,
									properties: {
										border: {
											type: "string"
										},
										selector: {
											$ref: "#/definitions/Selector"
										},
										styles: {
										},
										text: {
											type: "string"
										}
									},
									required: [
										"selector"
									],
									type: "object"
								},
								type: "array"
							}
						]
					}
				},
				type: "object"
			}
		]
	},
	Screenshot: {
		additionalProperties: false,
		properties: {
			date: {
				examples: [
					"2024-09-26T19:17:35+02:00"
				],
				format: "date-time",
				type: "string"
			},
			"do": {
				anyOf: [
					{
						additionalProperties: false,
						properties: {
							click: {
								additionalProperties: false,
								properties: {
									selector: {
										$ref: "#/definitions/Selector"
									}
								},
								required: [
									"selector"
								],
								type: "object"
							}
						},
						type: "object"
					},
					{
						additionalProperties: false,
						properties: {
							type: {
								additionalProperties: false,
								properties: {
									selector: {
										$ref: "#/definitions/Selector"
									},
									value: {
										type: "string"
									}
								},
								required: [
									"selector",
									"value"
								],
								type: "object"
							}
						},
						type: "object"
					},
					{
						additionalProperties: false,
						properties: {
							screenshot: {
								additionalProperties: false,
								properties: {
									clip: {
										additionalProperties: false,
										properties: {
											height: {
												type: "number"
											},
											width: {
												type: "number"
											},
											x: {
												type: "number"
											},
											y: {
												type: "number"
											}
										},
										required: [
											"height",
											"width",
											"x",
											"y"
										],
										type: "object"
									},
									path: {
										type: "string"
									},
									selector: {
										anyOf: [
											{
												additionalProperties: false,
												properties: {
													"data-cy": {
														type: "string"
													}
												},
												type: "object"
											},
											{
												type: "string"
											}
										]
									}
								},
								type: "object"
							}
						},
						type: "object"
					},
					{
						additionalProperties: false,
						properties: {
							highlight: {
								anyOf: [
									{
										additionalProperties: false,
										properties: {
											border: {
												type: "string"
											},
											selector: {
												$ref: "#/definitions/Selector"
											},
											styles: {
											},
											text: {
												type: "string"
											}
										},
										required: [
											"selector"
										],
										type: "object"
									},
									{
										items: {
											additionalProperties: false,
											properties: {
												border: {
													type: "string"
												},
												selector: {
													$ref: "#/definitions/Selector"
												},
												styles: {
												},
												text: {
													type: "string"
												}
											},
											required: [
												"selector"
											],
											type: "object"
										},
										type: "array"
									}
								]
							}
						},
						type: "object"
					},
					{
						items: {
							$ref: "#/definitions/Action"
						},
						type: "array"
					}
				]
			},
			image: {
				type: "string"
			},
			language: {
				description: "The language to use for taking screenshots",
				"enum": [
					"de",
					"en"
				],
				type: "string"
			},
			only: {
				type: "boolean"
			},
			requires: {
				anyOf: [
					{
						items: {
							type: "string"
						},
						type: "array"
					},
					{
						type: "string"
					}
				]
			},
			settings: {
				additionalProperties: false,
				properties: {
					capture: {
						description: "The type of capturing the screenshot. When fullPage is used, the application is captured in its entirety from top to bottom. Setting is ignored when screenshots are taken for a selected element.",
						"enum": [
							"fullPage",
							"viewport"
						],
						type: "string"
					},
					disableTimersAndAnimations: {
						type: "boolean"
					},
					overwrite: {
						type: "boolean"
					},
					padding: {
						type: "number"
					},
					scale: {
						type: "number"
					},
					viewportHeight: {
						"default": 1080,
						description: "The height in px to use for the browser window",
						minimum: 0,
						type: "integer"
					},
					viewportWidth: {
						"default": 1920,
						description: "The width in px to use for the browser window",
						minimum: 0,
						type: "integer"
					}
				},
				type: "object"
			},
			shell: {
				description: "The shell is used to dermine the version of the application used by \"requires\" (optional)",
				examples: [
					"cockpit, devicemanagement, oee"
				],
				type: "string"
			},
			skip: {
				type: "boolean"
			},
			tags: {
				description: "Tags allow grouping and filtering of screenshots (optional)",
				items: {
					type: "string"
				},
				type: "array"
			},
			user: {
				description: "The user to login representing the env variabls of type *user*_username and *user*_password",
				type: "string"
			},
			visit: {
				anyOf: [
					{
						$ref: "#/definitions/Visit"
					},
					{
						type: "string"
					}
				]
			}
		},
		required: [
			"image",
			"visit"
		],
		type: "object"
	},
	Selector: {
		anyOf: [
			{
				additionalProperties: false,
				properties: {
					"data-cy": {
						type: "string"
					}
				},
				type: "object"
			},
			{
				type: "string"
			}
		]
	},
	Visit: {
		additionalProperties: false,
		properties: {
			date: {
				examples: [
					"2024-09-26T19:17:35+02:00"
				],
				format: "date-time",
				type: "string"
			},
			language: {
				description: "The language to use for taking screenshots",
				"enum": [
					"de",
					"en"
				],
				type: "string"
			},
			selector: {
				type: "string"
			},
			timeout: {
				type: "number"
			},
			url: {
				type: "string"
			},
			user: {
				description: "The user to login representing the env variabls of type *user*_username and *user*_password",
				type: "string"
			}
		},
		required: [
			"url"
		],
		type: "object"
	}
};
var properties = {
	baseUrl: {
		format: "uri",
		type: "string"
	},
	global: {
		additionalProperties: false,
		properties: {
			capture: {
				description: "The type of capturing the screenshot. When fullPage is used, the application is captured in its entirety from top to bottom. Setting is ignored when screenshots are taken for a selected element.",
				"enum": [
					"fullPage",
					"viewport"
				],
				type: "string"
			},
			date: {
				examples: [
					"2024-09-26T19:17:35+02:00"
				],
				format: "date-time",
				type: "string"
			},
			disableTimersAndAnimations: {
				type: "boolean"
			},
			language: {
				description: "The language to use for taking screenshots",
				"enum": [
					"de",
					"en"
				],
				type: "string"
			},
			overwrite: {
				type: "boolean"
			},
			padding: {
				type: "number"
			},
			requires: {
				description: "The required semver version range of the shell applications. If the shell version does not satisfy the range, the screenshot is skipped. (optional)",
				examples: [
					"1.x, ^1.0.0, >=1.0.0 <2.0.0"
				],
				format: "semver-range",
				type: "string"
			},
			scale: {
				type: "number"
			},
			shell: {
				description: "The shell is used to dermine the version of the application used by \"requires\" (optional)",
				examples: [
					"cockpit, devicemanagement, oee"
				],
				type: "string"
			},
			tags: {
				description: "Tags allow grouping and filtering of screenshots (optional)",
				items: {
					type: "string"
				},
				type: "array"
			},
			user: {
				description: "The user to login representing the env variabls of type *user*_username and *user*_password",
				type: "string"
			},
			viewportHeight: {
				"default": 1080,
				description: "The height in px to use for the browser window",
				minimum: 0,
				type: "integer"
			},
			viewportWidth: {
				"default": 1920,
				description: "The width in px to use for the browser window",
				minimum: 0,
				type: "integer"
			}
		},
		type: "object"
	},
	screenshots: {
		items: {
			$ref: "#/definitions/Screenshot"
		},
		type: "array"
	},
	title: {
		description: "The title used for root Cypress suite",
		type: "string"
	}
};
var required = [
	"baseUrl",
	"screenshots"
];
var type = "object";
var schema = {
	$schema: $schema,
	additionalProperties: additionalProperties,
	definitions: definitions,
	properties: properties,
	required: required,
	type: type
};

function readYamlFile(filePath) {
    const fileContent = fs__namespace.readFileSync(filePath, "utf-8");
    const data = yaml__namespace.load(fileContent);
    return data;
}
var config = cypress.defineConfig({
    e2e: {
        baseUrl: "http://localhost:8080",
        supportFile: false,
        video: false,
        setupNodeEvents(on, config) {
            const filePath = config.env._c8yScreenshotConfig;
            if (!filePath) {
                return config;
            }
            if (!schema) {
                throw new Error(`Failed to validate ${filePath}. No schema found for validation. Please check the schema.json file.`);
            }
            const configData = readYamlFile(filePath);
            const ajv = new C8yAjvSchemaMatcher();
            ajv.match(configData, schema, true);
            config.env._autoScreenshot = configData;
            config.baseUrl = configData.global?.baseUrl ?? config.baseUrl;
            // https://github.com/cypress-io/cypress/issues/27260
            on("before:browser:launch", (browser, launchOptions) => {
                if (browser.name === "chrome") {
                    const viewportWidth = configData.global?.viewportWidth ?? 1920;
                    const viewportHeight = configData.global?.viewportHeight ?? 1080;
                    launchOptions.args.push(`--window-size=${viewportWidth},${viewportHeight} --headless=old`);
                }
                return launchOptions;
            });
            on("after:screenshot", (details) => {
                console.log("Screenshot details", details);
                return new Promise((resolve, reject) => {
                    const newPath = details.specName.trim() == ""
                        ? details.path
                        : details.path?.replace(`${details.specName}${path__namespace.sep}`, "");
                    const folder = newPath?.split(path__namespace.sep).slice(0, -1).join(path__namespace.sep);
                    if (folder && !fs__namespace.existsSync(folder)) {
                        const result = fs__namespace.mkdirSync(folder, { recursive: true });
                        if (!result) {
                            reject(`Failed to create folder ${folder}`);
                        }
                    }
                    if (!folder) {
                        resolve({
                            path: details.path,
                            size: details.size,
                            dimensions: details.dimensions,
                        });
                    }
                    fs__namespace.rename(details.path, newPath, (err) => {
                        if (err)
                            return reject(err);
                        resolve({
                            path: newPath,
                            size: details.size,
                            dimensions: details.dimensions,
                        });
                    });
                });
            });
            return config;
        },
    },
});

module.exports = config;

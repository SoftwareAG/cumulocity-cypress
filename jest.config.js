module.exports = {
  projects: [
    {
      roots: ["<rootDir>/src", "<rootDir>/packages/pact-http-controller"],
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            tsconfig: "<rootDir>/tsconfig.spec.json",
          },
        ],
      },
      testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
      moduleNameMapper: {
        "^cumulocity-cypress/(.*)$": "<rootDir>/src/$1",
      },
    },
  ],
};

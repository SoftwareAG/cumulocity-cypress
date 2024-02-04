export {};

if (!Cypress.c8ypact) {
  Cypress.c8ypact = {
    current: null,
    getCurrentTestId: () => null,
    isRecordingEnabled: () => false,
    savePact: (...args) => new Promise((resolve) => resolve()),
    isEnabled: () => false,
    matcher: undefined,
    urlMatcher: undefined,
    pactRunner: undefined,
    schemaGenerator: undefined,
    schemaMatcher: undefined,
    debugLog: false,
    preprocessor: undefined,
    config: {},
    getConfigValue: (key: string, defaultValue?: any) => undefined,
    getConfigValues: () => undefined,
    loadCurrent: () => cy.wrap<C8yPact | null>(null, { log: false }),
  };
}

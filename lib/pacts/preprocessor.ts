const { _ } = Cypress;

export class C8yPactDefaultPreprocessor implements C8yPactPreprocessor {
  constructor() {}

  preprocess(obj?: any): void {
    if (obj?.requestHeaders?.Authorization) {
      _.set(obj, "requestHeaders.Authorization", "Basic ********");
    }
    if (obj?.requestHeaders && obj?.requestHeaders["X-XSRF-TOKEN"]) {
      _.set(obj, "requestHeaders.X-XSRF-TOKEN", "********");
    }
    if (obj?.body?.password) {
      _.set(obj, "body.password", "********");
    }
  }
}

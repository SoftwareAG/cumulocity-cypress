const { _ } = Cypress;

declare global {
  interface C8yPactRunner {
    run: (pacts: any) => void;
    runTest: (title: string, pact: any, info: any) => void;
  }
}

export class C8yDefaultPactRunner implements C8yPactRunner {
  constructor() {}

  protected idMapper: { [key: string]: string } = {};

  run(pacts: any): void {
    this.idMapper = {};

    if (!_.isPlainObject(pacts)) return;
    if (!Cypress.c8ypact.isRunnerEnabled) return;

    const tests = [];
    const keys = Object.keys(pacts);
    for (const key of keys) {
      const { info, pact, id } = pacts[key];
      if (!_.isPlainObject(info) || !_.isArray(pact) || !_.isString(id)) {
        continue;
      }

      const titlePath: string[] = info?.title || info?.id?.split("__");
      tests.push({ info, pact, id, title: titlePath });
    }

    const testHierarchy = this.buildTestHierarchy(tests);
    this.createTestsFromHierarchy(testHierarchy);
  }

  protected buildTestHierarchy(pacts: any) {
    const tree = {};
    pacts.forEach((obj: any) => {
      const titles = obj.title;

      let currentNode: any = tree;
      titles.forEach((title: any, index: any) => {
        if (!currentNode[title]) {
          currentNode[title] = index === titles.length - 1 ? obj : {};
        }
        currentNode = currentNode[title];
      });
    });

    return tree;
  }

  protected createTestsFromHierarchy(obj: any) {
    const keys = Object.keys(obj);
    keys.forEach((key: string, index: number) => {
      const isLastKey = obj[key].pact != null && obj[key].info != null;
      const that = this;

      if (isLastKey) {
        it(key, () => {
          that.runTest(key, obj[key].pact, obj[key].info);
        });
      } else {
        context(key, function () {
          that.createTestsFromHierarchy(obj[key]);
        });
      }
    });
  }

  runTest(title: string, pact: any, info: any) {
    this.idMapper = {};

    if (!_.isArray(pact)) return;

    for (const currentPact of pact) {
      cy.then(() => {
        const url = this.createURL(currentPact, info);
        const options = this.createFetchOptions(currentPact, info);

        let user = currentPact.auth.userAlias || currentPact.auth.user;
        if (user.split("/").length > 1) {
          user = user.split("/").slice(1).join("/");
        }
        if (url === "/devicecontrol/deviceCredentials") {
          user = "devicebootstrap";
        }

        const cOpts = {
          pact: currentPact,
          ..._.pick(currentPact.options, [
            "skipClientAuthenication",
            "preferBasicAuth",
            "failOnStatusCode",
            "timeout",
          ]),
        };

        const responseFn = (response: Cypress.Response<any>) => {
          if (
            url === "/devicecontrol/deviceCredentials" &&
            response.status === 201
          ) {
            const { username, password } = response.body;
            if (username && password) {
              Cypress.env(`${username}_username`, username);
              Cypress.env(`${username}_password`, password);
            }
          }
          // @ts-ignore
          if (response.method === "POST") {
            const newId = response.body.id;
            if (newId) {
              this.idMapper[currentPact.createdObject] = newId;
              console.log(this.idMapper);
            }
          }
        };

        if (currentPact.auth && currentPact.auth.type === "CookieAuth") {
          cy.getAuth(user).login();
          cy.c8yclient((c) => c.core.fetch(url, options), cOpts).then(
            responseFn
          );
        } else {
          cy.getAuth(user)
            .c8yclient((c) => c.core.fetch(url, options), cOpts)
            .then(responseFn);
        }
      });
    }
  }

  protected createHeader(pact: any, info: any): any {
    let headers = _.omit(pact.requestHeaders || {}, [
      "X-XSRF-TOKEN",
      "Authorization",
    ]);
    return headers;
  }

  protected createFetchOptions(pact: any, info: any): any {
    let options: any = {
      method: pact.method || "GET",
      headers: this.createHeader(pact, info),
    };
    let body = pact.requestBody;
    if (body) {
      if (_.isString(body)) {
        options.body = this.updateIds(body);
        options.body = this.updateURLs(options.body, info);
      } else if (_.isObject(body)) {
        let b = JSON.stringify(body);
        b = this.updateIds(b);
        b = this.updateURLs(b, info);
        options.body = b;
      }
    }
    return options;
  }

  protected createURL(pact: any, info: any): string {
    let url = pact.url;
    if (info?.baseUrl && url.includes(info.baseUrl)) {
      url = url.replace(info.baseUrl, "");
    }
    if (url.includes(Cypress.config().baseUrl)) {
      url = url.replace(Cypress.config().baseUrl, "");
    }
    url = this.updateIds(url);
    return url;
  }

  protected updateURLs(value: string, info: any): string {
    if (!value || !info) return value;
    let result = value;
    let updateTenantUrls = true;

    const tenantUrl = (baseUrl: string, tenant: string): URL => {
      if (!baseUrl || !tenant) return undefined;
      try {
        const url = new URL(baseUrl);
        const instance = url.host.split(".")?.slice(1)?.join(".");
        url.host = `${tenant}.${instance}`;
        return url;
      } catch {}
      return undefined;
    };

    const infoUrl = tenantUrl(info.baseUrl, info.tenant);
    const url = tenantUrl(Cypress.config().baseUrl, Cypress.env("C8Y_TENANT"));

    if (infoUrl && url) {
      const regexp = new RegExp(`${infoUrl.href}`, "g");
      result = result.replace(regexp, url.href);
    }

    if (Cypress.config().baseUrl && info.baseUrl) {
      const regexp = new RegExp(`${info.baseUrl}`, "g");
      result = result.replace(regexp, Cypress.config().baseUrl);
    }
    if (info.tenant && Cypress.env("C8Y_TENANT")) {
      const regexp = new RegExp(`${info.tenant}`, "g");
      result = result.replace(regexp, Cypress.env("C8Y_TENANT"));
    }
    return result;
  }

  protected updateIds(value: string): string {
    if (!value || !this.idMapper) return value;
    let result = value;
    for (const currentId of Object.keys(this.idMapper)) {
      const regexp = new RegExp(`${currentId}`, "g");
      result = result.replace(regexp, this.idMapper[currentId]);
    }
    return result;
  }
}

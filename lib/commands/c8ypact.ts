import { Client } from "@c8y/client";
import { C8yDefaultPactMatcher } from "../pacts/matcher";
import { C8yPactDefaultPreprocessor } from "../pacts/preprocessor";
const { _ } = Cypress;

declare global {
  namespace Cypress {
    interface Cypress {
      c8ypact: C8yPact;
    }

    interface TestConfigOverrides {
      c8ypact?: C8yPactConfigOptions;
    }

    interface RuntimeConfigOptions {
      c8ypact?: C8yPactConfigOptions;
    }
  }

  interface C8yPactConfigOptions {
    id?: string;
    ignore?: boolean;
    log?: boolean;
    matcher?: C8yPactMatcher;
  }

  interface C8yPact {
    matcher: C8yPactMatcher;
    preprocessor: C8yPactPreprocessor;
    currentPactIdentifier: () => string;
    currentPactFilename: () => string;
    currentNextPact: <
      T = any
    >() => Cypress.Chainable<Cypress.Response<T> | null>;
    currentPacts: () => Cypress.Chainable<Cypress.Response<any>[] | null>;
    currentMatcher: () => C8yPactMatcher;
    savePact: (response: Cypress.Response<any>) => void;
    isEnabled: () => boolean;
    isRecordingEnabled: () => boolean;
    isRunnerEnabled: () => boolean;
    failOnMissingPacts: boolean;
    strictMatching: boolean;
    pactRunner: (pacts: any) => void;
  }

  interface C8yPactMatcher {
    match: (
      obj1: unknown,
      obj2: unknown,
      loggerProps?: { [key: string]: any }
    ) => boolean;
  }

  interface C8yPactPreprocessor {
    preprocess: (obj1: unknown) => void;
  }
}

Cypress.c8ypact = {
  currentPactIdentifier: pactIdentifier,
  currentMatcher,
  currentPacts,
  currentPactFilename,
  currentNextPact: getNextPact,
  isRecordingEnabled,
  isRunnerEnabled,
  savePact,
  isEnabled,
  matcher: new C8yDefaultPactMatcher(),
  preprocessor: new C8yPactDefaultPreprocessor(),
  failOnMissingPacts: true,
  strictMatching: true,
  pactRunner,
};

const logTasks = false;

before(() => {
  const pacter = Cypress.c8ypact;
  if (!pacter.isRecordingEnabled() && !pacter.isRunnerEnabled()) {
    cy.task("c8ypact:load", Cypress.config().fixturesFolder, { log: logTasks });
  }
});

beforeEach(() => {
  if (Cypress.c8ypact.isEnabled() && Cypress.c8ypact.isRecordingEnabled()) {
    cy.task("c8ypact:remove", Cypress.c8ypact.currentPactIdentifier(), {
      log: logTasks,
    });
  }
});

function pactIdentifier(): string {
  let key = Cypress.currentTest?.titlePath?.join("__");
  if (key == null) {
    key = Cypress.spec?.relative?.split("/").slice(-2).join("__");
  }
  const pact = Cypress.config().c8ypact;
  return (pact && pact.id) || key.replace(/ /g, "_");
}

function currentMatcher(): C8yPactMatcher {
  const pact = Cypress.config().c8ypact;
  return (pact && pact.matcher) || Cypress.c8ypact.matcher;
}

function isEnabled(): boolean {
  return Cypress.env("C8Y_PACT_ENABLED") != null;
}

function isRecordingEnabled(): boolean {
  return isEnabled() && Cypress.env("C8Y_PACT_MODE") === "recording";
}

function isRunnerEnabled(): boolean {
  return isEnabled() && Cypress.env("C8Y_PACT_MODE") === "runner";
}

function savePact(response: Cypress.Response<any>, client?: Client) {
  if (!isEnabled()) {
    return;
  }
  const pact = Cypress.c8ypact.currentPactIdentifier();
  if (pact) {
    const info = {
      title: Cypress.currentTest?.titlePath || [],
      id: pact,
      tenant: client.core.tenant || Cypress.env("C8Y_TENANT"),
      baseUrl: Cypress.config().baseUrl,
    };
    const folder = Cypress.config().fixturesFolder;
    const preprocessedResponse = _.cloneDeep(response);
    Cypress.c8ypact.preprocessor.preprocess(preprocessedResponse);
    cy.task(
      "c8ypact:save",
      {
        pact,
        response: preprocessedResponse,
        folder,
        info,
      },
      { log: logTasks }
    );
  }
}

function currentPacts(): Cypress.Chainable<Cypress.Response<any>[] | null> {
  return !isEnabled()
    ? cy.wrap<Cypress.Response<any>[] | null>(null, { log: false })
    : cy.task<Cypress.Response<any>[]>(
        "c8ypact:get",
        Cypress.c8ypact.currentPactIdentifier(),
        {
          log: logTasks,
        }
      );
}

function currentPactFilename(): string {
  const pactId = Cypress.c8ypact.currentPactIdentifier();
  return `${Cypress.config().fixturesFolder}/c8ypact/${pactId}.json`;
}

function getNextPact(): Cypress.Chainable<Cypress.Response<any> | null> {
  return !isEnabled()
    ? cy.wrap<Cypress.Response<any> | null>(null)
    : cy.task("c8ypact:next", Cypress.c8ypact.currentPactIdentifier(), {
        log: logTasks,
      });
}

function pactRunner(pacts: any): void {
  if (!_.isPlainObject(pacts)) return;
  if (!Cypress.c8ypact.isRunnerEnabled) return;

  const tests = [];
  const keys = Object.keys(pacts);
  for (const key of keys) {
    const { info, pact, id } = pacts[key];
    const titlePath: string[] = info?.title || info?.id?.split("__");
    tests.push({ info, pact, id, title: titlePath });
  }

  const testHierarchy = buildTestHierarchy(tests);
  createTestsFromHierarchy(testHierarchy);
}

function buildTestHierarchy(pacts: any) {
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

function createTestsFromHierarchy(obj: any) {
  const keys = Object.keys(obj);
  keys.forEach((key: string, index: number) => {
    const isLastKey = obj[key].pact != null && obj[key].info != null;
    if (isLastKey) {
      createTestCase(key, obj[key].pact, obj[key].info);
    } else {
      context(key, function () {
        createTestsFromHierarchy(obj[key]);
      });
    }
  });
}

function createTestCase(title: string, pact: any, info: any): Mocha.Test {
  return it(title, () => {
    Cypress.session.clearAllSavedSessions();
    const idMapper: { [key: string]: any } = {};

    if (_.isArray(pact)) {
      for (const currentPact of pact) {
        cy.then(() => {
          const url = pactRunnerURL(currentPact, info, idMapper);
          const options = pactRunnerOptions(currentPact, info, idMapper);
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
                idMapper[currentPact.createdObject] = newId;
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
  });
}

function pactRunnerHeader(pact: any, info: any): any {
  let headers = _.omit(pact.requestHeaders || {}, [
    "X-XSRF-TOKEN",
    "Authorization",
  ]);
  return headers;
}

function pactRunnerOptions(
  pact: any,
  info: any,
  idMapper: { [key: string]: string }
): any {
  let options: any = {
    method: pact.method || "GET",
    headers: pactRunnerHeader(pact, info),
  };
  let body = pact.requestBody;
  if (body) {
    if (_.isString(body)) {
      options.body = updateIds(body, idMapper);
      options.body = updateUrls(options.body, info);
    } else if (_.isObject(body)) {
      let b = JSON.stringify(body);
      b = updateIds(b, idMapper);
      b = updateUrls(b, info);
      options.body = b;
    }
  }
  return options;
}

function pactRunnerURL(
  pact: any,
  info: any,
  idMapper: { [key: string]: string }
): string {
  let url = pact.url;
  if (info?.baseUrl && url.includes(info.baseUrl)) {
    url = url.replace(info.baseUrl, "");
  }
  if (url.includes(Cypress.config().baseUrl)) {
    url = url.replace(Cypress.config().baseUrl, "");
  }
  url = updateIds(url, idMapper);
  return url;
}

function updateUrls(value: string, info: any): string {
  if (!value || !info) return value;
  let result = value;
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

function updateIds(value: string, idMapper: { [key: string]: string }): string {
  if (!value || !idMapper) return value;
  let result = value;
  for (const currentId of Object.keys(idMapper)) {
    const regexp = new RegExp(`${currentId}`, "g");
    result = result.replace(regexp, idMapper[currentId]);
  }
  return result;
}

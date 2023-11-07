import { BasicAuth, IManagedObject, IResult } from "@c8y/client";
import { getAuthOptionsFromBasicAuthHeader } from "./utils";

export {};

const { _ } = Cypress;

declare global {
  namespace Cypress {
    interface Chainable {
      c8ysession(session: string): Chainable<C8ySession>;
    }

    interface SuiteConfigOverrides {
      c8yid: string;
    }

    interface TestConfigOverrides {
      c8yid: string;
    }

    interface RuntimeConfigOptions {
      c8yid: string;
    }

    interface Cypress {}
  }

  interface C8yDataSession {
    name: string;
    objects<T>(type?: string): C8yDataResponse<T>[];
    clear: (type?: string) => void;
    store(): boolean;
    restore(): boolean;
    log(): void;
    teardown(): Cypress.Chainable<boolean>;
  }

  interface C8yDataResponse<BodyType = any> {
    headers: Record<string, string | number | boolean>;
    requestHeaders: Record<string, string | number | boolean>;
    body: BodyType;
    redirected: boolean;
    status: number;
    statusText: string;
    isOkStatusCode: boolean;
    url: string;
    duration: number;
  }
}

Cypress.Commands.add("c8ysession", (name: string) => {
  cy.task<C8yDataResponse[]>("c8ySession:load", name, { log: false }).then(
    (data) => {
      return cy.wrap(new C8ySession(name, _.isArray(data) ? data : [data]), {
        log: false,
      });
    }
  );
});

const logTasks = false;

class C8ySession implements C8yDataSession {
  constructor(public name: string, private data: C8yDataResponse[]) {}

  log() {
    cy.then(() => {
      const consoleProps = {
        name: this.name,
        data: this.data,
      };
      Cypress.log({
        name: "c8ySession",
        message: this.name,
        consoleProps: () => consoleProps,
      });
    });
  }

  clear() {
    cy.then(() => {
      cy.task<C8yDataResponse[]>("c8ySession:clearAll", undefined, {
        log: logTasks,
      }).then((newValue) => {
        this.data = newValue;
      });
    });
  }

  objects<T>(type: string = null): C8yDataResponse<T>[] {
    if (!type || _.isEmpty(type)) return this.data;
    const result = this.data.filter((o) => {
      const contentType = (o.headers && o.headers["content-type"]) || "";
      const uri = o.url.replace(Cypress.config().baseUrl, "");
      return (
        contentType === type ||
        (_.isString(contentType) && contentType.includes(type)) ||
        uri === type
      );
    });
    return result;
  }

  teardown() {
    // managed objects
    const responses: C8yDataResponse<IManagedObject>[] = this.objects(
      "/inventory/managedObjects"
    );
    for (const response of responses) {
      if (_.has(response.requestHeaders, "Authorization")) {
        const base64auth = _.get(
          response.requestHeaders,
          "Authorization"
        ).toString();
        const authOptions = getAuthOptionsFromBasicAuthHeader(base64auth);
        cy.c8yclient((client) => client.inventory.delete(response.body.id), {
          auth: authOptions ? new BasicAuth(authOptions) : undefined,
          preferBasicAuth: authOptions != null,
          failOnStatusCode: authOptions != null,
        });
      }
    }

    return cy.wrap(true);
  }

  store(): boolean {
    throw new Error("Method not implemented.");
  }

  restore(): boolean {
    throw new Error("Method not implemented.");
  }
}

export {};

const { _ } = Cypress;

declare global {
  namespace Cypress {
    interface Chainable {
      c8yclean(session: string | C8ySession): Chainable<boolean>;

      c8ysession(session: string): Chainable<C8ySession>;
    }

    interface Cypress {}
  }

  interface C8yDataSession {
    name: string;
    objects: (type?: string) => C8yDataResponse[];
    clear: (type?: string) => void;
    store(): boolean;
    restore(): boolean;
    log(): void;
  }

  interface C8yDataResponse {
    headers: Record<string, string | number | boolean>;
    body: string;
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

  objects(type: string = null) {
    if (!type || _.isEmpty(type)) return this.data;
    const result = this.data.filter((o) => {
      debugger;
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

  store(): boolean {
    throw new Error("Method not implemented.");
  }

  restore(): boolean {
    throw new Error("Method not implemented.");
  }
}

import { SinonSpyCall } from "cypress/types/sinon";
const { _ } = Cypress;

declare global {
  interface Window {
    fetchStub: Cypress.Agent<sinon.SinonStub>;
  }
}

/**
 * Create an absolute url from the given relative path. Will use `baseUrl` configured
 * in cypress.config.ts.
 *
 * @param {string} path relative path
 * @param {string} baseUrl base URL. if undefined config baseUrl will be used
 * @returns absolute url for the given path
 */
export function url(
  path: string,
  baseUrl: string = Cypress.config().baseUrl
): string {
  if (baseUrl && !baseUrl.toLowerCase().startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }
  return `${baseUrl}${path}`;
}

/**
 * Init stubbing requests. Must be called before `stubResponse()`, for example
 * in `beforeEach` hook of your tests.
 */
export function initRequestStub(): void {
  cy.stub(Cypress, "backend").callThrough();
  cy.stub(window, "fetchStub");
}

type StubbedResponseType<T> =
  | Partial<Cypress.Response<Partial<T>>> // cy.request response type
  | Partial<Response>; // window.fetch response type

/**
 * Stub responses for `cy.request()`. Pass an array of response objects
 * in the order requests are expected.
 *
 * @example
 * stubResponse<IUserGroup>([{
 *   isOkStatusCode: true,
 *   status: 201,
 *   body: {
 *     name: "business",
 *   },
 * },
 * ...
 * );
 *
 * @param {StubbedResponseType<T>[]} responses response or array of response objects
 */
export function stubResponses<T>(responses: StubbedResponseType<T>[]): void {
  let all = _.isArray(responses) ? responses : [responses];
  all.forEach((response, index) => {
    stubResponse<T>(response, index);
  });
}

/**
 * Stub response for a `cy.request()`. If more than one request needs to be
 * stubbed, pass the `callIndex` with the position in the expected sequence.
 *
 * @example
 * stubResponse<IUserGroup>({
 *   isOkStatusCode: true,
 *   status: 201,
 *   body: {
 *     name: "business",
 *   },
 * }, 3);
 *
 * @param {StubbedResponseType<T>} response the response objects
 */
export function stubResponse<T>(
  response: StubbedResponseType<T>,
  callIndex: number = 0
): void {
  Cypress.backend
    // @ts-ignore
    .withArgs("http:request", Cypress.sinon.match.any)
    .onCall(callIndex)
    .resolves(response);
  if (!response.status || response.status < 400) {
    window.fetchStub.onCall(callIndex).resolves(response);
  } else {
    window.fetchStub.onCall(callIndex).rejects(response);
  }
}

/**
 * Assert a request sent by cy.request.
 *
 * Pass expected requests in the order requests should be received. Options are
 * matched with deep equality.
 *
 * @example
 * expectHttpRequest([
 *   {
 *     url: url(`/user/t12345627/users`),
 *     method: "POST",
 *     auth: { user: "admin", password: "password" },
 *     ...
 *   },
 *   ...
 * ]);
 * @param {any | any[]} expectedOptions options to be used for assertions
 * @returns array of arguments for each request used for asserting `expectedOptions`
 */
export function expectHttpRequest(expectedOptions: any | any[]): any[] {
  let all = _.isArray(expectedOptions) ? expectedOptions : [expectedOptions];
  expect(Cypress.backend).to.have.callCount(all.length);

  // @ts-ignore
  const calls: SinonSpyCall<any, any>[] = Cypress.backend.getCalls(
    Array<SinonSpyCall<any, any>>
  );
  const requests = calls
    .filter((call) => _.isArray(call.args) && call.args[0] === "http:request")
    .map((call) => {
      call.args = call.args.length > 1 ? call.args[1] : {};
      return call;
    });

  return expectCallsWithArgs(requests, all);
}

/**
 * Assert a request sent by c8y/client.
 *
 * Pass expected requests in the order requests should be received. Options are
 * matched with deep equality.
 *
 * @example
 * expectHttpRequest([
 *   {
 *     url: url(`/user/t12345627/users`),
 *     auth: { user: "admin", password: "password" },
 *     headers: {
 *       'content-type': 'application/json,
 *       UseXBasic: true,
 *     }
 *     ...
 *   },
 *   ...
 * ]);
 * @param {any | any[]} expectedOptions options to be used for assertions
 * @returns array of arguments for each request used for asserting `expectedOptions`
 */
export function expectC8yClientRequest(
  expectedOptions: any | any[],
  defaultOptions: any = {
    headers: {
      "content-type": "application/json",
      UseXBasic: true,
    },
  }
): any[] {
  let all = (
    _.isArray(expectedOptions) ? expectedOptions : [expectedOptions]
  ).map((options) => {
    const url = options.url;

    const result: any = _.omit(options, ["url", "headers", "auth"]);
    result.headers = _.cloneDeep(options.headers) || {};
    if (options.auth && !result.headers.Authorization) {
      const tenant = options.auth.tenant ? options.auth.tenant + "/" : "";
      const user = `${tenant}${options.auth.user}`;
      result.headers.Authorization = `Basic ${Buffer.from(
        user + ":" + options.auth.password
      ).toString("base64")}`;
    }
    _.defaultsDeep(result, defaultOptions);

    // window.fetch gets 2 arguments url and options
    return [url, result];
  });

  expect(window.fetchStub).to.have.callCount(all.length);
  const calls = window.fetchStub.getCalls();
  return expectCallsWithArgs(calls, all);
}

function expectCallsWithArgs(
  requests: SinonSpyCall<any, any>[],
  expected: any[]
): any[] {
  expect(
    requests.length === expected.length,
    `expected options count should match received request count (${requests.length} !== ${expected.length})`
  ).to.be.true;

  requests.forEach((request, index: number) => {
    _.each(expected[index], (value, key) => {
      // expect(_.isEqual(expected[index][key], request.args[key])).to.be.true;
      // if (_.isObject(expected[index][key])) {
      //   _.each(expected[index][key], (subvalue, subkey) => {
      //     // this solution shows both values if failing and not just Object(...)
      //     if (expected[index][key][subkey]) {
      //       expect(
      //         Object.entries(expected[index][key][subkey]).sort().toString()
      //       ).to.equal(
      //         Object.entries(request.args[key][subkey]).sort().toString()
      //       );
      //     }
      //   });
      // } else {
      // console.log(JSON.stringify(expected[index][key]));
      // console.log(JSON.stringify(request.args[key]));
      expect(expected[index][key]).to.deep.equal(request.args[key]);
      // }
    });
  });

  return expected;
}

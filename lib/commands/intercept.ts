import { C8yDefaultPact } from "../pacts/c8ypact";
import {
  HTTP_METHODS,
  STATIC_RESPONSE_KEYS,
  STATIC_RESPONSE_WITH_OPTIONS_KEYS,
} from "../pacts/constants";

const { _ } = Cypress;

// see documentation fo cy.intercept at https://docs.cypress.io/api/commands/intercept
Cypress.Commands.overwrite("intercept", (originalFn, ...args) => {
  if (!args || _.isEmpty(args)) return originalFn(...args);

  const method =
    _.isString(args[0]) && HTTP_METHODS.includes(args[0].toUpperCase())
      ? args[0]
      : undefined;
  const matcher = method ? args[1] : args[0];
  let response = method ? args[2] : args[1];

  let updatedArgs: any[] = [];
  if (method) {
    updatedArgs.push(method);
  }
  if (matcher) {
    updatedArgs.push(matcher);
  }
  if (response) {
    try {
      if (typeof response === "function") {
        response = wrapFunctionRouteHandler(response);
      } else {
        response = wrapStaticResponse(response);
      }
    } catch (error) {
      console.log(`Failed to intercept response: ${error}`);
    }
    updatedArgs.push(response);
  } else {
    response = wrapEmptyRoutHandler();
    updatedArgs.push(response);
  }

  // @ts-ignore
  return originalFn(...updatedArgs);
});

Cypress.env("C8Y_PACT_INTERCEPT_ENABLED", true);

Cypress.on("log:intercept", (options) => {
  if (!Cypress.c8ypact.isRecordingEnabled()) return;
  const { req, res, modified } = options;

  const cypressResponse = toCypressResponse(req, res);
  const modifiedResponse =
    modified != null ? toCypressResponse(req, modified) : undefined;

  Cypress.c8ypact.savePact(
    cypressResponse,
    // @ts-ignore
    {},
    { noqueue: true, ...(modifiedResponse && { modifiedResponse }) }
  );
});

function toCypressResponse(req: any, res: any): Cypress.Response {
  const isBody = res != null && !("body" in res);
  const statusCode = isBody ? 200 : res?.statusCode;
  const result: Cypress.Response = {
    body: isBody ? res : res?.body,
    url: req?.url,
    headers: isBody ? {} : res?.headers,
    status: statusCode,
    duration: res?.duration,
    requestHeaders: req?.headers,
    requestBody: req?.body,
    statusText: isBody ? "OK" : res?.statusMessage,
    method: req?.method || "GET",
    allRequestResponses: [],
    isOkStatusCode: statusCode >= 200 && statusCode < 300,
  };
  return result;
}

function emitInterceptionEvent(req: any, res: any, modified: any = undefined) {
  Cypress.emit("log:intercept", {
    req,
    res,
    modified,
  });
}

const wrapFunctionRouteHandler = (fn: any) => {
  return function (req: any) {
    // see Cypress before-request.ts for implementation details of overwritten functions

    // wrap continue() function
    const reqContinue = req.continue;
    req.continue = (resFn: any) => {
      let unmodifiedRes: any;
      let responsePromise: any;

      const resWrapperFn = async (res: any) => {
        if (responsePromise) {
          await responsePromise;
        }
        resFn(res);
        emitInterceptionEvent(
          req,
          unmodifiedRes ? unmodifiedRes : res,
          unmodifiedRes ? res : undefined
        );
      };

      if (Cypress.c8ypact.isRecordingEnabled()) {
        responsePromise = new Cypress.Promise((resolve, reject) => {
          // "before:response" is the event to use as in "response" the continue handler seems to be called resulting in a timeout
          // see Cypress before-request.ts for implementation details
          req.on("before:response", (res: any) => {
            unmodifiedRes = _.cloneDeep(res);
            resolve(res);
          });
        });
      }

      if (Cypress.c8ypact.current == null) {
        reqContinue(resWrapperFn);
      } else {
        const response = responseFromPact({}, req.url);
        req.reply(response);
      }
    };

    // wrap reply() function
    const reqReply = req.reply;
    req.reply = (...args: any[]) => {
      if (!args || _.isEmpty(args)) {
        reqReply(...args);
        return;
      } else {
        const replyOptions: any = {};
        if (_.isFunction(args[0])) {
          // route handler - not supported as it seems only supported for compatibility
          // with old implementation of continue() based on reply()
          reqReply(...args);
        } else if (
          (_.isString(args[0]) || !hasStaticResponseKeys(args[0])) &&
          args.length <= 2
        ) {
          replyOptions.body = args[0];
          if (args.length > 1) {
            replyOptions.headers = args[1];
          }
        } else if (_.isObjectLike(args[0])) {
          if (!hasStaticResponseWithOptionsKeys(args[0])) {
            replyOptions.body = args[0];
          } else {
            _.extend(replyOptions, args[0]);
          }
        } else if (_.isNumber(args[0])) {
          replyOptions.statusCode = args[0];
          if (args.length > 1 && !_.isUndefined(args[1])) {
            replyOptions.body = args[1];
          }
          if (args.length > 2 && !_.isUndefined(args[1])) {
            replyOptions.headers = args[2];
          }
        }

        processReply(req, replyOptions, reqReply, reqContinue);
      }
    };

    fn(req);
  };
};

const wrapStaticResponse = (obj: any) => {
  return function (req: any) {
    processReply(req, obj, req.reply, req.continue);
  };
};

const wrapEmptyRoutHandler = () => {
  return function (req: any) {
    if (Cypress.c8ypact.current == null) {
      req.continue((res: any) => {
        emitInterceptionEvent(req, _.cloneDeep(res));
        res.send();
      });
    } else {
      const response = responseFromPact({}, req.url);
      req.reply(response);
    }
  };
};

function processReply(req: any, obj: any, replyFn: any, continueFn: any) {
  if (Cypress.c8ypact.isRecordingEnabled()) {
    let responsePromise = new Cypress.Promise((resolve, reject) => {
      // "before:response" is the event to use as in "response" event the continue handler
      // seems to be called resulting in a timeout
      // https://docs.cypress.io/api/commands/intercept#Intercepted-responses
      req.on("before:response", async (res: any) => {
        let modifiedResponse = obj;
        if (_.isObjectLike(obj) && "fixture" in obj) {
          const [path, encoding] = obj.fixture.split(",");
          // @ts-ignore
          modifiedResponse = await Cypress.backend("get:fixture", path, {
            encoding: encoding || "utf-8",
          });
        }
        emitInterceptionEvent(req, _.cloneDeep(res), modifiedResponse);

        // merge response with object done with res.send(obj)
        resolve();
      });
    });

    continueFn((res: any) => {
      // wait for the reponse to be updated in the before:response event
      return responsePromise.then(() => {
        // res.send(obj) should merge response with object automatically
        res.send(obj);
      });
    });
  } else {
    // respond to the request with object (static response)
    replyFn(obj);
    emitInterceptionEvent(req, obj);
  }
}

function responseFromPact(obj: any, url: string): any {
  if (Cypress.c8ypact.current == null) return obj;
  const p = Cypress.c8ypact.current as C8yDefaultPact;
  const record = p.getRecordsForUrl(url);
  if (record) {
    // obj could be string
    const r = _.first(record).response;
    const response = {
      body: r.body,
      headers: r.headers,
      statusCode: r.status,
      statusMessage: r.statusText,
    };
    if (_.isObjectLike(obj) && !_.isArrayLike(obj)) {
      _.extend(obj, response);
    } else if (_.isString(obj) || _.isArrayLike(obj)) {
      obj = response;
    }
  }
  return obj;
}

function hasStaticResponseKeys(obj: any) {
  return (
    !_.isArray(obj) &&
    (_.intersection(_.keys(obj), STATIC_RESPONSE_KEYS).length || _.isEmpty(obj))
  );
}

function hasStaticResponseWithOptionsKeys(obj: any) {
  return (
    !_.isArray(obj) &&
    (_.intersection(_.keys(obj), STATIC_RESPONSE_WITH_OPTIONS_KEYS).length ||
      _.isEmpty(obj))
  );
}
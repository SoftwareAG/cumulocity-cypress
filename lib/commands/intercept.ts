const { _ } = Cypress;

const wrapResponseFunction = (fn: any) => {
  var that = this;
  return function (req: any) {
    let startTime: number;
    // see Cypress before-request.ts for implementation details of overwritten functions

    // wrap continue() function
    const reqContinue = req.continue;
    const reqContinueFn = (resFn: any) => {
      const resWrapperFn = (res: any) => {
        if (!res.duration) {
          res.duration = Date.now() - startTime;
        }
        resFn(res);
        emitInterceptionEvent(req, res);
      };
      startTime = Date.now();
      reqContinue(resWrapperFn);
    };
    req.continue = reqContinueFn;

    // wrap reply() function
    const reqReply = req.reply;
    const resReplyFn = function (...args: any[]) {
      if (!args || _.isEmpty(args)) {
        reqReply(...args);
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
        reqReply(...args);
        emitInterceptionEvent(req, replyOptions);
      }
    };
    req.reply = resReplyFn;

    fn(req);
  };
};

const wrapResponseObject = (obj: any) => {
  return function (req: any) {
    req.reply(obj);
    emitInterceptionEvent(req, obj);
  };
};

const wrapMissingResponse = () => {
  return function (req: any) {
    req.continue((res: any) => {
      res.send();
      emitInterceptionEvent(req, res);
    });
  };
};

Cypress.on("log:intercept", (options) => {
  const { req, res } = options;
  const cypressResponse: Cypress.Response = {
    body: res.body,
    url: req.url,
    headers: res.headers,
    status: res.statusCode,
    duration: res.duration,
    requestHeaders: req.headers,
    requestBody: req.body,
    statusText: res.statusMessage,
    method: req.method || "GET",
    allRequestResponses: [],
    isOkStatusCode: res.statusCode >= 200 && res.statusCode < 300,
  };

  if (Cypress.c8ypact.isRecordingEnabled()) {
    // @ts-ignore
    Cypress.c8ypact.savePact(cypressResponse, {});
  }
});

Cypress.Commands.overwrite("intercept", (originalFn, ...args) => {
  const method =
    typeof args[0] === "string" && HTTP_METHODS.includes(args[0].toUpperCase())
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
        response = wrapResponseFunction(response);
      } else {
        response = wrapResponseObject(response);
      }
    } catch (error) {
      console.log(`Failed to intercept response: ${error}`);
    }
    updatedArgs.push(response);
  } else {
    response = wrapMissingResponse();
    updatedArgs.push(response);
  }

  // @ts-ignore
  return originalFn(...updatedArgs);
});

function emitInterceptionEvent(req: any, res: any) {
  Cypress.emit("log:intercept", {
    req,
    res,
  });
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

// cypress static response keys, see packages/driver/src/cy/net-stubbing/static-response-utils.ts
const STATIC_RESPONSE_KEYS = [
  "body",
  "fixture",
  "statusCode",
  "headers",
  "forceNetworkError",
  "throttleKbps",
  "delay",
  "delayMs",
];

const HTTP_METHODS = [
  "ACL",
  "BIND",
  "CHECKOUT",
  "CONNECT",
  "COPY",
  "DELETE",
  "GET",
  "HEAD",
  "LINK",
  "LOCK",
  "M-SEARCH",
  "MERGE",
  "MKACTIVITY",
  "MKCALENDAR",
  "MKCOL",
  "MOVE",
  "NOTIFY",
  "OPTIONS",
  "PATCH",
  "POST",
  "PROPFIND",
  "PROPPATCH",
  "PURGE",
  "PUT",
  "REBIND",
  "REPORT",
  "SEARCH",
  "SOURCE",
  "SUBSCRIBE",
  "TRACE",
  "UNBIND",
  "UNLINK",
  "UNLOCK",
  "UNSUBSCRIBE",
];

const STATIC_RESPONSE_WITH_OPTIONS_KEYS = [...STATIC_RESPONSE_KEYS, "log"];

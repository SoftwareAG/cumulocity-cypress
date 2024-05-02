/* eslint-disable import/no-named-as-default-member */
import _ from "lodash";

import express, { Express, Request, RequestHandler, Response } from "express";
import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";
import bodyParser from "body-parser";

import * as setCookieParser from "set-cookie-parser";
import * as libCookie from "cookie";

import winston from "winston";

import { IncomingMessage, Server, ServerResponse } from "http";

import cookieParser from "cookie-parser";
import { C8yAuthOptions } from "../auth";
import {
  C8yDefaultPact,
  C8yDefaultPactRecord,
  C8yPact,
  C8yPactInfo,
  C8yPactSaveKeys,
  pactId,
  toPactSerializableObject,
} from "../c8ypact";
import { oauthLogin } from "../c8yclient";
import { C8yPactFileAdapter } from "../c8ypact/fileadapter";
import {
  C8yPactHttpControllerOptions,
  C8yPactHttpResponse,
} from "./httpcontroller-options";
import morgan from "morgan";

export * from "./httpcontroller-options";

export class C8yPactHttpController {
  currentPact?: C8yDefaultPact;

  protected port: number;
  protected hostname: string;

  _baseUrl?: string;
  _staticRoot?: string;
  protected tenant?: string;

  adapter?: C8yPactFileAdapter;
  protected _isRecordingEnabled: boolean = false;
  protected _isStrictMocking: boolean = true;

  protected authOptions?: C8yAuthOptions;
  protected app: Express;
  protected server?: Server;
  protected options: C8yPactHttpControllerOptions;

  protected logger: winston.Logger;

  protected mockHandler?: RequestHandler;
  protected proxyHandler?: RequestHandler;

  constructor(options: C8yPactHttpControllerOptions) {
    this.options = options;
    this.adapter = options.adapter;
    this.port = options.port || 3000;
    this.hostname = options.hostname || "localhost";
    this._isRecordingEnabled = options.isRecordingEnabled || false;
    this._isStrictMocking = options.strictMocking || true;

    this._baseUrl = options.baseUrl;
    this._staticRoot = options.staticRoot;

    this.currentPact = undefined;
    this.tenant = options.tenant;

    this.logger =
      this.options.logger ||
      winston.createLogger({
        format: winston.format.simple(),
        transports: [new winston.transports.Console()],
      });
    this.logger.level = options.logLevel || "info";

    const stream = {
      write: (message: string) => {
        this.logger.info(message.trim());
      },
    };

    if (this.adapter) {
      this.logger.info(`Adapter: ${this.adapter.description()}`);
    }

    this.app = express();

    if (this.options.requestLogger) {
      let rls = this.options.requestLogger;
      if (_.isFunction(rls)) {
        rls = rls(this.logger);
      }
      if (!_.isArrayLike(rls)) {
        rls = [rls];
      }
      rls.forEach((h) => this.app.use(h));
    } else {
      this.app.use(morgan((options.logFormat || "short") as any, { stream }));
    }

    this.app.use(cookieParser());

    if (this.staticRoot) {
      this.app.use(express.static(this.staticRoot));
      this.logger.info(`Static Root: ${this.staticRoot}`);
    }
    this.authOptions = options.auth;
  }

  get baseUrl(): string | undefined {
    return this._baseUrl;
  }

  get staticRoot(): string | undefined {
    return this._staticRoot;
  }

  isRecordingEnabled(): boolean {
    return (
      this._isRecordingEnabled === true &&
      this.adapter != null &&
      this.baseUrl != null
    );
  }

  /**
   * Starts the server. When started, the server listens on the configured port and hostname. If required,
   * the server will try to login to the target server using the provided credentials. If authOptions have
   * a bearer token, the server will use this token for authentication. To enforce BasicAuth, set the type
   * property of the authOptions to "BasicAuth".
   */
  async start(): Promise<void> {
    if (this.server) {
      await this.stop();
    }

    if (this.authOptions && this.baseUrl) {
      const { user, password, bearer, type } = this.authOptions;
      if (!_.isEqual(type, "BasicAuth") && !bearer && user && password) {
        try {
          const a = await oauthLogin(this.authOptions, this.baseUrl);
          this.logger.info(`oauthLogin -> ${this.baseUrl} (${a.user})`);
          _.extend(this.authOptions, _.pick(a, ["bearer", "xsrfToken"]));
        } catch (error) {
          this.logger.error(`Login failed ${this.baseUrl} (${user})`, error);
        }
      }
    }
    if (!this.authOptions) {
      this.logger.warn(`No auth options provided. Not logging in.`);
    }

    if (this.baseUrl) {
      this.logger.info(`BaseURL: ${this.baseUrl}`);
      // register proxy handler first requires to make the proxy ignore certain paths
      // this is needed as bodyParser will break post requests in the proxy handler but
      // is needed before any other handlers dealing with request bodies
      const ignoredPaths = ["/c8yctrl"];

      if (!this.mockHandler) {
        this.mockHandler = this.app.use(
          this.wrapPathIgnoreHandler(this.mockRequestHandler, ignoredPaths)
        );
      }

      if (!this.proxyHandler) {
        this.proxyHandler = this.app.use(
          this.wrapPathIgnoreHandler(
            this.proxyRequestHandler(this.authOptions),
            ignoredPaths
          )
        );
      }
    }

    // automatically parse request bodies - must come after proxy handler
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.registerC8yctrlInterface();

    try {
      this.server = await this.app.listen(this.port);
      this.logger.info(
        `Started: ${this.hostname}:${this.port} (recording: ${this._isRecordingEnabled})`
      );
    } catch (error) {
      this.logger.error("Error starting server:", error);
      throw error;
    }
  }

  /**
   * Stops the server.
   */
  async stop(): Promise<void> {
    await this.server?.close();
    this.logger.info("Stopped server");
  }

  /**
   * Wraps a RequestHandler to ignore certain paths. For paths matching the ignoredPaths
   * the next handler is called, skipping the wrapped handler.
   * @param handler The RequestHandler to wrap
   * @param ignoredPaths The paths to ignore using exact match
   * @returns The RequestHandler wrapper
   */
  protected wrapPathIgnoreHandler(
    handler: RequestHandler,
    ignoredPaths: string[]
  ): RequestHandler {
    return (req, res, next) => {
      if (ignoredPaths.filter((p) => req.path.startsWith(p)).length > 0) {
        next();
      } else {
        new Promise((resolve, reject) => {
          handler(req, res, (err) => (err ? reject(err) : resolve(null)));
        })
          .then(() => next())
          .catch(next);
      }
    };
  }

  protected registerC8yctrlInterface() {
    this.app.get("/c8yctrl/current", (req, res) => {
      if (!this.currentPact) {
        res
          .status(404)
          .send(
            "No current pact set. Set current pact using POST /c8yctrl/current."
          );
        return;
      }
      res.send(this.stringifyPact(this.currentPact));
    });
    this.app.post("/c8yctrl/current", async (req, res) => {
      const id = req.body?.id || pactId(req.body?.title) || req.query.id;
      if (!id) {
        res.status(200).send("Missing pact id. Reset current pact.");
        this.currentPact = undefined;
        return;
      }

      const parameters = { ...req.body, ...req.query };
      const { recording, clear, strictMocking } = parameters;
      this._isRecordingEnabled = toBoolean(recording, this._isRecordingEnabled);
      this._isStrictMocking = toBoolean(strictMocking, this._isStrictMocking);

      if (this.currentPact?.id === id) {
        res.status(200);
      } else {
        if (this.isRecordingEnabled()) {
          const info: C8yPactInfo = {
            baseUrl: this.baseUrl || "",
            requestMatching: this.options.requestMatching,
            preprocessor: this.options.preprocessor?.options,
            strictMocking: this._isStrictMocking,
            ..._.pick(req.body, [
              "id",
              "producer",
              "consumer",
              "version",
              "title",
              "tags",
              "description",
            ]),
          };
          this.currentPact = new C8yDefaultPact([], info, id);
          res.status(201);
        } else {
          const current = this.adapter?.loadPact(id);
          if (!current) {
            res
              .status(404)
              .send(`Not found. Enable recording to create a new pact.`);
            return;
          } else {
            this.currentPact = C8yDefaultPact.from(current);
            res.status(200);
          }
        }

        if (
          _.isString(clear) &&
          (_.isEmpty(clear) || clear.toLowerCase() === "true") &&
          this.currentPact
        ) {
          this.currentPact.reset();
          await this.savePact(this.currentPact);
        }
      }

      res.send(
        this.stringifyPact({
          ...this.currentPact,
          records: (this.currentPact?.records?.length || 0) as any,
        })
      );
    });
    this.app.delete("/c8yctrl/current", (req, res) => {
      this.currentPact = undefined;
      res.status(204).send();
    });
    this.app.post("/c8yctrl/log", (req, res) => {
      const { message, level } = req.body;
      if (message) {
        this.logger.log(level || "info", message);
      }
      res.status(200).send();
    });
  }

  // mock handler - returns recorded response.
  // register before proxy handler
  protected mockRequestHandler: RequestHandler = (req, res, next) => {
    if (this._isRecordingEnabled === true) {
      return next();
    }

    let response: C8yPactHttpResponse | undefined | null = undefined;
    let record = this.currentPact?.nextRecordMatchingRequest(req, this.baseUrl);
    if (_.isFunction(this.options.onMockRequest)) {
      response = this.options.onMockRequest(this, req, record);
      if (!response) {
        this.logger.debug(`Not mocking ${req.url}. Filtered by configuration.`);
        return next();
      }
    }

    if (response) {
      record = C8yDefaultPactRecord.from(
        _.defaults(response, record?.response || {})
      );
    }

    if (!record) {
      if (this._isStrictMocking) {
        if (this.options.mockNotFoundResponse) {
          const r = this.options.mockNotFoundResponse;
          response = _.isFunction(r) ? r(req) : r;
        } else {
          response = {
            status: 404,
            statusText: "Not Found",
            body:
              `<html>\n<head><title>404 Recording Not Found</title></head>` +
              `\n<body bgcolor="white">\n<center><h1>404 Recording Not Found</h1>` +
              `</center>\n<hr><center>cumulocity-cypress-ctrl/${this.constructor.name}</center>` +
              `\n</body>\n</html>\n`,
            headers: {
              "content-type": "text/html",
            },
          };
        }
        record = C8yDefaultPactRecord.from(response);
      }
    } else {
      response = record?.response;
    }

    if (!record || !response) {
      return next();
    }

    const responseBody = _.isString(response?.body)
      ? response?.body
      : this.stringify(response?.body);
    res.setHeader("content-length", Buffer.byteLength(responseBody));

    response.headers = _.defaults(
      response?.headers,
      _.pick(response?.headers, ["content-type", "set-cookie"])
    );

    res.writeHead(response?.status || 200, response?.headers);
    res.end(responseBody);
  };

  // proxy handler - forwards request to target server
  protected proxyRequestHandler(auth?: C8yAuthOptions): RequestHandler {
    return createProxyMiddleware({
      target: this.baseUrl,
      changeOrigin: true,
      cookieDomainRewrite: "",
      selfHandleResponse: true,
      logger: this.logger,

      on: {
        proxyReq: (proxyReq, req, res) => {
          if (this.currentPact?.id) {
            (req as any).c8yctrlId = this.currentPact?.id;
          }

          // add authorization header
          if (
            this._isRecordingEnabled === true &&
            auth &&
            !proxyReq.getHeader("Authorization") &&
            !proxyReq.getHeader("authorization")
          ) {
            const { bearer, xsrfToken, user, password } =
              auth as C8yAuthOptions;
            if (bearer) {
              proxyReq.setHeader("Authorization", `Bearer ${bearer}`);
            }
            if (!bearer && user && password) {
              proxyReq.setHeader(
                "Authorization",
                `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`
              );
            }
            if (xsrfToken) {
              proxyReq.setHeader("X-XSRF-TOKEN", xsrfToken);
            }
          }

          if (_.isFunction(this.options.onProxyRequest)) {
            const r = this.options.onProxyRequest(this, proxyReq, req);
            if (r) {
              this.writeResponse(res, r);
            }
          }
        },

        proxyRes: responseInterceptor(
          async (responseBuffer, proxyRes, req, res) => {
            let resBody = responseBuffer.toString("utf8");
            const c8yctrlId = (req as any).c8yctrlId;

            if (_.isFunction(this.options.onProxyResponse)) {
              const shouldContinue = this.options.onProxyResponse(
                this,
                req,
                this.toC8yPactResponse(res, resBody)
              );
              if (!shouldContinue) {
                this.logger.debug(
                  `Not processing ${req.url}. Filtered by configuration.`
                );
                return responseBuffer;
              }
            }

            if (this._isRecordingEnabled === true) {
              const reqBody = (req as any).body;
              try {
                resBody = JSON.parse(resBody);
              } catch {
                // no-op : use body as string
              }
              const setCookieHeader = res.getHeader("set-cookie") as string[];
              const cookies = setCookieParser.parse(setCookieHeader, {
                decodeValues: false,
              });
              if (cookies.length) {
                res.setHeader(
                  "set-cookie",
                  cookies.map(function (cookie) {
                    delete cookie.domain;
                    delete cookie.secure;
                    return libCookie.serialize(
                      cookie.name,
                      cookie.value,
                      cookie as libCookie.CookieSerializeOptions
                    );
                  })
                );
              }
              await this.savePact(
                this.toCypressResponse(req, res, { resBody, reqBody }),
                c8yctrlId
              );
            }
            return responseBuffer;
          }
        ),
      },
    });
  }

  stringifyReplacer = (key: string, value: any) => {
    if (!_.isString(value)) return value;
    const replaceProperties = ["self", "next", "initRequest"];
    if (replaceProperties.includes(key) && value.startsWith("http")) {
      // replace url host with localhost
      const newHost = `http://${this.hostname}:${this.port}`;
      value = value.replace(/https?:\/\/[^/]+/, newHost);
    }
    return value;
  };

  getStringifyReplacer(): (key: string, value: any) => any {
    const configReplacer = this.options.stringifyReplacer;
    return configReplacer && _.isFunction(configReplacer)
      ? configReplacer
      : this.stringifyReplacer;
  }

  protected stringify(obj?: any): string {
    if (!obj) return "";
    return JSON.stringify(obj, this.getStringifyReplacer(), 2);
  }

  protected stringifyPact(pact: C8yDefaultPact | C8yPact | any): string {
    const p = _.pick(pact, ["id", "info", "records"]) as C8yPact;
    return this.stringify(p);
  }

  protected producerForPact(pact: C8yPact) {
    return _.isString(pact.info.producer)
      ? { name: pact.info.producer }
      : pact.info.producer;
  }

  protected pactsForProducer(
    pacts: { [key: string]: C8yDefaultPact },
    producer: string | { name: string; version: string },
    version?: string
  ): C8yPact[] {
    if (!pacts) return [];
    return Object.keys(pacts)
      .filter((key) => {
        const p = pacts[key as keyof typeof pacts];
        const n = _.isString(producer) ? producer : producer.name;
        const v = _.isString(producer) ? version : producer.version;
        const pactProducer = this.producerForPact(p);
        if (!_.isUndefined(v) && !_.isEqual(v, pactProducer?.version))
          return false;
        if (!_.isEqual(n, pactProducer?.name)) return false;
        return true;
      })
      .map((key) => pacts[key as keyof typeof pacts]);
  }

  async savePact(
    response: Cypress.Response<any> | C8yPact,
    c8ycltrlId?: string
  ): Promise<void> {
    let pactForId = this.currentPact;
    if (c8ycltrlId && !_.isEqual(this.currentPact?.id, c8ycltrlId)) {
      const p = this.adapter?.loadPact(c8ycltrlId);
      pactForId = p ? C8yDefaultPact.from(p) : undefined;
      this.logger.warn(
        `Request for ${c8ycltrlId} received for current pact with different id.`
      );
    }

    if (!pactForId) return;

    const id = pactForId.id;
    try {
      let pact: Pick<C8yPact, C8yPactSaveKeys>;
      if ("records" in response && "info" in response) {
        pact = response;
      } else {
        const info: C8yPactInfo = {
          id: pactForId?.id,
          title: [],
          tenant: this.tenant,
          baseUrl: this.baseUrl || "",
          preprocessor: this.options.preprocessor?.options,
          requestMatching: this.options.requestMatching,
          strictMocking: this._isStrictMocking,
        };
        pact = await toPactSerializableObject(response, info, {
          preprocessor: this.options.preprocessor,
          schemaGenerator: this.options.schemaGenerator,
        });
      }

      const { records } = pact;
      if (!pactForId) {
        pactForId = new C8yDefaultPact(records, pact.info, id);
        this.currentPact = pactForId;
      } else {
        if (!pactForId.records) {
          pactForId.records = records;
        } else if (Array.isArray(records)) {
          Array.prototype.push.apply(pactForId.records, records);
        } else {
          pactForId.records.push(records);
        }
      }
      if (!pact || _.isEmpty(pactForId.records)) return;

      if (_.isFunction(this.options.onSavePact)) {
        const shouldSave = this.options.onSavePact(this, pactForId);
        if (!shouldSave) {
          this.logger.debug(
            `Not saving pact with id ${pactForId.id}. Disabled by configuration.`
          );
          return;
        }
      }
      this.adapter?.savePact(pactForId);
      this.logger.debug(`Saved ${pactForId.id}`);
    } catch (error) {
      this.logger.error(`Failed to save pact`, error);
    }
  }

  protected toC8yPactResponse(
    res: Response<any, any>,
    body: any
  ): C8yPactHttpResponse {
    return {
      headers: res?.getHeaders() as { [key: string]: string },
      status: res?.statusCode,
      statusText: res?.statusMessage,
      body,
    };
  }

  protected toCypressResponse(
    req: IncomingMessage | Request,
    res: ServerResponse<IncomingMessage> | Response,
    options?: {
      reqBody?: string;
      resBody?: string;
    }
  ): Cypress.Response<any> {
    const statusCode = res?.statusCode || 200;
    const result: Cypress.Response<any> = {
      body: options?.resBody,
      url: req?.url,
      headers: res?.getHeaders() as { [key: string]: string },
      status: res?.statusCode,
      duration: 0,
      requestHeaders: req?.headers as { [key: string]: string },
      requestBody: options?.reqBody,
      statusText: res?.statusMessage,
      method: req?.method || "GET",
      isOkStatusCode: statusCode >= 200 && statusCode < 300,
      allRequestResponses: [],
    };
    // required to fix inconsistencies between c8yclient and interceptions
    // using lowercase and uppercase. fix here.
    if (result.requestHeaders?.["x-xsrf-token"]) {
      result.requestHeaders["X-XSRF-TOKEN"] =
        result.requestHeaders["x-xsrf-token"];
      delete result.requestHeaders["x-xsrf-token"];
    }
    if (result.requestHeaders?.["authentication"]) {
      result.requestHeaders["Authorization"] =
        result.requestHeaders["authentication"];
      delete result.requestHeaders["authentication"];
    }
    return result;
  }

  protected writeResponse(
    targetResponse: Response<any, any>,
    response: C8yPactHttpResponse
  ) {
    const responseBody = _.isString(response?.body)
      ? response?.body
      : this.stringify(response?.body);
    targetResponse.setHeader("content-length", Buffer.byteLength(responseBody));

    response.headers = _.defaults(
      response?.headers,
      _.pick(response?.headers, ["content-type", "set-cookie"])
    );

    targetResponse.writeHead(response?.status || 200, response?.headers);
    targetResponse.end(responseBody);
  }
}

function toBoolean(input: string, defaultValue: boolean): boolean {
  if (input == null || !_.isString(input)) return defaultValue;
  const booleanString = input.toString().toLowerCase();
  if (booleanString == "true") return true;
  if (booleanString == "false") return false;
  return defaultValue;
}

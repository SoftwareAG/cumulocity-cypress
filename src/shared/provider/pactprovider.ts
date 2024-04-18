import _ from "lodash";

import express, {
  static as expressStatic,
  Express,
  Request,
  RequestHandler,
  Response,
} from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import bodyParser from "body-parser";

import { Server } from "http";

import cookieParser from "cookie-parser";
import { C8yAuthOptions } from "../auth";
import {
  C8yDefaultPact,
  C8yDefaultPactRecord,
  C8yPact,
  C8yPactInfo,
  C8yPactPreprocessor,
  C8yPactRecord,
  C8yPactRequestMatchingOptions,
  C8yPactSaveKeys,
  C8ySchemaGenerator,
  pactId,
  toPactSerializableObject,
} from "../c8ypact";
import { oauthLogin } from "../c8yclient";
import { C8yPactFileAdapter } from "../c8ypact/fileadapter";

export interface C8yPactHttpProviderOptions {
  baseUrl?: string;
  auth?: C8yAuthOptions;
  port?: number;
  tenant?: string;
  staticRoot?: string;
  adapter: C8yPactFileAdapter;
  preprocessor?: C8yPactPreprocessor;
  schemaGenerator?: C8ySchemaGenerator;
  requestMatching?: C8yPactRequestMatchingOptions;
  strictMocking?: boolean;
  isRecordingEnabled?: boolean;
  errorResponseRecord?:
    | C8yPactRecord
    | ((url?: string, contentType?: string) => C8yPactRecord);
}

export interface C8yPactHttpProviderConfig extends C8yPactHttpProviderOptions {
  folder?: string;
  user?: string;
  password?: string;
}

export class C8yPactHttpProvider {
  // pacts: { [key: string]: C8yDefaultPact };
  currentPact?: C8yDefaultPact;

  protected port: number;

  _baseUrl?: string;
  _staticRoot?: string;
  protected tenant?: string;

  adapter?: C8yPactFileAdapter;
  protected _isRecordingEnabled: boolean = false;
  protected _isStrictMocking: boolean = true;

  protected authOptions?: C8yAuthOptions;
  protected app: Express;
  protected server?: Server;
  protected options: C8yPactHttpProviderOptions;

  protected proxyHandler?: RequestHandler;

  constructor(options: C8yPactHttpProviderOptions) {
    this.options = options;
    this.adapter = options.adapter;
    this.port = options.port || 3000;
    this._isRecordingEnabled = options.isRecordingEnabled || false;
    this._isStrictMocking = options.strictMocking || true;

    this._baseUrl = options.baseUrl;
    this._staticRoot = options.staticRoot;

    this.currentPact = undefined;
    this.tenant = options.tenant;

    this.app = express();
    this.app.use(cookieParser());
    // automatically parse request bodies
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    if (this.staticRoot) {
      this.app.use(expressStatic(this.staticRoot));
    }

    this.registerCurrentInterface();
    // this.registerPactInterface();

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

  async start(): Promise<void> {
    if (this.server) {
      await this.stop();
    }
    if (this.authOptions) {
      const { user, password, bearer, type } = this.authOptions;
      if (!_.isEqual(type, "BasicAuth") && !bearer && user && password) {
        const a = await oauthLogin(this.authOptions, this.baseUrl);
        _.extend(this.authOptions, _.pick(a, ["bearer", "xsrfToken"]));
      }
    }

    if (this.baseUrl && !this.proxyHandler) {
      this.proxyHandler = this.app.use(
        "/",
        this.proxyRequestHandler(this.authOptions)
      );
    }

    this.server = await this.app.listen(this.port);
  }

  async stop(): Promise<void> {
    await this.server?.close();
  }

  protected registerCurrentInterface() {
    this.app.get("/c8ypact/current", (req: Request, res: Response) => {
      if (!this.currentPact) {
        res
          .status(404)
          .send(
            "No current pact set. Set current pact using POST /c8ypact/current."
          );
        return;
      }
      res.send(this.stringifyPact(this.currentPact));
    });
    this.app.post("/c8ypact/current", async (req: Request, res: Response) => {
      const id = req.body.id || pactId(req.body.title);
      if (!id) {
        res.status(200).send("Reset current pact.");
        this.currentPact = undefined;
        return;
      }

      const { recording, clear } = req.query;
      if (recording && _.isString(recording)) {
        if (recording.toLocaleLowerCase() === "true") {
          this._isRecordingEnabled = true;
        } else if (recording.toLocaleLowerCase() === "false") {
          this._isRecordingEnabled = false;
        }
      }
      if (
        _.isString(clear) &&
        (_.isEmpty(clear) || clear === "true") &&
        this.currentPact
      ) {
        this.currentPact.reset();
        await this.savePact(this.currentPact);
      }

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
      }

      res.send(
        this.stringifyPact({
          ...this.currentPact,
          records: (this.currentPact?.records?.length || 0) as any,
        })
      );
    });
    this.app.delete("/c8ypact/current", (req, res) => {
      this.currentPact = undefined;
      res.status(204).send();
    });
  }

  protected proxyRequestHandler(auth?: C8yAuthOptions): RequestHandler {
    return createProxyMiddleware({
      target: this.baseUrl,
      changeOrigin: true,
      cookieDomainRewrite: "",

      onProxyReq: (proxyReq, req, res) => {
        // add authorization header
        if (
          auth &&
          !proxyReq.getHeader("Authorization") &&
          !proxyReq.getHeader("authorization")
        ) {
          const { bearer, xsrfToken, user, password } = auth as C8yAuthOptions;
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

        // remove accept-encoding to avoid gzipped responses
        proxyReq.removeHeader("Accept-Encoding");
        proxyReq.removeHeader("accept-encoding");

        if (this._isRecordingEnabled === true) return;

        let record = this.currentPact?.nextRecordMatchingRequest(
          req,
          this.baseUrl
        );
        if (!record) {
          if (this._isStrictMocking) {
            if (this.options.errorResponseRecord) {
              const r = this.options.errorResponseRecord;
              record = _.isFunction(r)
                ? r(req.url, req.get("content-type"))
                : r;
            } else {
              record = C8yDefaultPactRecord.from({
                status: 404,
                statusText: "Not Found",
                body:
                  `<html>\n<head><title>404 Recording Not Found</title></head>` +
                  `\n<body bgcolor="white">\n<center><h1>404 Application Not Found</h1>` +
                  `</center>\n<hr><center>cumulocity-cypress/${this.constructor.name}</center>` +
                  `\n</body>\n</html>\n`,
                headers: {
                  "content-type": "text/html",
                },
              });
            }
          }
        }
        if (!record) return;

        const r = record?.response;
        res.writeHead(r?.status || 200, r?.headers);
        const responseBody = _.isString(r?.body)
          ? r?.body
          : JSON.stringify(r?.body);
        res.end(responseBody);
      },

      onProxyRes: (proxyRes, req, res) => {
        console.log(
          `${res.statusCode} ${this.baseUrl}${
            req.url
          } (${this.isRecordingEnabled()})`
        );

        if (this._isRecordingEnabled === true) {
          const body: any[] = [];
          proxyRes.on("data", (chunk) => {
            body.push(chunk);
          });
          proxyRes.on("end", async () => {
            let reqBody: any | string | undefined;
            let resBody: any | string | undefined;
            try {
              reqBody = req.body;
              resBody = Buffer.concat(body).toString("utf8");
              resBody = JSON.parse(resBody);
            } catch {
              // no-op : use body as string
            }
            await this.savePact(
              this.toCypressResponse(req, res, { resBody, reqBody })
            );
          });
        }
      },

      onError: (err) => {
        console.error(err);
      },
    });
  }

  protected stringifyPact(record: C8yDefaultPact | C8yPact | any): string {
    return JSON.stringify(
      _.pick(record, ["id", "info", "records"]),
      undefined,
      2
    );
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

  async savePact(response: Cypress.Response<any> | C8yPact): Promise<void> {
    if (!this.currentPact) return;
    const id = this.currentPact.id;
    try {
      let pact: Pick<C8yPact, C8yPactSaveKeys>;
      if ("records" in response && "info" in response) {
        pact = response;
      } else {
        const info: C8yPactInfo = {
          id: this.currentPact.id,
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
      if (!this.currentPact) {
        this.currentPact = new C8yDefaultPact(records, pact.info, id);
      } else {
        if (!this.currentPact.records) {
          this.currentPact.records = records;
        } else if (Array.isArray(records)) {
          Array.prototype.push.apply(this.currentPact.records, records);
        } else {
          this.currentPact.records.push(records);
        }
      }
      if (!pact) return;
      this.adapter?.savePact(this.currentPact);
    } catch (error) {
      console.log("Failed to save pact.", error);
    }
  }

  protected toCypressResponse(
    req: Request,
    res: Response,
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
}

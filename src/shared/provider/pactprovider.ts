import _ from "lodash";

import express, {
  static as expressStatic,
  Express,
  Request,
  RequestHandler,
  Response,
} from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

import { Server } from "http";

import cookieParser from "cookie-parser";
import { C8yAuthOptions } from "../auth";
import { C8yPact, isPact } from "../c8ypact";
import { oauthLogin } from "../c8yclient";

export interface C8yPactHttpProviderOptions {
  baseUrl?: string;
  auth?: C8yAuthOptions;
  port?: number;
  tenant?: string;
  staticRoot?: string;
}

export class C8yPactHttpProvider {
  pacts: C8yPact[];
  currentPacts?: C8yPact[];
  protected port: number;

  _baseUrl?: string;
  _staticRoot?: string;

  protected auth?: C8yAuthOptions;
  protected app: Express;
  protected server?: Server;
  protected proxy?: RequestHandler;

  constructor(pacts: C8yPact[], options: C8yPactHttpProviderOptions = {}) {
    this.port = options.port || 3000;
    this._baseUrl = options.baseUrl;
    this._staticRoot = options.staticRoot;
    this.pacts = pacts || [];

    this.app = express();
    this.app.use(cookieParser());

    if (this.staticRoot) {
      this.app.use(expressStatic(this.staticRoot));
    }

    this.auth = options.auth;
    if (this.baseUrl) {
      this.app.use(
        "/",
        createProxyMiddleware({
          target: this.baseUrl,
          changeOrigin: true,
          cookieDomainRewrite: "",
          onProxyReq: (proxyReq) => {
            const bearer = options.auth?.bearer;
            if (bearer) {
              proxyReq.setHeader("Authorization", `Bearer ${bearer}`);
            }

            const xsrf = options.auth?.xsrf;
            if (xsrf) {
              proxyReq.setHeader("X-XSRF-TOKEN", xsrf);
            }
          },
          // onProxyRes: (proxyRes, req, res) => {
          //   console.log({
          //     url: req.url,
          //     requestHeaders: req.headers,
          //     statusCode: res.statusCode,
          //     responseHeaders: res.getHeaders(),
          //   });
          //   // Erstellen Sie ein C8yPact Objekt für die Antwort und speichern Sie es
          //   // console.log(res);
          // },
        })
      );
    }

    // // this.registerBaseUrlProxy();
    // this.registerPactInterface();
    // this.registerCurrentInterface();
  }

  get baseUrl(): string | undefined {
    return this._baseUrl;
  }

  get staticRoot(): string | undefined {
    return this._staticRoot;
  }

  async start(): Promise<void> {
    if (this.server) {
      await this.stop();
    }
    if (this.auth) {
      this.auth = await oauthLogin(this.auth, this.baseUrl);
      console.log(this.auth);
    }
    this.server = await this.app.listen(this.port);
  }

  async stop(): Promise<void> {
    await this.server?.close();
  }

  protected registerCurrentInterface() {
    this.app.get("/c8ypact/current", (req: Request, res: Response) => {
      if (!this.currentPacts) {
        res
          .status(404)
          .send(
            "No current pact set. Set current pact using POST /c8ypact/current."
          );
        return;
      }
      res.send(JSON.stringify(this.currentPacts, undefined, 2));
    });
    this.app.post("/c8ypact/current", (req: Request, res: Response) => {
      const { id, producer, tenant, systemVersion } = req.body;
      if (id) {
        const pact = this.pacts.find((p) => p.id === id);
        if (!pact) {
          res.status(404).send(`Pact with id ${id} not found.`);
          return;
        }
        this.currentPacts = [pact];
        return;
      }
      if (producer) {
        this.currentPacts = this.pactsForProducer(producer);
      }
      this.currentPacts?.filter((p) => {
        if (
          tenant &&
          !(!_.isUndefined(p.info.tenant) && _.isEqual(p.info.tenant, tenant))
        ) {
          return false;
        }
        if (
          systemVersion &&
          !(
            !_.isUndefined(p.info.version?.system) &&
            _.isEqual(p.info.version?.system, systemVersion)
          )
        ) {
          return false;
        }
        return true;
      });
    });
    this.app.delete("/c8ypact/current", () => {
      this.currentPacts = undefined;
    });
  }

  protected registerPactInterface() {
    // return all pacts
    this.app.get("/c8ypact", (req: Request, res: Response) => {
      res.send(this.stringifyResponse(this.pacts || {}));
    });
    // return pact with the given id
    this.app.get("/c8ypact/:id", (req: Request, res: Response) => {
      const id: string = req.params.id;
      if (!id || _.isEmpty(id)) {
        res.status(400).send("Missing id. Provide a c8ypact id.");
        return;
      }
      if (!this.pacts || !this.pacts[id as keyof typeof this.pacts]) {
        res.status(404).send(`Pact with id ${id} not found.`);
        return;
      }
      res.send(
        this.stringifyResponse(this.pacts[id as keyof typeof this.pacts] || {})
      );
    });
    // return all unique producers and its versions
    this.app.get("/c8ypact/producers", (req: Request, res: Response) => {
      const producers = _.uniq(this.pacts.map((p) => this.producerForPact(p)));
      res.send(this.stringifyResponse(producers || []));
    });
    // return all pacts for a given producer with an optional version
    this.app.get(
      "/c8ypact/producers/:name/:version",
      (req: Request, res: Response) => {
        const result = this.pactsForProducer(
          req.params.name,
          req.params.version
        );
        res.send(this.stringifyResponse(result || []));
      }
    );
    // create a new pact for a given id. replace pact if exists
    this.app.post("/c8ypact/:id", (req: Request, res: Response) => {
      const id = req.params.id;
      if (!id || _.isEmpty(id)) {
        res.status(400).send("Missing id. Provide a c8ypact id.");
        return;
      }
      const pact = req.body;
      if (!pact || !isPact(pact)) {
        res.status(400).send("Invalid pact. Provide a valid pact.");
        return;
      }
      // this.pacts[id] = pact;
    });
  }

  // protected registerBaseUrlProxy() {
  //   const createProxy = (target: string) => {
  //     return createProxyMiddleware({
  //       target,
  //       changeOrigin: true,
  //       onProxyReq: (proxyReq, req, res) => {
  //         // proxyReq.setHeader("Authorization", authHeader);
  //         // proxyReq.setHeader("Cookie", `X-XSRF-TOKEN=${authCookie}`);
  //       },
  //     });
  //   };

  //   this.proxy = createProxy(this.baseUrl);
  //   this.app.use("/", (req, res, next) => {
  //     return this.proxy(req, res, next);
  //   });
  // }

  protected stringifyResponse(obj: any): string {
    return JSON.stringify(obj, undefined, 2);
  }

  protected producerForPact(pact: C8yPact) {
    return _.isString(pact.info.producer)
      ? { name: pact.info.producer }
      : pact.info.producer;
  }

  protected pactsForProducer(
    ...args:
      | [producer: string | { name: string; version: string }]
      | [producer: string, version?: string]
  ): C8yPact[] {
    return this.pacts.filter((p) => {
      const producer = args[0];
      const version = args[1];

      const n = _.isString(producer) ? producer : producer.name;
      const v = _.isString(producer) ? version : producer.version;
      const pactProducer = this.producerForPact(p);
      if (!_.isUndefined(v) && !_.isEqual(v, pactProducer?.version))
        return false;
      if (!_.isEqual(n, pactProducer?.name)) return false;
      return true;
    });
  }

  protected currentBaseUrl(): string | undefined {
    if (!this.currentPacts || _.isEmpty(this.currentPacts)) return undefined;

    const baseUrls = this.currentPacts.reduce((acc, pact) => {
      if (!pact.info?.baseUrl) return acc;
      if (!acc.includes(pact.info.baseUrl)) acc.push(pact.info.baseUrl);
      return acc;
    }, [] as string[]);
    if (_.isEmpty(baseUrls)) return undefined;
    return _.first(this.baseUrl);
  }
}

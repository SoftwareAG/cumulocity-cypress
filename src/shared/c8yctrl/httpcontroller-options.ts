import { C8yPactHttpController } from "./httpcontroller";
import {
  C8yAuthOptions,
  C8yPact,
  C8yPactPreprocessor,
  C8yPactRecord,
  C8yPactRequestMatchingOptions,
  C8yPactResponse,
  C8ySchemaGenerator,
  C8yPactFileAdapter,
} from "cumulocity-cypress/node";

import { Request, RequestHandler } from "express";
import { ClientRequest, IncomingMessage, ServerResponse } from "http";

import { FormatFn } from "morgan";
import winston from "winston";

type LogFormat =
  | "json"
  | "simple"
  | "combined"
  | "short"
  | "dev"
  | "tiny"
  | "common";

export type C8yPactHttpResponse<T = any> = Pick<
  C8yPactResponse<T>,
  "status" | "statusText" | "body" | "headers"
>;

export interface C8yPactHttpControllerOptions {
  /**
   * Base URL of the target server to proxy requests to.
   */
  baseUrl?: string;
  /**
   * Authentication options to use for authenticating against the target server.
   */
  auth?: C8yAuthOptions;
  /**
   * Hostname to listen on. Default is localhost.
   */
  hostname?: string;
  /**
   * Port to listen on. Default is 3000.
   */
  port?: number;
  /**
   * Tenant id of the target server to proxy requests to.
   */
  tenant?: string;
  /**
   * Root folder for static files to serve.
   */
  staticRoot?: string;
  /**
   * Adapter to use for loading and saving pact files.
   */
  adapter: C8yPactFileAdapter;
  /**
   * Preprocessor to use for modifying requests and responses.
   */
  preprocessor?: C8yPactPreprocessor;
  /**
   * Schema generator to use for generating schemas for response bodies. If not set, no schema is generated.
   */
  schemaGenerator?: C8ySchemaGenerator;
  /**
   * Request matching options to use for matching requests to recorded responses.
   */
  requestMatching?: C8yPactRequestMatchingOptions;
  /**
   * Enable strict mocking. If true, only recorded responses are returned.
   */
  strictMocking?: boolean;
  /**
   * Enable recording of requests and responses.
   */
  isRecordingEnabled?: boolean;
  /**
   * Record to use for error responses when no mock is found.
   */
  mockNotFoundResponse?:
    | C8yPactHttpResponse
    | ((req: Request<any, any, any, any>) => C8yPactHttpResponse);
  /**
   * Logger to use for logging. Currently only winston is supported.
   */
  logger?: winston.Logger;
  /**
   * RequestHandler to use for logging requests. Default is morgan.
   */
  requestLogger?:
    | RequestHandler[]
    | ((logger?: winston.Logger) => RequestHandler[]);
  /**
   * Log level to use for logging. Default is info.
   */
  logLevel?: "info" | "debug" | "warn" | "error";
  /**
   * Log format to use for logging.
   */
  logFormat?:
    | LogFormat
    | string
    | FormatFn<IncomingMessage, ServerResponse<IncomingMessage>>;
  /**
   * Custom replacer function to use for JSON.stringify. Use for customization of JSON output.
   * Default is to replace URLs in "self", "next", "initRequest" properties with hostname and
   * port of the controller.
   */
  stringifyReplacer?: (key: string, value: any) => any;
  /**
   * Called before a request is mocked. Use to modify or return custom response as mock. Also
   * use to forward custom headers from the request to the response. By default, only the
   * recorded `content-type` and `set-cookie` headers are forwarded. Any other recorded headers
   * must be forwarded by adding them to the `response.headers` object.
   *
   * By returning null or undefined, the request is passed to the proxy handler without mocking.
   *
   * **Note**: return `record.response` to use the recorded response as mock.
   *
   * @param ctrl The controller instance.
   * @param record The record used for mocking.
   * @param req The request to mock.
   * @returns A response to use as mock or null/undefined to pass the request to the proxy handler.
   */
  onMockRequest?: (
    ctrl: C8yPactHttpController,
    req: Request<any, any, any, any>,
    record: C8yPactRecord | undefined | null
  ) => C8yPactHttpResponse | undefined | null;
  /**
   * Called before a request is proxied. Use to modify the request before it
   * is proxied, e.g. to add or remove headers, etc. or to abort the request
   * by returning a custom or error response to send back to the client.
   * @param ctrl The controller instance.
   * @param proxyReq The proxy request.
   * @param req The request to proxy.
   * @returns A response to send back to the client to abort the request or undefined to continue.
   */
  onProxyRequest?: (
    ctrl: C8yPactHttpController,
    proxyReq: ClientRequest,
    req: Request<any, any, any, any>
  ) => C8yPactHttpResponse | undefined | null;
  /**
   * Called after receiving the response for a proxied request. By returning false,
   * the request and response are ignored and not processed and saved. Use to filter
   * requests and responses from recording.
   * @param ctrl The controller instance.
   * @param req The proxied request.
   * @param res The proxied response.
   * @returns false if the request and response should be ignored, true otherwise.
   */
  onProxyResponse?: (
    ctrl: C8yPactHttpController,
    req: Request,
    res: C8yPactHttpResponse
  ) => boolean;
  /**
   * Called before a request and its response are saved. By returning false, the
   * request is ignored and not saved.
   * @param ctrl The controller instance.
   * @param req The C8yPact object to be saved.
   * @returns true if the C8yPact should be saved, false otherwise.
   */
  onSavePact?: (ctrl: C8yPactHttpController, pact: C8yPact) => boolean;
}

export interface C8yPactHttpControllerConfig
  extends C8yPactHttpControllerOptions {
  /**
   * Folder to load and save pact files from and to.
   */
  folder?: string;
  /**
   * Folder to save log files to.
   */
  logFolder?: string;
  /**
   * Log file name to use for logging.
   */
  logFilename?: string;
  /**
   * User to login to the target server.
   */
  user?: string;
  /**
   * Password to login to the target server.
   */
  password?: string;
}

import _ from "lodash";
import express, { Express, Request, Response } from "express";
import cookieParser from "cookie-parser";

import { C8yPactDefaultFileAdapter } from "../../../shared/c8ypact/fileadapter";
import { relativeURL } from "../../../shared/c8ypact";
import "../../../shared/cypress";

const port = process.env.PORT || 3000;
const folder = process.env.PACT_FOLDER || process.cwd();
console.log(`Using folder: ${folder}`);

const pacts = new C8yPactDefaultFileAdapter(folder).loadPacts();
if (!pacts || Object.entries.length === 0) {
  console.error("No pacts found");
  process.exit(1);
}

const app: Express = express();
app.use(cookieParser());

type HttpMethod = "get" | "post" | "put" | "delete";

Object.entries(pacts).forEach(([key, pact]) => {
  pact.records.forEach((record) => {
    const url = record.request.url;
    const method = record.request.method?.toLocaleLowerCase() ?? "get";
    if (url && isHttpMethod(method)) {
      console.log(`Registering ${method} ${relativeURL(url)}`);

      app[method](relativeURL(url), (req: Request, res: Response) => {
        if (record.auth?.type === "CookieAuth") {
          if (req.cookies && !req.cookies["X-XSRF-TOKEN"]) {
            res.status(401).send("Unauthorized");
            return;
          }
        } else if (record.auth?.type === "BasicAuth") {
          const auth = req.headers.Authorization;
          if (!auth) {
            res.status(401).send("Unauthorized");
            return;
          }
        }
        res.removeHeader("X-Powered-By");
        res.header({
          "content-type":
            _.get(record.response.headers, ["content-type"]) ??
            "application/json",
        });
        res.json(record.response.body);
        res
          .status(record.response.status ?? 200)
          .send(record.response.statusText);
      });
    }
  });
});

app.listen(port, () => {
  console.log("Listening on port 3000");
});

function isHttpMethod(method?: string): method is HttpMethod {
  if (!method) return false;
  return ["get", "post", "put", "delete"].includes(method);
}

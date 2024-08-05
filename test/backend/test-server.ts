import express from "express";
import cookieParser from "cookie-parser";

import path from "path";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  express.static("./test/cypress/app", {
    etag: false,
    lastModified: false,
    setHeaders: setCustomHeaders,
  })
);

app.all("/*", (req, res) => {
  res.json({
    request: {
      headers: req.headers,
      body: req.body,
      cookies: req.cookies,
      method: req.method,
      url: req.url,
      auth: req.headers.authorization || req.headers.Authorization,
    },
  });
});

const PORT = 8080;
app.listen(PORT, () =>
  console.log(`Cypress test backend running on http://localhost:${PORT}`)
);

function setCustomHeaders(res: express.Response, filePath: string) {
  if (path.extname(filePath) === "") {
    res.setHeader("content-type", "application/json");
  }
}

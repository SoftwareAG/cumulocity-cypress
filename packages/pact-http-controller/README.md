# c8yctrl

`c8yctrl` is a subpackage of [cumulocity-cypress](https://github.com/SoftwareAG/cumulocity-cypress) providing a HTTP controller that allows serving static builds of Web SDK based applications or plugins and proxying API requests to Cumulocity IoT. When proxing API requests, 

`c8yctrl` allows recording of requests and responses. If recording is disabled, responses will be mocked for recorded requests to enable offline testing of applications and plugins but also microservices.

# Content
<!-- set markdown.extension.toc.levels 2..6 - level 1 is ignored in auto generated toc -->
- [Installation](#installation)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Command Line Arguments](#command-line-arguments)
  - [Configuration File](#configuration-file)
- [Rest Interface](#rest-interface)

## Installation

Install `c8yctrl` as a dev dependency in your project or install globally.

```bash
npm install cumulocity-cypress-ctrl --save-dev

npm install -g cumulocity-cypress-ctrl
```

## Configuration

### Environment Variables

```
C8Y_PACT_FOLDER=/path/to/my/recordings
C8Y_BASE_URL=https://abc.eu-latest.cumulocity.com
C8Y_BASE_USERNAME=myuser
C8Y_BASE_PASSWORD=mypassword
C8Y_BASE_TENANT=t123456
C8Y_STATIC_ROOT=/path/to/my/static/files
C8Y_HTTP_PORT=8181
C8Y_PACT_MODE=recording
```

It's recommended to use `.env` or `.c8yctrl` files to store environment variables. Both files will be automatically loaded by `c8yctrl`.

### Command Line Arguments

```shell
npx c8yctrl --pact-folder /path/to/my/recordings \ 
            --base-url https://abc.eu-latest.cumulocity.com \
            --base-username myuser \
            --base-password mypassword \
            --base-tenant t123456 \
            --static-root /path/to/my/static/files \
            --http-port 8181 \
            --pact-mode recording
```

### Configuration File

```bash
npx c8yctrl --config /path/to/my/c8yctrl.config.ts
```

```typescript
import { C8yPactHttpControllerConfig } from 'cumulocity-cypress/node';
import _ from 'lodash';

import { createLogger, format, transports } from 'winston';
// https://github.com/winstonjs/winston/issues/2430
// use following import if transports is empty
import { default as transportsDirect } from 'winston/lib/winston/transports/';

const safeTransports = !_.isEmpty(transports) ? transports : transportsDirect;

export default (config: Partial<C8yPactHttpControllerConfig>) => {
  config.logFormat = 'combined';
  config.logLevel = 'info';
  config.logger = createLogger({
    transports: [
      new safeTransports.File({
        format: format.simple(),
        filename: 'combined.log'
      })
    ]
  });

  return config;
};
```

For more details on available configuration options, see `C8yPactHttpControllerConfig` interface.

## Rest Interface


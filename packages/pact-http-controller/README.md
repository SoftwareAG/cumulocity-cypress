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
- [Usage](#usage)
  - [Using c8yctrl with cumulocity-cypress](#using-c8yctrl-with-cumulocity-cypress)
  - [From Cypress tests](#from-cypress-tests)
  - [For microservices](#for-microservices)
- [Todo](#todo)

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

Sample `c8yctrl.config.ts` registering a file logger with custom log format and log level. The config argument is optional and is only required if a different config file than `c8yctrl.config.ts` is used. 

```typescript
import { C8yPactHttpControllerConfig } from 'cumulocity-cypress-ctrl';
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
};
```

For more details on available configuration options, see `C8yPactHttpControllerConfig` interface.

## Rest Interface

`c8yctrl` provides a REST interface to interact with the HTTP controller. The interface is available via `/c8yctrl` and provides endpoints .

## Usage


### Using c8yctrl with cumulocity-cypress

### From Cypress tests

To use `c8yctrl` from Cypress tests without or an older version of  `cumulocity-cypress`, it is needed to configure `c8yctrl` directly using its REST interface. 

Example:

```typescript
before(() => {
  // required if requests need to be recorded in global before () hook
  cy.wrap(c8yctrl('global before hook')).then((response: Response) => {
    // run requests from here as for example
    cy.getAuth('admin').getCurrentTenant();
  });

  // create recording for all suite start events. without, requests might be
  // recorded for the previous (currently active) test case.
  // this will ensure for every suite start a new recording is created
  const runner = Cypress.mocha.getRunner();
  runner.on('suite', (suite) => c8yctrl(getSuiteTitles(suite)));
});

// create recording for each test. name for the recording will be the test title
// including all suites it its hierarchy
beforeEach(() => {
  cy.wrap(c8yctrl(), { log: false });
});

function getSuiteTitles(suite) {
  if (suite.parent && !_.isEmpty(suite.parent.title)) {
    return [...getSuiteTitles(suite.parent), suite.title];
  } else {
    return [suite.title];
  }
}

// sample wrapper for c8yctrl REST interface. extend as needed.
function c8yctrl(title: string | string[] = Cypress.currentTest.titlePath) {
  const recording = Cypress.env('C8Y_PACT_MODE') === 'recording';
  const parameter: string = recording ? '?recording=true&clear' : '?recording=false';

  return (cy.state('window') as Cypress.AUTWindow).fetch(
    `${Cypress.config().baseUrl}/c8yctrl/current${parameter}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
      }),
    }
  );
}
```

### For microservices

## Todo

- [X] document recording for before() hooks from your tests
- [X] document recording tests suite for a separate id
- [X] save pact file only when first record is added - no file for empty suites
- [X] allow multiple request logger
- [ ] allow adding custom request handlers (maybe for logging or other purposes)
- [ ] new C8Y_PACT_MODE to enable testing without recording or mocking
- [ ] avoid recording of requests that are already recorded (configurable)
- [ ] join pact ids with suite ids
- [ ] pass C8yPactConfigOptions and TestConfigOverrides to store in pact file
- [ ] store tags from test cases in recording
- [ ] rename interface to /c8yctrl/current
- [ ] add support for recording realtime notifications API
- [ ] automatically reduce timeouts when mocking, e.g. in visitAndWaitForSelector
- [ ] pass auth user and alias to store in record
- [ ] allow mocking configurable requests or cypress hooks
- [X] allow passing strictMocking as parameter to /c8yctrl/current
- [X] add logging from via c8yctrl from cypress tests 
- [ ] disable login via cy.session when recording
- [X] read parameters for c8yctrl from query and body
- [X] add sample config file to contributions folder
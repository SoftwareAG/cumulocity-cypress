import "../commands";
import "../commands/c8ypact";

import { pactId } from "../../shared/c8ypact";

import {
  ClickAction,
  getSelector,
  HighlightAction,
  isScreenshotAction,
  Screenshot,
  ScreenshotAction,
  ScreenshotConfig,
  TypeAction,
} from "./screenshot-config";

import { C8yAjvSchemaMatcher } from "../../contrib/ajv";
import schema from "./c8yscreenshot.schema.json";

const { _ } = Cypress;

const yaml: ScreenshotConfig = Cypress.env("_autoScreenshot");
if (!yaml) {
  throw new Error("No config. Please check the screenshots.config.yml file.");
}

if (!schema) {
  throw new Error(
    "No schema. Please check the c8yscreenshot.schema.json file."
  );
}

const ajv = new C8yAjvSchemaMatcher();
ajv.match(yaml, schema, true);

const actionHandlers: {
  [key: string]: (action: any, item: Screenshot, options: any) => void;
} = {
  click,
  type,
  highlight,
  screenshot,
};

const CyScreenshotOptionKeys = [
  "capture",
  "scale",
  "padding",
  "overwrite",
  "disableTimersAndAnimations",
];

const defaultOptions: Partial<Cypress.ScreenshotOptions> = _.defaults(
  _.omitBy(_.pick(yaml.config ?? {}, CyScreenshotOptionKeys), _.isNil),
  {
    overwrite: true,
    disableTimersAndAnimations: true,
  }
);

const user = yaml.config?.user;
if (user != null) {
  before(() => {
    cy.getAuth(user).getTenantId();
  });
}

describe(yaml.title ?? `screenshot workflow`, () => {
  beforeEach(() => {
    if (Cypress.env("C8Y_CTRL_MODE") != null) {
      cy.wrap(c8yctrl(), { log: false });
    }
  });

  yaml.screenshots?.forEach((item) => {
    const user = yaml.config?.user ?? item.config?.user ?? "admin";
    const language = yaml.config?.language ?? item.config?.language ?? "en";
    const tags = yaml.config?.tags ?? item.config?.tags;
    const annotations: any = {};

    const shellName = yaml.config?.shellName ?? item.config?.shellName;
    cy.getAuth(user).getShellVersion(shellName);
    const shell = yaml.config?.shell != null ?? item.config?.shell != null;
    if (shell != null) {
      annotations.requires = {
        shell: _.isArray(shell) ? shell : [shell],
      };
    }
    if (tags != null) {
      annotations.tags = _.isArray(tags) ? tags : [tags];
    }

    let fn = item.only === true ? it.only : it;
    fn = item.skip === true ? it.skip : fn;

    fn.apply(null, [
      `${item.image}`,
      annotations,
      // @ts-expect-error
      () => {
        const width =
          yaml.config?.viewportWidth ??
          item.config?.viewportWidth ??
          Cypress.config("viewportWidth") ??
          1920;
        const height =
          yaml.config?.viewportHeight ??
          item.config?.viewportWidth ??
          Cypress.config("viewportHeight") ??
          1080;
        cy.viewport(width, height);

        const options = _.defaults(
          _.omitBy(_.pick(item.config ?? {}, CyScreenshotOptionKeys), _.isNil),
          defaultOptions
        );

        const visitUser = _.isString(item.visit)
          ? user
          : (item.visit as any).user;

        cy.login(visitUser || user);

        const url = _.isString(item.visit) ? item.visit : item.visit.url;
        const visitSelector = _.isString(item.visit)
          ? undefined
          : item.visit.selector;
        const visitTimeout = _.isString(item.visit)
          ? undefined
          : item.visit.timeout;

        cy.visitAndWaitForSelector(url, language, visitSelector, visitTimeout);

        let actions = item.do == null ? [] : item.do;
        actions = _.isArray(actions) ? actions : [actions];
        actions.forEach((action) => {
          const handler = actionHandlers[Object.keys(action)[0]];
          if (handler) {
            if (isScreenshotAction(action)) {
              const clipArea = action.screenshot?.clip;
              if (clipArea) {
                options["clip"] = {
                  x: Math.max(clipArea.x, 0),
                  y: Math.max(clipArea.y, 0),
                  width:
                    clipArea.width < 0
                      ? width + clipArea.width
                      : clipArea.width,
                  height:
                    clipArea.height < 0
                      ? height + clipArea.height
                      : clipArea.height,
                };
              }
            }
            handler(action, item, options);
          }
        });

        const lastAction = _.last(actions);
        if (
          _.isEmpty(actions) ||
          !lastAction ||
          !isScreenshotAction(lastAction)
        ) {
          cy.screenshot(item.image, options);
        }
      },
    ]);
  });
});

function click(action: ClickAction) {
  const selector = getSelector(action.click?.selector);
  if (selector == null) return;
  cy.get(selector).click();
}

function type(action: TypeAction) {
  const selector = getSelector(action.type?.selector);
  if (selector == null || action.type == null) return;
  cy.get(selector).type(action.type.value);
}

function highlight(action: HighlightAction) {
  const highlights = _.isArray(action.highlight)
    ? action.highlight
    : [action.highlight];

  highlights?.forEach((highlight) => {
    const selector = getSelector(highlight?.selector);
    if (selector != null) {
      cy.get(selector).then(($element) => {
        if (highlight?.styles != null) {
          $element.css(highlight.styles);
        } else if (highlight?.border != null) {
          $element.css("border", highlight.border || "2px solid red");
        } else if (highlight?.text != null) {
          cy.get(selector).then(($element) => {
            $element.text(highlight.text!);
          });
        }
      });
    }
  });
}

function screenshot(action: ScreenshotAction, item: Screenshot, options: any) {
  const name = action.screenshot?.path || item.image;
  const selector = getSelector(action.screenshot?.selector);
  if (selector != null) {
    cy.get(selector).screenshot(name, options);
  } else {
    cy.screenshot(name, options);
  }
}

/**
 * Update c8yctrl pact file to be used for recording or mocking.
 * @param titleOrId An id or array of titles with names of suite or titles
 */
export function c8yctrl(
  titleOrId: string | string[] = Cypress.c8ypact.getCurrentTestId()
): Promise<Response> {
  const id = pactId(titleOrId);
  const parameter: string = isRecording()
    ? "?recording=true&clear"
    : "?recording=false";

  return (cy.state("window") as Cypress.AUTWindow).fetch(
    `${Cypress.config().baseUrl}/c8yctrl/current${parameter}&id=${id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    }
  );
}

export function isRecording(): boolean {
  return Cypress.env("C8Y_CTRL_MODE") === "recording";
}

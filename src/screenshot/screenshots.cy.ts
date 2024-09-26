import "../lib/commands";
import "../lib/commands/c8ypact";

import { pactId } from "../shared/c8ypact";

import {
  Action,
  ClickAction,
  HighlightAction,
  Screenshot,
  ScreenshotAction,
  ScreenshotSetup,
  Selector,
  TypeAction,
  Visit,
} from "../lib/screenshots/types";

import { C8yAjvSchemaMatcher } from "../contrib/ajv";
import schema from "./schema.json";

const { _ } = Cypress;

const yaml: ScreenshotSetup = Cypress.env("_autoScreenshot");
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

const CyScreenshotSettingsKeys = [
  "capture",
  "scale",
  "padding",
  "overwrite",
  "disableTimersAndAnimations",
];

const defaultOptions: Partial<Cypress.ScreenshotOptions> = _.defaults(
  _.omitBy(_.pick(yaml.global ?? {}, CyScreenshotSettingsKeys), _.isNil),
  {
    overwrite: true,
    disableTimersAndAnimations: true,
  }
);

describe(yaml.title ?? `screenshot workflow`, () => {
  before(() => {
    if (yaml.global?.user) {
      cy.getAuth(yaml.global?.user).getShellVersion(yaml.global?.shell);
    } else {
      cy.getShellVersion(yaml.global?.shell);
    }
  });

  beforeEach(() => {
    if (Cypress.env("C8Y_CTRL_MODE") != null) {
      cy.wrap(c8yctrl(), { log: false });
    }
  });

  yaml.screenshots?.forEach((item) => {
    const annotations: any = {};

    const required = item.requires ?? yaml.global?.requires;
    if (required != null) {
      annotations.requires = {
        shell: _.isArray(required) ? required : [required],
      };
    }

    const tags = item.tags ?? yaml.global?.tags;
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
        const user = item.user ?? yaml.global?.user ?? "admin";
        cy.getAuth(user).getTenantId();

        const width =
          yaml.global?.viewportWidth ??
          item.settings?.viewportWidth ??
          Cypress.config("viewportWidth") ??
          1920;
        const height =
          yaml.global?.viewportHeight ??
          item.settings?.viewportWidth ??
          Cypress.config("viewportHeight") ??
          1080;
        cy.viewport(width, height);

        const options = _.defaults(
          _.omitBy(
            _.pick(item.settings ?? {}, CyScreenshotSettingsKeys),
            _.isNil
          ),
          defaultOptions
        );

        const visitUser = _.isString(item.visit)
          ? user
          : (item.visit as any).user;

        cy.login(visitUser || user);

        const visitObject = getVisitObject(item.visit);
        const url = visitObject?.url ?? item.visit as string;
        const visitSelector = visitObject?.selector;
        const visitTimeout = visitObject?.timeout;

        const language =
          visitObject?.language ??
          item.language ??
          yaml.global?.language ??
          "en";
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

function getVisitObject(visit: string | Visit): Visit | undefined {
  return _.isString(visit) ? undefined : visit;
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

export function isClickAction(action: Action): action is ClickAction {
  return "click" in action;
}

export function isTypeAction(action: Action): action is TypeAction {
  return "type" in action;
}

export function isHighlightAction(action: Action): action is HighlightAction {
  return "highlight" in action;
}

export function isScreenshotAction(action: Action): action is ScreenshotAction {
  return "screenshot" in action;
}

export function getSelector(
  selector: Selector | undefined
): string | undefined {
  if (!selector) {
    return undefined;
  }
  if (_.isString(selector)) {
    return selector;
  }
  if (_.isPlainObject(selector)) {
    if ("data-cy" in selector) {
      return `[data-cy=${_.get(selector, "data-cy")}]`;
    }
  }
  return undefined;
}

const { _ } = Cypress;

export type ScreenshotConfig = {
  /**
   * The title used for root Cypress suite
   */
  title?: string;
  config: Setup;
  screenshots: Screenshot[];
};

export type Screenshot = {
  image: string;
  visit: string | Visit;
  do?: Action[] | Action;
  only?: boolean;
  skip?: boolean;
  config?: Setup;
};

type Setup = {
  /**
   * The width in px to use for the browser window
   * @minimum 0
   * @default 1920 
   * @TJS-type integer
   */
  viewportWidth?: number;
  /**
   * The height in px to use for the browser window
   * @minimum 0
   * @default 1080 
   * @TJS-type integer
   */
  viewportHeight?: number;
  /**
   * The language to use for taking screenshots
   * @example "en"
   */
  language?: C8yLanguage;
  /**
   * The user to login representing the env variabls of type *user*_username and *user*_password
   */
  user: string;
  /**
   * Tag screenshots to enable filtering based on tags provided
   */
  tags?: string[];
  /**
   * The type of capturing the screenshot. When fullPage is used, the application is captured in its entirety from top to bottom. Setting is ignored when screenshots are taken for a selected element.
   */
  capture?: "viewport" | "fullPage";
  padding?: number;
  scale?: number;
  overwrite?: boolean;
  disableTimersAndAnimations?: boolean;
  shell?: string;
  shellName?: string;
};

type Visit = {
  url: string;
  user?: string;
  timeout?: number;
  selector?: string;
};

export type ClickAction = {
  click?: {
    selector: Selector;
  };
};

export type TypeAction = {
  type?: {
    selector: Selector;
    value: string;
  };
};

export type HighlightActionProperties = {
  selector: Selector;
  border?: string;
  styles?: any;
  text?: string;
};

export type HighlightAction = {
  highlight?: HighlightActionProperties | HighlightActionProperties[];
};

type ScreenshotClipArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Selector =
  | string
  | {
      "data-cy"?: string;
    };

export type ScreenshotAction = {
  screenshot?: {
    path?: string;
    clip?: ScreenshotClipArea;
    selector?: Selector;
  };
};

type Action = ClickAction | TypeAction | ScreenshotAction | HighlightAction;

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

export type ScreenshotSetup = {
  /**
   * The title used for root Cypress suite
   */
  title?: string;
  global: ScreenshotSettings & TestcaseOptions & GlobalVisitOptions;
  screenshots: Screenshot[];
};

export type TestcaseOptions = {
  /**
   * Tag screenshots to enable filtering based on tags provided
   */
  tags?: string[];
  shell?: string;
  requires?: string | string[];
};

export type GlobalVisitOptions = {
  /**
   * The language to use for taking screenshots
   * @example "en"
   */
  language?: C8yLanguage;
  /**
   * The user to login representing the env variabls of type *user*_username and *user*_password
   */
  user: string;
};

export type Screenshot = GlobalVisitOptions & TestcaseOptions & {
  image: string;
  visit: string | Visit;
  do?: Action[] | Action;
  requires?: string | string[];
  only?: boolean;
  skip?: boolean;
  settings?: ScreenshotSettings;
};

type ScreenshotSettings = {
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
   * The type of capturing the screenshot. When fullPage is used, the application is captured in its entirety from top to bottom. Setting is ignored when screenshots are taken for a selected element.
   */
  capture?: "viewport" | "fullPage";
  padding?: number;
  scale?: number;
  overwrite?: boolean;
  disableTimersAndAnimations?: boolean;
};

export type Visit = GlobalVisitOptions & {
  url: string;
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

export type ScreenshotClipArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Selector =
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

export type Action =
  | ClickAction
  | TypeAction
  | ScreenshotAction
  | HighlightAction;

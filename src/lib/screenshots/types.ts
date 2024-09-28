export type ScreenshotSetup = {
  /** @format uri */
  baseUrl?: string;
  /**
   * The title used for root Cypress suite
   */
  title?: string;
  global?: ScreenshotSettings & TestcaseOptions & GlobalVisitOptions;
  screenshots: Screenshot[];
};

export type TestcaseOptions = {
  /**
   * Tags allow grouping and filtering of screenshots (optional)
   */
  tags?: string[];
  /**
   * The shell is used to dermine the version of the application used by "requires" (optional)
   * @examples ["cockpit, devicemanagement, oee"]
   */
  shell?: string;
  /**
   * The required semver version range of the shell applications. If the shell version does not satisfy the range, the screenshot is skipped. (optional)
   * @format semver-range
   * @examples ["1.x, ^1.0.0, >=1.0.0 <2.0.0"]
   */
  requires?: SemverRange;
};

export type SemverRange = string;

export type GlobalVisitOptions = {
  /**
   * The language to use for taking screenshots
   * @example "en"
   */
  language?: C8yLanguage;
  /**
   * The user to login representing the env variabls of type *user*_username and *user*_password
   */
  user?: string;
  /** @format date-time
   * @examples ["2024-09-26T19:17:35+02:00"]
   */
  date?: string;
};

export type Screenshot = GlobalVisitOptions &
  TestcaseOptions & {
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

export interface C8yScreenshotOptions {
  baseUrl: string;
  config: string;
  folder: string;
  open: boolean;
  browser: string;
  tags: string[];
  quiet: boolean;
  setup: ScreenshotSetup;
}

export type C8yScreenshotActionHandler = (
  action: any,
  item: Screenshot,
  options: any
) => void;

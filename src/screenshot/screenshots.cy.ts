import { C8yScreenshotRunner } from "./runner";

import '@cypress/grep';
// @ts-expect-error
import registerCypressGrep from '@cypress/grep/src/support';

registerCypressGrep();

// undefined is passed as config, so the runner will look for the configuration 
// in the environment variables created by startup script.
const c8yscrn = new C8yScreenshotRunner(undefined);
c8yscrn.run()
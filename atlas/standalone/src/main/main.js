/**
 * ATLAS Standalone shim entrypoint
 *
 * `atlas/standalone/package.json` points to `src/main/main.js`, but the
 * canonical Electron app code lives in `atlas/src/main/main.js`.
 *
 * This shim keeps `npm start` working from `atlas/standalone/` by delegating
 * to the real entrypoint.
 */

require('../../../src/main/main.js');



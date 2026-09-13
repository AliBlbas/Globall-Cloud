/* Globall Cloud — compatibility service-worker entrypoint.
 * The public runtime historically referenced sw-v98.js. Keep that URL valid and
 * delegate to the canonical network-first worker so an old/mobile registration
 * can never fail because the script is missing.
 */
importScripts('/sw.js');

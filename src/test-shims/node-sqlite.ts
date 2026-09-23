/**
 * Vitest-only shim for `node:sqlite`.
 *
 * node:sqlite is an experimental module (not listed in
 * module.builtinModules), which breaks Vite's resolver under Vitest.
 * Loading it through createRequire sidesteps the resolver while the
 * real application keeps importing `node:sqlite` directly (Next.js
 * webpack handles it fine).
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('node:sqlite') as typeof import('node:sqlite');

export const DatabaseSync = mod.DatabaseSync;

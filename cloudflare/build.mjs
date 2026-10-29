/**
 * Empacota o Worker: index.js + módulos .ts → dist/index.js (JS puro).
 * Rodar antes do deploy (o predeploy do npm já faz isso):
 *   node build.mjs
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['worker', 'import', 'default'],
  logLevel: 'info',
});

// Runs the demo seeds, then every browser suite (or the ones named: `npm run e2e -- editor themes`).
// Expects a running site at BASE_URL (default http://localhost:8080) on a freshly migrated database.
import { spawnSync } from 'node:child_process';

const SEEDS = ['amsr', 'classic', 'motion', 'extras'];
const SUITES = [
  'forms-and-blocks',
  'editor',
  'collections',
  'themes',
  'classic',
  'motion',
  'motion-scroll',
  'motion-more',
  'extras',
  'persian-admin-and-images',
  'security',
  'history',
  'layout',
  'templates',
  'media',
  'speed',
  'import',
  'business',
];
const only = process.argv.slice(2);
const dir = new URL('./', import.meta.url).pathname;
const run = (file) =>
  spawnSync(process.execPath, [dir + file], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 10 * 60_000 });

if (!process.env.SKIP_SEEDS) {
  for (const seed of SEEDS) {
    const r = run(`seeds/${seed}.mjs`);
    console.log(`seed ${seed}: ${r.status === 0 ? 'ok' : 'FAILED'}`);
    if (r.status !== 0) {
      console.log(r.stdout, r.stderr);
      process.exit(1);
    }
  }
}

const results = [];
for (const suite of only.length ? only : SUITES) {
  const started = Date.now();
  const r = run(`${suite}.mjs`);
  const out = `${r.stdout}${r.stderr}`;
  const pass = (out.match(/^PASS /gm) ?? []).length;
  const fail = (out.match(/^FAIL /gm) ?? []).length;
  const ok = r.status === 0 && fail === 0;
  results.push(ok);
  console.log(`${ok ? '✓' : '✗'} ${suite}: ${pass} passed, ${fail} failed (${Math.round((Date.now() - started) / 1000)}s)`);
  if (!ok)
    console.log(
      out
        .split('\n')
        .filter((l) => !l.startsWith('PASS '))
        .join('\n'),
    );
}
process.exit(results.every(Boolean) ? 0 : 1);

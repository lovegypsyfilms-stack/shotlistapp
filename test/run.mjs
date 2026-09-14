// Runs every numbered suite in this folder, in order.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const dir = path.dirname(new URL(import.meta.url).pathname);
const files = fs.readdirSync(dir).filter(f => /^\d\d-.*\.mjs$/.test(f)).sort();
let failed = 0;

for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' });
  process.stdout.write(r.stdout || '');
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) failed++;
}

console.log(failed ? `\n${failed} of ${files.length} suites FAILED` : `\nall ${files.length} suites passed`);
process.exit(failed ? 1 : 0);

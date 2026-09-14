#!/usr/bin/env node
// Bump the build stamp in index.html and VERSION in service-worker.js together.
// They must match: the stamp is what you read in the ••• menu, the VERSION is
// what tells the phone a new build exists.
//
//   npm run stamp            -> today's date plus a letter
//   npm run stamp 2026-09-14-B
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const idx = path.join(ROOT, 'index.html');
const sw  = path.join(ROOT, 'service-worker.js');

let html = fs.readFileSync(idx, 'utf8');
let worker = fs.readFileSync(sw, 'utf8');

let build = process.argv[2];
if (!build) {
  const d = new Date().toISOString().slice(0, 10);
  const prev = (html.match(/BUILD (\d{4}-\d{2}-\d{2})-([A-Z])/) || []);
  build = (prev[1] === d)
    ? `${d}-${String.fromCharCode(prev[2].charCodeAt(0) + 1)}`
    : `${d}-A`;
}

const before = html;
html = html.replace(/BUILD [0-9]{4}-[0-9]{2}-[0-9]{2}-[A-Z]/g, 'BUILD ' + build);
worker = worker.replace(/const VERSION = '[^']*';/, `const VERSION = '${build}';`);

if (html === before) {
  console.error('no BUILD stamp found in index.html — did the menu entry get removed?');
  process.exit(1);
}
fs.writeFileSync(idx, html);
fs.writeFileSync(sw, worker);
console.log('stamped ' + build);

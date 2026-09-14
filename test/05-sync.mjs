// The merge rules, against the real cloud-sync.js. No Firebase: the "server"
// is a plain object updated exactly as update(room,patch) would.
import fs from 'fs';
import path from 'path';
import { suite } from './harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const raw = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
const head = raw.split('/* ---------- startup ---------- */')[0]
  .replace('const CFG = window.SYNC_CONFIG || {};', 'const CFG = {};')
  .replace('const BRIDGE = window.APPBRIDGE;', 'let BRIDGE = null; function setBridge(b){ BRIDGE = b; }')
  .replace("const el = document.getElementById('syncStatus');", 'const el = null;');
const core = new Function(head + '; return {collectChanges, applyRemote, enc, dec, setBridge};')();

const t = suite('sync');
class Store {
  constructor(){ this.m = new Map(); }
  getItem(k){ return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k,v){ this.m.set(k, String(v)); }
  removeItem(k){ this.m.delete(k); }
}
const SERVER = {};
const push = patch => { for (const [p, v] of Object.entries(patch)) {
  const q = p.split('/'); let n = SERVER;
  for (let i = 0; i < q.length - 1; i++) { n[q[i]] ??= {}; n = n[q[i]]; }
  n[q.at(-1)] = v; } };

class Device {
  constructor(){ this.ls = new Store(); }
  use(clock){ globalThis.localStorage = this.ls; globalThis.Date.now = () => clock;
              core.setBridge({ projectIds: () => ['diary','island'], pid: () => 'diary', refresh(){} }); }
  tick(pid,id,at){ const k = pid+'-done-v1', o = JSON.parse(this.ls.getItem(k)||'{}'); o[id]=at; this.ls.setItem(k,JSON.stringify(o)); }
  untick(pid,id){ const k = pid+'-done-v1', o = JSON.parse(this.ls.getItem(k)||'{}'); delete o[id]; this.ls.setItem(k,JSON.stringify(o)); }
  ticks(pid){ return Object.keys(JSON.parse(this.ls.getItem(pid+'-done-v1')||'{}')).sort(); }
  send(clock){ this.use(clock); const { patch, n } = core.collectChanges(); push(patch); return n; }
  recv(clock){ this.use(clock); core.applyRemote(SERVER); }
}
const realNow = Date.now;
const A = new Device(), B = new Device();

A.tick('diary','a',1000); A.send(1000); B.recv(1010);
t.ok(B.ticks('diary').join() === 'a', 'a tick crosses to the other device');

// both offline, ticking different things — the field case
A.tick('diary','b',2000); B.tick('diary','c',2100);
A.send(2000); B.recv(2200); B.send(2200); A.recv(2300);
t.ok(A.ticks('diary').join() === 'a,b,c', `both sets survive the reunion (${A.ticks('diary').join()})`);
t.ok(A.ticks('diary').join() === B.ticks('diary').join(), 'and the devices agree');

// the bug that dropped offline ticks: applyRemote must not swallow local ones
const C = new Device(), D = new Device();
const S2 = SERVER;
C.tick('diary','x',5000); C.send(5000);
D.tick('diary','y',5100); D.tick('diary','z',5100);
D.recv(5200); D.send(5200); C.recv(5300);
t.ok(C.ticks('diary').includes('y') && C.ticks('diary').includes('z'),
     'ticks made before the first pull still upload');

// unticking travels and is not resurrected
B.untick('diary','a'); B.send(6000); A.recv(6100);
t.ok(!A.ticks('diary').includes('a'), 'an untick clears the other device');
A.send(6200); B.recv(6300);
t.ok(!B.ticks('diary').includes('a'), 'and is not resurrected by a stale tick');

// same item, both devices — latest wins
A.untick('diary','b'); A.send(7000);
B.tick('diary','b',8000); B.send(8000); A.recv(8100);
t.ok(A.ticks('diary').includes('b'), 'same-item conflict: the later change wins');

// keys with / and | survive Firebase encoding
const label = 'SEP 11 | FRIDAY | VIRGO/LIBRA';
t.ok(core.dec(core.enc(label)) === label, 'labels with / and | round-trip');

// a no-op sync writes nothing
t.ok(A.send(9000) === 0, 'nothing changed, nothing written');

globalThis.Date.now = realNow;
t.done();

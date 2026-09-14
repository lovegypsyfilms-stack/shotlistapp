// Shared jsdom harness. Boots index.html with the gaps jsdom leaves.
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

export function boot(opts = {}) {
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
    beforeParse(w) {
      // jsdom gaps, not app behaviour
      w.Element.prototype.scrollIntoView = function () {};
      w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                              addEventListener(){}, removeEventListener(){} });
      try { delete w.navigator.serviceWorker; } catch (e) {}
      w.document.elementFromPoint = () => w.__drop || null;
      w.prompt  = () => w.__prompt;
      w.__asked = [];
      w.confirm = m => { w.__asked.push(m); return w.__yes !== false; };
      if (opts.store) for (const [k, v] of opts.store) w.localStorage.setItem(k, v);
      if (opts.beforeParse) opts.beforeParse(w);
    }
  });
  return dom.window;
}

export const wait = ms => new Promise(r => setTimeout(r, ms));
export const ready = async (w, ms = 380) => { await wait(ms); return w; };

export const $  = (w, s) => w.document.querySelector(s);
export const $$ = (w, s) => [...w.document.querySelectorAll(s)];

export const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles:true, detail:1 }));
export const dbl   = (w, el) => { click(w, el); el.dispatchEvent(new w.MouseEvent('dblclick', { bubbles:true, detail:2 })); };
export function pointer(w, type, el, o = {}) {
  const e = new w.MouseEvent(type, { bubbles:true, cancelable:true, ...o });
  Object.defineProperty(e, 'pointerType', { value: o.pt || 'mouse' });
  el.dispatchEvent(e);
  return e;
}

// ---- tiny runner -----------------------------------------------------------
export function suite(name) {
  const t = { name, fails: 0, n: 0 };
  t.ok = (cond, msg) => {
    t.n++;
    if (!cond) t.fails++;
    console.log((cond ? '  PASS  ' : '  FAIL  ') + msg);
  };
  t.done = () => {
    console.log(`\n${name}: ${t.fails ? t.fails + ' FAILED' : 'ALL PASSED'} (${t.n} checks)\n`);
    if (t.fails) process.exitCode = 1;
  };
  return t;
}

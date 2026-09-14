// Everything is movable and deletable, on both input types, and every delete asks.
import { boot, ready, suite, $, $$, click, pointer, wait } from './harness.mjs';
const t = suite('structure');

for (const kind of ['mouse', 'touch']) {
  const w = await ready(boot());
  const hold = kind === 'mouse' ? 0 : 280;
  const down = (el, x, y) => pointer(w, 'pointerdown', el, { clientX:x, clientY:y, button:0, pt:kind });
  const move = (x, y) => pointer(w, 'pointermove', w.document, { clientX:x, clientY:y, pt:kind });
  const up = () => pointer(w, 'pointerup', w.document, { pt:kind });

  click(w, $(w, '#editBtn')); await wait(250);
  const tag = kind.padEnd(5);

  // drag handles
  down($(w, '#dayArea .locNum[data-grip]'), 30, 200);
  if (hold) await wait(hold);
  move(40, 230); await wait(40);
  t.ok(w.eval('headDrag!==null'), `${tag} drag a location from its number`);
  up(); await wait(180);

  down($(w, '#dayArea .sceneHead .grip'), 30, 300);
  if (hold) await wait(hold);
  move(40, 330); await wait(40);
  t.ok(w.eval('headDrag!==null'), `${tag} drag a scene from its grip`);
  up(); await wait(180);

  // the name must NOT drag — it is for editing
  down($(w, '#dayArea .locName'), 120, 200);
  if (hold) await wait(hold);
  move(140, 230); await wait(40);
  t.ok(w.eval('headDrag===null'), `${tag} the name does not drag`);
  up(); await wait(120);

  // deletes ask first
  w.__asked = []; w.__yes = false;
  const scenes0 = $$(w, '#dayArea .scene').length;
  click(w, $(w, '#dayArea [data-delscene]')); await wait(180);
  t.ok(w.__asked.length === 1 && /Delete ".+"/.test(w.__asked[0]), `${tag} deleting a scene asks, naming it`);
  t.ok($$(w, '#dayArea .scene').length === scenes0, `${tag} saying no keeps it`);

  w.__yes = true;
  click(w, $(w, '#dayArea [data-delscene]')); await wait(220);
  t.ok($$(w, '#dayArea .scene').length === scenes0 - 1, `${tag} saying yes deletes it`);
  w.eval('doUndo()'); await wait(200);
  t.ok($$(w, '#dayArea .scene').length === scenes0, `${tag} undo restores it`);

  // tabs
  w.__prompt = 'RENAMED';
  const t0 = $(w, '#dayTitle .head').textContent.trim();
  click(w, $(w, '#dayTitle .head')); await wait(220);
  t.ok($(w, '#dayTitle .head').textContent.trim() !== t0, `${tag} rename a tab`);
  w.eval('doUndo()'); await wait(200);

  const n0 = $$(w, '#dayTabs button[data-day]').length;
  w.__prompt = 'NEW';
  click(w, $(w, '#dayTabs [data-addday]')); await wait(250);
  t.ok($$(w, '#dayTabs button[data-day]').length === n0 + 1, `${tag} add a tab`);
  click(w, $(w, '#delDayBtn')); await wait(250);
  t.ok($$(w, '#dayTabs button[data-day]').length === n0, `${tag} delete a tab`);

  // no red X anywhere
  t.ok($$(w, '.headDel,#delDayBtn').every(b => b.querySelector('svg')), `${tag} deletes use a bin, not a ✕`);
}
t.done();

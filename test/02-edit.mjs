// EDIT mode, and the three bugs that kept coming back.
import { boot, ready, suite, $, $$, click, dbl, pointer, wait } from './harness.mjs';
const t = suite('edit');
const w = await ready(boot());
const cs = e => w.getComputedStyle(e);
const rules = [...w.document.styleSheets[0].cssRules];
// a selector can appear more than once; take the last one that actually sets it
const rule = (sel, prop) => {
  const hits = rules.filter(r => r.selectorText === sel)
                    .map(r => r.style.getPropertyValue(prop))
                    .filter(v => v);
  return hits.length ? hits[hits.length - 1] : '';
};

// --- off by default, tap ticks
t.ok(w.eval('EDITMODE') === false, 'starts off');
let cards = $$(w, '#dayArea .shot[data-shot]');
click(w, cards[0]); await wait(60);
t.ok(cards[0].classList.contains('done'), 'with EDIT off a tap ticks');
click(w, cards[0]); await wait(60);

// --- on
click(w, $(w, '#editBtn')); await wait(250);
t.ok(w.eval('EDITMODE') === true, 'EDIT on');
t.ok(w.localStorage.getItem('island-editmode') === '1', 'remembered between launches');

// --- EDIT must be reachable everywhere (it used to live in a strip that hides)
const visible = () => { let el = $(w, '#editBtn'); if (!el) return false;
  for (; el && el !== w.document.body; el = el.parentElement)
    if (cs(el).display === 'none') return false;
  return true; };
t.ok($$(w, '#editBtn').length === 1, 'exactly one EDIT button');
// What actually bit was EDIT living inside #locTabs, which hides while
// filtering, in the PICKUPS view and on any tab with no locations. Pin that,
// not one particular row — anywhere in the header that does not hide is fine.
const eb = $(w, '#editBtn');
t.ok(!!eb && !eb.closest('#locTabs') && !!eb.closest('header.top'),
     'sits in the header, outside the strip that hides');
w.eval('state.day=-1; render();'); await wait(220);
t.ok(visible(), 'still reachable in the PICKUPS view');
w.eval('state.day=0; render();'); await wait(220);

// --- consecutive edits (startEdit used to open a detached node)
let opened = 0, right = 0;
for (let i = 0; i < 8; i++) {
  const c = $$(w, '#dayArea .shot[data-shot]')[i];
  const want = c.dataset.shot;
  pointer(w, 'pointerup', c.querySelector('.shotLabel'), { pt: 'touch' });
  await wait(50);
  if (w.eval('editing!==null')) {
    opened++;
    if (w.eval('editing.dataset.for') === want && w.eval('document.contains(editing)')) right++;
  }
}
t.ok(opened === 8, `${opened}/8 consecutive taps opened an editor`);
t.ok(right === 8, `${right}/8 opened the right field, still attached`);
w.eval('finishEdit(true)'); await wait(80);

// --- the zoom causes
t.ok(rule('[data-edit].editing', 'font-size') === '16px', 'focused field is 16px — under that iOS zooms');
t.ok(rule('.shot', 'touch-action') === 'manipulation', 'cards opt out of double-tap zoom');

// --- an empty detail is tappable
const empty = $$(w, '#dayArea .shot[data-shot]').find(c => c.querySelector('.shotDetail.empty2'));
if (empty) {
  t.ok(rule('body.editmode .shotDetail.empty2', 'min-height') === '20px', 'an empty detail gets a real tap target');
  pointer(w, 'pointerup', empty.querySelector('.shotDetail'), { pt: 'touch' }); await wait(80);
  t.ok(w.eval('editing!==null'), 'and it opens');
  w.eval("editing.textContent='added'; finishEdit(true);"); await wait(150);
} else t.ok(true, '(no empty detail on this tab to test)');

// --- headings are editable and look it
t.ok(cs($(w, '#dayArea .locName')).boxShadow.includes('inset'), 'headings shown as fields in EDIT');
dbl(w, $(w, '#dayArea .sceneName')); await wait(140);
t.ok(w.eval('editing!==null'), 'double-click opens a scene name (desktop)');
w.eval('finishEdit(true)'); await wait(120);
pointer(w, 'pointerup', $(w, '#dayArea .locName'), { pt: 'touch' });
click(w, $(w, '#dayArea .locName')); await wait(140);
t.ok(w.eval('editing!==null'), 'one tap opens a location name (phone)');
w.eval('finishEdit(true)'); await wait(120);

// --- shot dragging is deliberately off in EDIT
pointer(w, 'pointerdown', $$(w, '#dayArea .shot[data-shot]')[0], { clientX:100, clientY:100, button:0, pt:'touch' });
await wait(400);
t.ok(w.eval('drag') === null, 'a resting finger does not start a drag in EDIT');
pointer(w, 'pointerup', w.document, { pt:'touch' }); await wait(80);

t.done();

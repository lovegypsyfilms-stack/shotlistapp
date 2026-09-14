// The moon maths, against Meeus's own worked examples.
import { boot, ready, suite, $, $$, click, wait } from './harness.mjs';
const t = suite('astro');
const w = await ready(boot());

// Meeus example 47.a — 1992 April 12.0 TD
const geo = w.eval('moonLon(2448724.5)');
t.ok(Math.abs(geo - 133.167233) < 0.001,
     `Meeus 47.a apparent longitude ${geo.toFixed(6)} (book 133.167265)`);

// Meeus example 25.b — 1992 Oct 13.0 TD
const sun = w.eval('sunLon(2448908.5)');
t.ok(Math.abs(sun - 199.90895) < 0.01, `Meeus 25.b solar longitude ${sun.toFixed(5)}`);

// the shoot week, in Hawaii time, against what was entered by hand
const expect = {
  11: 'VIRGO→LIBRA 1:51PM', 12: 'LIBRA', 13: 'LIBRA→SCORPIO 8:43PM',
  14: 'SCORPIO', 15: 'SCORPIO', 16: 'SCORPIO→SAGITTARIUS 6:41AM', 17: 'SAGITTARIUS'
};
let bad = [];
for (const d of Object.keys(expect)) {
  const got = w.eval(`astroFor(2026,9,${d},'Pacific/Honolulu').text`);
  if (got !== expect[d]) bad.push(`SEP ${d}: ${got} (expected ${expect[d]})`);
}
t.ok(bad.length === 0, 'the shoot week matches' + (bad.length ? ': ' + bad.join('; ') : ''));

// timezone actually matters, and the shoot's own zone is used
t.ok(w.eval("astroFor(2026,9,11,'Australia/Sydney').text") !== expect[11],
     'the same calendar day differs by zone, as it should');

// speed — this runs on every render
const t0 = w.eval('performance.now()');
w.eval('for(let i=0;i<200;i++){ delete ASTRO_CACHE["2026-9-11-Pacific/Honolulu"]; astroFor(2026,9,11,"Pacific/Honolulu"); }');
const per = (w.eval('performance.now()') - t0) / 200;
t.ok(per < 5, `an uncached day costs ${per.toFixed(2)}ms`);

// weekdays are computed, not typed
click(w, $$(w, '.projRow button').find(b => b.dataset.proj === 'island')); await wait(320);
const heads = [];
for (let i = 0; i < $$(w, '#dayTabs button[data-day]').length; i++) {
  $$(w, '#dayTabs button[data-day]')[i].click(); await wait(120);
  heads.push($(w, '#dayTitle .head').textContent.trim());
}
const dated = heads.filter(h => /^[A-Z]{3} \d+/.test(h));
t.ok(dated.every(h => /\| (MON|TUE|WED|THU|FRI|SAT|SUN)/i.test(h)),
     `all ${dated.length} dated tabs carry a weekday`);

t.done();

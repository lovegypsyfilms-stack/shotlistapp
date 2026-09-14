// The invariants that matter most: ids, counts, structure.
import { boot, ready, suite } from './harness.mjs';
const t = suite('data');
const w = await ready(boot());

const S = w.eval(`(function(){
  const out={};
  ['island','diary','prep'].forEach(pid=>{
    const D=pid==='island'?DATA:pid==='diary'?DIARY:PREP;
    let shots=0,scenes=0,beats=0; const ids=[],dupes=[];
    D.forEach(d=>d.timeBlocks.forEach(tb=>tb.locations.forEach(l=>{
      scenes++;
      l.scenes.forEach(s=>{ beats++; s.shots.forEach(q=>{ shots++;
        if(ids.includes(q.id)) dupes.push(q.id); ids.push(q.id); }); });
    })));
    out[pid]={tabs:D.length,scenes,beats,shots,dupes};
  });
  return out;
})()`);

t.ok(S.diary.shots === 246, `DIARY 246 shots (${S.diary.shots})`);
t.ok(S.diary.tabs === 17 && S.diary.scenes === 145, `DIARY 17 places / 145 scenes`);
t.ok(S.island.shots === 238, `ISLAND 238 shots (${S.island.shots})`);
t.ok(S.prep.shots === 31, `PREP 31 tasks (${S.prep.shots})`);
for (const p of ['island', 'diary', 'prep'])
  t.ok(S[p].dupes.length === 0, `${p}: no duplicate ids`);

// the protected Episode 1 cards
const prot = w.eval(`(function(){let n=0;DIARY.forEach(p=>p.timeBlocks.forEach(t=>t.locations.forEach(l=>
  l.scenes.forEach(s=>s.shots.forEach(q=>{ if(q.id.startsWith('dy2-')) n++; })))));return n;})()`);
t.ok(prot === 34, `34 protected dy2- cards (${prot})`);

// no id may contain anything that would break a storage key
const bad = w.eval(`(function(){const b=[];[DATA,DIARY,PREP].forEach(D=>D.forEach(d=>d.timeBlocks.forEach(
  t=>t.locations.forEach(l=>l.scenes.forEach(s=>s.shots.forEach(q=>{
    if(!/^[A-Za-z0-9-]+$/.test(q.id)) b.push(q.id); }))))));return b;})()`);
t.ok(bad.length === 0, 'every id is storage-key safe' + (bad.length ? ': ' + bad.slice(0,3) : ''));

// default rig
const fx = w.eval(`(function(){let n=0;DIARY.forEach(p=>p.timeBlocks.forEach(t=>t.locations.forEach(l=>
  l.scenes.forEach(s=>s.shots.forEach(q=>{ if(q.cameraCode==='fx30') n++; })))));return n;})()`);
t.ok(fx === 0, 'no FX30 left in DIARY — default rig is CAMERA');

t.done();

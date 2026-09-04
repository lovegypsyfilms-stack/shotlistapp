/* ============================================================
   CLOUD SYNC v1 — shared tick list across devices
   ------------------------------------------------------------
   Design rules, in order of importance:

   1. LOCAL FIRST. localStorage stays the source of truth. This
      file only mirrors it. With no config, no network, or a
      broken CDN, the app behaves exactly as it did before this
      file existed. Every entry point is wrapped in try/catch.

   2. NOTHING IS EVER LOST. Ticks merge per-item by timestamp,
      so two devices editing offline both survive the reunion.
      No device ever wholesale overwrites another.

   3. SWAPPABLE. The app talks to this file through
      window.APPBRIDGE and nothing else. Replace Firebase with
      any other backend and index.html does not change.
   ============================================================ */

const CFG = window.SYNC_CONFIG || {};
const BRIDGE = window.APPBRIDGE;

const FLAT = ['done-v1', 'durations-v1', 'daydone-v1']; // maps: merged per entry
const BLOB = ['ops-v2'];                                // one object: newest wins

const META_KEY = 'sync-meta-v1';  // { "pid/key/entry": timestamp }
const SNAP_KEY = 'sync-snap-v1';  // { "pid/key": last synced JSON string }

const el = document.getElementById('syncStatus');
function status(t) { if (el) el.textContent = 'Cloud sync: ' + t; }

/* ---------- helpers ---------- */
function readJSON(k, fallback) {
  try { return JSON.parse(localStorage.getItem(k) || fallback); }
  catch (e) { return JSON.parse(fallback); }
}
// Firebase keys cannot contain . # $ [ ] / — day labels contain "/" and "|",
// so every key is base64url encoded on the way out and decoded on the way in.
function enc(k) {
  return btoa(unescape(encodeURIComponent(k)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function dec(k) {
  return decodeURIComponent(escape(atob(
    k.replace(/-/g, '+').replace(/_/g, '/')
  )));
}

/* ---------- local → remote ---------- */
// Diffs current localStorage against the last synced snapshot and returns
// only what actually changed, each stamped with the moment it changed.
function collectChanges() {
  const meta = readJSON(META_KEY, '{}');
  const snap = readJSON(SNAP_KEY, '{}');
  const now = Date.now();
  const patch = {};
  let n = 0;

  BRIDGE.projectIds().forEach(pid => {
    FLAT.forEach(k => {
      const cur  = readJSON(pid + '-' + k, '{}');
      const prev = JSON.parse(snap[pid + '/' + k] || '{}');
      const keys = new Set(Object.keys(cur).concat(Object.keys(prev)));
      keys.forEach(key => {
        const a = JSON.stringify(cur[key]  === undefined ? null : cur[key]);
        const b = JSON.stringify(prev[key] === undefined ? null : prev[key]);
        if (a === b) return;
        meta[pid + '/' + k + '/' + key] = now;
        patch[pid + '/' + k + '/' + enc(key)] = { v: a, t: now };
        n++;
      });
      snap[pid + '/' + k] = JSON.stringify(cur);
    });

    BLOB.forEach(k => {
      const cur = localStorage.getItem(pid + '-' + k) || '{}';
      if (cur === (snap[pid + '/' + k] || '{}')) return;
      meta[pid + '/' + k] = now;
      patch[pid + '/' + k] = { v: cur, t: now };
      snap[pid + '/' + k] = cur;
      n++;
    });
  });

  localStorage.setItem(META_KEY, JSON.stringify(meta));
  localStorage.setItem(SNAP_KEY, JSON.stringify(snap));
  return { patch, n };
}

/* ---------- remote → local ---------- */
// Applies only entries newer than what this device already knows.
function applyRemote(data) {
  if (!data) return;
  const meta = readJSON(META_KEY, '{}');
  const snap = readJSON(SNAP_KEY, '{}');
  const mine = BRIDGE.pid();
  let changed = false, opsChanged = false;

  BRIDGE.projectIds().forEach(pid => {
    const node = data[pid];
    if (!node) return;

    FLAT.forEach(k => {
      const remote = node[k];
      if (!remote) return;
      const cur = readJSON(pid + '-' + k, '{}');
      // The snapshot tracks what the SERVER knows, so it must be advanced by the
      // remote entries only. Merging `cur` into it would hide any local change
      // this device has not pushed yet, and that change would never be sent.
      const seen = JSON.parse(snap[pid + '/' + k] || '{}');
      let touched = false;

      Object.keys(remote).forEach(ek => {
        const e = remote[ek];
        if (!e || typeof e.t !== 'number') return;
        let key; try { key = dec(ek); } catch (_) { return; }
        if (e.t <= (meta[pid + '/' + k + '/' + key] || 0)) return;

        let val = null;
        try { val = JSON.parse(e.v); } catch (_) { val = null; }
        if (val === null || val === false) { delete cur[key]; delete seen[key]; }
        else { cur[key] = val; seen[key] = val; }

        meta[pid + '/' + k + '/' + key] = e.t;
        touched = true;
      });

      if (touched) {
        localStorage.setItem(pid + '-' + k, JSON.stringify(cur));
        snap[pid + '/' + k] = JSON.stringify(seen);
        changed = true;
      }
    });

    BLOB.forEach(k => {
      const e = node[k];
      if (!e || typeof e.t !== 'number' || typeof e.v !== 'string') return;
      if (e.t <= (meta[pid + '/' + k] || 0)) return;
      localStorage.setItem(pid + '-' + k, e.v);
      snap[pid + '/' + k] = e.v;
      meta[pid + '/' + k] = e.t;
      changed = true;
      if (pid === mine) opsChanged = true;
    });
  });

  localStorage.setItem(META_KEY, JSON.stringify(meta));
  localStorage.setItem(SNAP_KEY, JSON.stringify(snap));
  if (changed) BRIDGE.refresh({ ops: opsChanged });
}

/* ---------- startup ---------- */
function configured() {
  return !!(CFG.enabled && CFG.room && CFG.room.indexOf('PASTE') !== 0 &&
            CFG.firebase && CFG.firebase.databaseURL);
}

if (!BRIDGE) {
  status('unavailable');
} else if (!configured()) {
  status('off — this device only');
} else {
  start();
}

async function start() {
  status('connecting…');
  let db, ref, onValue, update;

  try {
    const [appMod, dbMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js')
    ]);
    ({ ref, onValue, update } = dbMod);
    db = dbMod.getDatabase(appMod.initializeApp(CFG.firebase));
  } catch (e) {
    // No network, blocked CDN, bad config — the app carries on regardless.
    status('offline — saving on this device');
    return;
  }

  const room = ref(db, 'rooms/' + CFG.room);
  let ready = false;

  // Connection state drives the status line so you can trust what you see.
  try {
    onValue(ref(db, '.info/connected'), snap => {
      if (snap.val()) { status('on'); if (ready) push(); }
      else status('waiting for signal — saving on this device');
    });
  } catch (e) {}

  // Incoming changes from the other device.
  onValue(room, snap => {
    try { applyRemote(snap.val()); } catch (e) {}
    ready = true;
    push();
  }, () => {
    status('cannot reach the database — check the rules in SETUP.md');
  });

  // Outgoing changes, debounced so a burst of ticks is one write.
  let timer = null;
  function push() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const { patch, n } = collectChanges();
        if (n) update(room, patch);
      } catch (e) {}
    }, 800);
  }

  BRIDGE.onSave = push;
}

# SHOTLINE — field shot list

A single-file offline shot list for Love Gypsy Films. Built for one person on a
phone, in the field, often with no signal and one hand free.

**Live:** GitHub Pages → `https://lovegypsyfilms-stack.github.io/shotlistapp/`
**Install:** open that in Safari → Share → Add to Home Screen.

---

## The one rule

**Never renumber a shot id.**

Every tick, rename, move, duration, deletion and camera change on both devices
is keyed to ids like `dy2-sc7-b0-q0`. The baked data is cloned fresh on every
render and the stored operations are replayed on top of it. Change an id and
the operation lands on the wrong card, or on nothing.

When consolidating several cards into one, keep one of the existing ids as the
survivor. When adding genuinely new material, mint a new id — never reuse.

---

## Projects

| pill | what | size |
|---|---|---|
| DIARY | *Diary of a Homeless Filmmaker* — 17 places, 145 scenes, 246 shots | the live project |
| ISLAND | Hawaii — 14 days, dated, moon phases | postponed to ~Aug next year |
| PREP | 31 prep tasks in three deadline blocks | |

Order is user-controlled (drag the pills) and remembered in
`localStorage['island-projorder']`.

### DIARY structure
`place (tab) → band → script scene → beat → shots`

Bands are `EXTERIOR / INTERIOR / BENCH TOP` in the SHED and time-of-day
elsewhere. Confusingly the *code* calls a script scene a "location" and a beat
a "scene", because ISLAND's shape came first. Scenes 1–11 carry `dy2-` ids and
were written by Anthony directly; everything else came from a consolidation
pass and is the material future episodes will replace.

---

## Deploying

1. Edit `index.html`.
2. **Bump `VERSION` in `service-worker.js`** and the `BUILD` stamp in
   `index.html` — keep them identical.
3. Commit and push. Pages rebuilds in about a minute.
4. On the phone: force-close the app and reopen.

Step 2 is not optional. The service worker serves the cached copy until its
VERSION changes, so skipping it means the phone silently keeps the old build.
The ••• menu shows the build stamp — that is how you tell what is actually
running, and it has settled several "it doesn't work" arguments that were
really "you're on last week's build".

---

## Sync

Firebase Realtime Database, project `shotlist-app-94b49`. Config lives in
`sync-config.js` and is public on purpose — those values are not secrets. The
`room` string is the only thing keeping the data private, and it is in that
same public file. Acceptable for a shot list; not for anything sensitive.

`cloud-sync.js` talks to the app only through `window.APPBRIDGE`, so the
backend can be swapped without touching `index.html`.

**Local storage is the source of truth.** The cloud is a mirror. With no
config, no network or a blocked CDN the app behaves exactly as it did before
sync existed.

Ticks merge per item by timestamp, so two devices editing offline both
survive. Moves, renames, deletions and durations sync as one blob — last
writer wins. That trade is deliberate: ticks are what matter in the field.

### Storage keys
```
<pid>-done-v1        ticks (value is Date.now(), not true)
<pid>-undone-v1      tombstones, so a stale tick cannot resurrect
<pid>-durations-v1
<pid>-daydone-v1     keyed by DAY ID, not label — see gotchas
<pid>-ops-v2         every structural edit
island-project       last project opened
island-projorder     pill order
island-editmode      EDIT on/off, remembered between launches
island-filter-<pid>  the SHOTS selection, per project
island-sync-*        cloud settings
```

---

## EDIT mode

A persistent mode, not a momentary one — you are in a prep phase or a shooting
phase for weeks, so it survives relaunches.

**On:** tap any heading or shot text to change it. Bin icons appear on
headings and tabs. Drag handles appear on the numbers. Band chips appear.
A `+` appears at the end of the tab row. Shot dragging is **disabled** —
that was the fix for taps not registering, because the long-press was
stealing them.

**Off:** tap to tick, long-press to drag a shot, swipe left to delete one.

Every delete asks first and names what it is taking.

---

## Gotchas — each of these cost a debugging session

**Ticking must not call `render()`.** It destroys the node between clicks and
kills double-tap editing. `toggleDone` updates in place.

**`startEdit` must not open a detached node.** `finishEdit` re-renders, so
after committing a previous field you have to re-find the target by id before
opening it. Otherwise the second edit silently does nothing.

**iOS zooms any focused text under 16px** and will not zoom back on its own.
The focused field is bumped to 16px and the viewport is pinned while it is
open. This is *not* the double-tap zoom, which `touch-action:manipulation`
handles separately.

**An empty `.shotDetail` renders at zero height** — nothing to tap. EDIT mode
gives both fields a 20px minimum and a visible outline.

**Day-complete is keyed by day id, not label.** It used to be the label, so
changing a date silently un-ticked the day. There is a one-time migration
(`island-daydone-byid-<pid>`); old label keys are left behind deliberately
rather than raced with Firebase.

**The day label is pipe-separated** (`SEP 11 | FRIDAY | VIRGO/LIBRA`) and
parsed on the *last* pipe. Anything written after the weekday is read as the
astro tail and discarded — that is why a day note lives in `OPS.dayNote` and
is appended at display time.

**`setEditMode` must re-render.** Some controls are conditional in the markup,
not just in CSS, so they would not appear until something else triggered a
redraw.

**Nothing that must stay reachable may live inside `#locTabs`.** The strip is
hidden while filtering, in the PICKUPS view, and on any tab with no locations.
EDIT was in there once and vanished in all three.

**Browsers will not open a date picker for an invisible input.** The real
`<input type="date">` is laid over the date text at 1% opacity so the tap
lands on it. `showPicker()` on an off-screen input throws on Chrome and does
nothing on iOS. Always blur it on the way out or iOS keeps the wheel up.

---

## Astronomy

Moon longitude from the truncated ELP series, Meeus ch.47, 59 terms — verified
against the book's worked example (1992 Apr 12.0 TD → 133.162655°) to 0.0
arcseconds. Sun from ch.25. Both are pure arithmetic: no network, no library,
works at Kokee with no signal.

Sign is read off apparent longitude; a bisection between the day's two
midnights finds any ingress. Day boundaries use the shoot's own timezone
(`ASTRO_TZ`), so SEP 11 means the Hawaii day wherever you read it. An
uncached day costs ~1.3ms, cached ~0.4µs.

---

## Testing

```
npm install
npm test
```

`jsdom` only — no browser needed. Note what that cannot see: **layout**.
Widths, heights and `touch-action` all read as empty or zero, so a green run
does not prove anything visual. Two bugs shipped past these tests for exactly
that reason.

---

## Not done

- Beats have no band chip of their own (only script scenes do).
- Deleting a day takes its shots with it; there is no "move to pickups instead".
- Voice commands were scoped and parked — the browser speech API needs signal,
  which defeats the point in the field.

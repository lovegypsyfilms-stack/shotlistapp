# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read `README.md` first.** It owns the domain rules, the storage keys, the sync
merge policy, the astronomy, and a "Gotchas" section where every entry cost a
real debugging session. This file covers what the README does not: commands,
the architecture you would otherwise have to reconstruct by reading, and how
work gets shipped.

## Commands

```bash
npm install                  # node_modules is gitignored, not vendored — do this first
npm test                     # every suite, via test/run.mjs
node test/03-structure.mjs   # one suite: each is a standalone script, run it directly
npm run stamp                # bump BUILD in index.html + VERSION in service-worker.js together
npm run stamp 2026-09-14-C   # or pin an exact stamp
```

There is no build step, no bundler, no linter. `index.html` is the artifact.

## Shipping

Merge to `main` by default — that is the owner's standing preference, so do not
stop to ask. `main` is what GitHub Pages serves, so merging publishes to the
live app and to installed phones. Ask first only for genuinely destructive
operations: force-pushing, rewriting history, deleting data or branches.

**Run `npm run stamp` as part of every change that touches `index.html`.** The
service worker serves its cached copy until `VERSION` changes, so an unstamped
deploy silently leaves phones on the old build. The two values must match; the
stamp tool is the only thing that should write them. After pushing, Pages takes
about a minute — poll the live URL for the new `BUILD` string rather than
assuming.

## Architecture

Everything is `index.html`: CSS in one `<style>`, the whole app in one
`<script>`, ~3200 lines. `cloud-sync.js` is the only ES module. There are no
imports to follow, so grep is the navigation tool.

**Baked data plus a replayed operation log.** This is the model the whole app
turns on:

- `DATA` / `PROJECTS` (index.html ~657) is frozen JSON — the shot list as
  written. Nothing ever mutates it.
- `OPS` is every structural edit the user has made, keyed by id: `names`,
  `text`, `shots`, `scenes`, `adds`, `del`, `delScene`, `delLoc`, `delDay`,
  `sceneOrder`, `locOrder`, `dayOrder`, `band`, `rig`, `dates`, `dayNote` …
- `buildWork()` clones the baked data fresh and replays `OPS` on top, then
  indexes the result into `W = {work, holding, locBy, sceneBy, shotBy}`.
  `rebuild()` is just `buildWork()`.
- `render()` regenerates DOM from `W`. `state` (ticks, durations, dayDone)
  is separate from `OPS` and keyed by the same ids.

So every mutation follows one shape, and new code should too:

```js
snapshot('What the user will read in the undo bar');  // captures OPS + state
OPS.something[id] = value;                            // or state.done[id] = …
save(); rebuild(); render();
```

Deleting is an `OPS` entry, never a splice — which is why undo, backup and
cloud sync all get it for free, and why "Restore deleted shots" can exist.
Undo/redo (`captureState` / `applyState`) just serialises and restores `OPS`
plus `state`, so anything stored outside those two is invisible to undo.

**Ids are the join key for everything.** See the README's "one rule".

**The code's nouns are off by one.** A "location" in the code is a script
scene; a "scene" in the code is a beat. ISLAND's shape came first and DIARY
was fitted to it. `locBy` / `sceneBy` / `.locSection` / `.scene` all inherit
this, so read `.locationHead` as "script scene heading".

**`window.APPBRIDGE` is the entire sync surface** (bottom of index.html).
`save()` calls `APPBRIDGE.onSave()`; the sync layer calls `APPBRIDGE.refresh()`
to pull localStorage back into the running UI. Keep it that way — the backend
is meant to be swappable without touching the app.

**Per-project state is namespaced by `K(base)` → `<pid>-<base>`.** `PID`,
`P()`, `PDATA()` and `K()` are the accessors; never hardcode a storage key.

## Testing, and what it cannot see

jsdom only — no browser. **Layout does not exist there**: widths, heights,
`getBoundingClientRect`, `touch-action` and computed styles read as zero or
empty. A green run proves logic, not appearance, and the README notes two bugs
that shipped straight past these tests for exactly that reason.

So for anything visual — drag feedback, collapsed or sticky headers, tap
targets, overflow — drive the real page in Chromium (Playwright is available in
Claude Code web sessions) and *measure*: element rects, `offsetParent` for
visibility, `scrollWidth > clientWidth` for overflow. Check 414px and 320px,
and check both light content and the black header. Screenshots catch what
assertions miss; take them.

`test/harness.mjs` boots `index.html` in jsdom and stubs the gaps —
`w.__prompt` feeds `prompt()`, `w.__yes` decides `confirm()`, `w.__asked`
collects what was asked, `w.__drop` drives `elementFromPoint`. Tests reach
into app internals with `w.eval('headDrag!==null')`, so renaming a top-level
`let` can break a suite.

Some suites are written ahead of the implementation and describe intended
behaviour rather than current behaviour. Before "fixing" a failing assertion,
check whether it is specifying something not built yet — implement to the test
rather than editing it.

## Known failing test

`test/02-edit.mjs` → "lives in the day header" expects `#editBtn` to be a child
of `.dayrow`; it currently sits in `.stripRow`. Pre-existing and untouched —
the fix moves a control the owner uses constantly, so it needs their call, not
a quiet edit.

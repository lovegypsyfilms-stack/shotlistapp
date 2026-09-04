# Shot List App — setup

Two separate jobs. **Part 1 puts the app online.** Do that first and you'll
already have it on your phone. **Part 2 turns on shared ticking** between
desktop and iPhone. The app works fine without Part 2, just device-by-device.

The folder is currently in `Downloads`. Move it somewhere safer first —
macOS clears Downloads out. Drag it to `Documents`, then carry on.
Git doesn't mind the folder moving later.

---

## Part 1 — Put it on GitHub and get it on your phone

Open **Terminal** (Cmd+Space, type "Terminal"). Paste these one line at a
time. The first line assumes you moved the folder to Documents.

```
cd ~/Documents/shotlistapp
git init
git add .
git commit -m "Shot list app"
git branch -M main
git remote add origin https://github.com/lovegypsyfilms-stack/shotlistapp.git
git push -u origin main
```

On the push, GitHub will ask you to sign in — a browser window opens, or it
asks for a username and password in Terminal. **If it asks in Terminal, stop
and use the browser method instead** (`brew install gh` then `gh auth login`),
because the password box won't accept your normal GitHub password.

### Turn on GitHub Pages

1. Go to https://github.com/lovegypsyfilms-stack/shotlistapp
2. **Settings** → **Pages** (left sidebar)
3. Under *Source* pick **Deploy from a branch**
4. Branch: **main**, folder: **/ (root)** → **Save**
5. Wait a couple of minutes, then your app is live at:

```
https://lovegypsyfilms-stack.github.io/shotlistapp/
```

### Add it to the iPhone

Open that address in **Safari** (not Chrome — only Safari can install it).
Tap the **Share** button → **Add to Home Screen**. It now behaves like a real
app, works with no signal, and updates itself.

No folder is needed on the phone. Ever.

### Pushing a change later

```
cd ~/Documents/shotlistapp
git add .
git commit -m "what changed"
git push
```

**One thing you must not skip:** before pushing, open `service-worker.js` and
bump the date on line 20:

```
const VERSION = '2026-09-02-1';   →   '2026-09-03-1'
```

That one line is what tells your phone a new build exists. Without it the
phone keeps showing the old version.

---

## Part 2 — Shared tick list

Right now each device keeps its own ticks. This connects them, so ticking on
the phone in the field shows up on the desktop, and vice versa. It's free.

### Create the database

1. Go to https://console.firebase.google.com and sign in with a Google account
2. **Create a project** → name it `shotlist` → you can turn Google Analytics
   **off** → Create
3. In the left sidebar: **Build** → **Realtime Database** → **Create Database**
4. Pick any location. When it asks about security rules, choose
   **Start in test mode** → Enable
5. Go to the **Rules** tab, replace what's there with this, and press
   **Publish**:

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read":  "$room.length >= 20",
        ".write": "$room.length >= 20"
      }
    }
  }
}
```

### Get your config

1. Click the **gear icon** (top left) → **Project settings**
2. Scroll to **Your apps** → click the **web** icon `</>`
3. Nickname it `shotlist` → **Register app**
4. It shows a `firebaseConfig` block. Leave that page open.

### Paste it in

Open `sync-config.js` in this folder (TextEdit is fine) and copy the values
across from that Firebase page. Also change `enabled` to `true`:

```js
enabled: true,

room: "LIaLqWndcJ4Oa5pY_oIkpE7o",

firebase: {
  apiKey:       "AIza...",
  authDomain:   "shotlist-xxxxx.firebaseapp.com",
  databaseURL:  "https://shotlist-xxxxx-default-rtdb.firebaseio.com",
  projectId:    "shotlist-xxxxx",
  appId:        "1:123...:web:abc..."
}
```

**`databaseURL` is the important one.** If Firebase's config block doesn't
show it, copy it off the Realtime Database page instead — it's the
`https://....firebaseio.com` address at the top.

Leave `room` exactly as it is. That random string is your private room, and
both devices must use the same one. Don't share it.

Then bump the version in `service-worker.js`, commit and push. Reload the app
on both devices. Open the menu → **Backup & move devices** and the top line
should read **Cloud sync: on**.

---

## How the syncing behaves

- **Your device is always in charge.** Everything saves locally first, exactly
  as it does now. The cloud is only a mirror. If sync breaks, is switched off,
  or you're in the middle of nowhere, the app carries on unchanged.
- **Nothing gets lost.** Tick things on the phone with no signal, tick
  different things on the desktop, and when both reconnect you end up with
  both sets. Neither device wipes the other.
- **Unticking travels too**, and the most recent change to any single item
  wins.
- **Moves, renames, added shots and durations** sync as a whole block rather
  than item by item, so the last device to edit those wins. Ticks are the part
  that merges properly, which is what matters in the field.
- The old **Backup & move devices** code still works and is untouched. It's
  your fallback if anything goes wrong.

---

## Deleting shots, and taking it back

**Desktop:** right-click any shot card. You get Move, Set duration, and
Delete shot.

**iPhone:** flick a card to the left. It goes red and slides away. Tapping,
double-tapping and long-press-to-drag all behave as they always did — a flick
only counts if it's clearly sideways, so scrolling the list never deletes
anything by accident.

Nothing is ever destroyed. A delete is stored the same way a move or a rename
is, which means it travels through the backup code and the cloud sync, and it
can always be walked back.

**Undo and redo go 60 steps deep.**

- The black bar at the bottom has UNDO, and REDO appears once you've undone
  something
- Menu (•••) → the top two entries name the exact change, e.g.
  "↶ Undo: Deleted Wide of the shed"
- Desktop keyboard: `Cmd+Z` to undo, `Cmd+Shift+Z` to redo
- Making a fresh change clears the redo branch, as in any editor

That history lives in memory, so reloading the app clears it. Deletions
outlive it: **Menu → Restore deleted shots (n)** brings back everything you've
deleted, however long ago, and appears only when there's something to restore.

## Privacy, plainly

The repo is public, so your Firebase config is visible — that's normal and
fine, those values aren't secrets. Your `room` string is the thing that keeps
the shot list private, and it's in that same public file. Realistically nobody
is going to find it. But if the shot list is sensitive, tell me and I'll move
the room string somewhere it isn't published.

## If something goes wrong

- **"Cloud sync: off — this device only"** → `enabled` isn't `true`, or the
  config is still blank.
- **"cannot reach the database"** → the Rules step didn't publish. Redo it.
- **"waiting for signal"** → no internet. Normal and harmless; it catches up.
- **Phone showing an old version** → you forgot to bump `VERSION` in
  `service-worker.js`. Bump it, push, then force-close the app and reopen.
- **Something badly broken** → set `enabled: false` in `sync-config.js`, push,
  and you're back to exactly how the app worked before any of this.

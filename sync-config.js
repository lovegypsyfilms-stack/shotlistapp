/* ============================================================
   CLOUD SYNC CONFIG
   ------------------------------------------------------------
   Firebase project: Shotlist  (shotlist-app-94b49)
   Realtime Database: us-central1

   The `room` string is what pairs your devices. Both the
   desktop and the iPhone must use the same one.
   ============================================================ */
window.SYNC_CONFIG = {

  // Sync is on.
  enabled: true,

  // Your private room. Keep it identical on every device.
  room: "LIaLqWndcJ4Oa5pY_oIkpE7o",

  // From Firebase console → Project settings → Your apps.
  // storageBucket, messagingSenderId and measurementId are
  // deliberately omitted: Storage and Analytics are not used.
  firebase: {
    apiKey:       "AIzaSyBygZJYDGiVb0m5SfWfFZVg9AqiKMollBQ",
    authDomain:   "shotlist-app-94b49.firebaseapp.com",
    databaseURL:  "https://shotlist-app-94b49-default-rtdb.firebaseio.com",
    projectId:    "shotlist-app-94b49",
    appId:        "1:846783339155:web:c06eb7d7cf731a437ecb66"
  }
};

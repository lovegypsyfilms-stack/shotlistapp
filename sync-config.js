/* ============================================================
   CLOUD SYNC CONFIG
   ------------------------------------------------------------
   Until you fill this in, the app works exactly as it always
   has: everything saved on the device, nothing shared.

   Follow SETUP.md, then paste your Firebase values below and
   set enabled to true.
   ============================================================ */
window.SYNC_CONFIG = {

  // Flip to true once the values below are filled in.
  enabled: false,

  // Your private room. Every device using this same string shares
  // the same tick list. Keep it long and random — it is the only
  // thing keeping your shot list private.
  room: "LIaLqWndcJ4Oa5pY_oIkpE7o",

  // From Firebase console → Project settings → Your apps → SDK setup
  firebase: {
    apiKey:       "",
    authDomain:   "",
    databaseURL:  "",
    projectId:    "",
    appId:        ""
  }
};

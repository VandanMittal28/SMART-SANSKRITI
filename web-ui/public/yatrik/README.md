# Yatrik asset handoff

Pulkit can add transparent WebP or PNG frames under a versioned folder such as `v1/idle/idle-01.webp`, then list their public paths in `manifest.v1.json`.

Every state is already supported: `idle`, `fly-in`, `landing`, `talking`, `listening`, `pointing`, `celebrating`, and `muted`. Keep the canvas dimensions consistent across frames. The app uses the CSS placeholder whenever a state's frame list is empty or an image cannot load.

# Yatrik asset handoff

Pulkit's transparent pose sheets are installed as optimized 512 x 512 WebP frames under `pulkit-v1/<state>/`. The app loads every frame through `manifest.v1.json`.

Every state is supported: `idle`, `fly-in`, `landing`, `talking`, `listening`, `pointing`, `celebrating`, and `muted`. Keep future replacement frames on a consistent transparent 512 x 512 canvas and update the manifest version whenever assets change. The app uses the CSS placeholder only if a state's frame list is empty or an image cannot load.

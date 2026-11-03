# M Arcade assets

`icon.png` is the canonical launcher icon, rendered from the code-native arcade cabinet in `../tools/icon.js`. The artwork follows the repository M Arcade Icons skill: dark tile, silver rim, upper-left highlights, small collection accents and a transparent exterior. It contains no manufacturer marks. Regenerate with `node apps/iabadia_m_arcade/tools/icon.js` from the repository root.

`games/` preserves the six user-approved standalone icons at the same 140px RGBA size and transparent padding. Their original artwork/provenance remains documented in each standalone app's `assets/README.md`. No master images, private paths or image-generation credentials are packaged. The build copies these canonical PNGs into the native resources/config tree; never edit the generated copies separately.

# M Arcade assets

`icon.png` is the canonical launcher icon, based on the project owner's supplied **Neon M-Stripe Arcade Machine** artwork. The exterior transparency was cleaned while preserving the cabinet, marquee, pixel alien, joystick, buttons and coloured lighting. It is exported as a 140x140 RGBA PNG with 12px minimum clear padding and 116px maximum artwork width; the PNG is below the 32 KiB icon budget.

The full-resolution input and edited master stay outside the distributed package. Only the final PNG is maintained here and copied by the build into the native resource bundle. Use the M Arcade Icons skill for future replacements. The old code-drawn launcher generator has been removed so it cannot overwrite this artwork.

`games/` preserves the six user-approved standalone icons at the same 140px RGBA size and transparent padding. Their original artwork/provenance remains documented in each standalone app's `assets/README.md`. No master images, private paths or image-generation credentials are packaged. The build copies these canonical PNGs into the native resources/config tree; never edit the generated copies separately.

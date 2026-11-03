---
name: m-arcade-icons
description: Create or adapt M Arcade game and launcher icons with consistent dark tile styling, transparent padding and small native iDrive assets. Use for this game collection, including user-supplied icon references.
---

# M Arcade Icons

Use one recognizable family for the launcher and game library. Preserve the user's supplied subject and approved art; applying this skill does not authorize redesigning every existing icon or publishing changes.

Read [the style specification](references/style.md) when creating or adapting art. It defines geometry, palette, lighting and the generation brief. Use [the frame template](assets/icon-frame.svg) for a vector/code-native icon or as a geometry reference; change its blue rim to the game's accent. Raster illustration can use an available image-generation/editing tool with the user's reference. Inspect local references first. Do not substitute an unrelated generated design for supplied art.

Produce an RGBA master with a transparent exterior. Remove unwanted outer glow and disconnected artifacts in the artwork before resizing. Keep the dark interior tile opaque. Black is a legitimate tile colour: do not remove it using a colour key. Do not introduce car logos or manufacturer marks.

For mechanical crop, centering and downsampling, use the included Pillow script (Python 3 and Pillow required):

```text
python scripts/prepare_icon.py prepare <transparent-master.png> <icon.png>
python scripts/prepare_icon.py check <icon.png>
```

Paths are relative to this skill directory. The script refuses accidental replacement; pass `--force` only when updating the intended asset is authorized. It does not creatively repair art, remove glow or judge style. An opaque or badly proportioned input must be corrected first.

Inspect the result at 140, 64 and 32 pixels on black and a checkerboard, beside another collection icon. Check subject recognition, consistent visual weight, clean corners, true transparent margins, no outer halo and no clash with the native label below the icon. A metadata check alone is insufficient. Include a small contact sheet for review when changing several icons.

Keep the final PNG in the game's canonical asset location and derive package/docs copies from it. Store the brief, source attribution and master outside the installable package; never ship large masters or previews. Use the repository copy of this skill as the maintained source when working in idrive-games. Do not overwrite the six approved standalone icons merely to adopt this standard: their conversion belongs to the M Arcade UI migration.

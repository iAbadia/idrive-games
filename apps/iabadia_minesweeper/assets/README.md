# Launcher icon

`icon.png` is the canonical 140×140 RGBA launcher asset. Build and preview
tools copy it into the staged app; they never redraw or overwrite it.
Artwork occupies 116×116 pixels with transparent 12px margins, matching
the iDrive launcher sizing used by this repository.

Adapted from the user-supplied Minesweeper reference using the built-in
image-generation tool. Prompt: a straight-on metallic 3×3 grid, dark rounded
frame, beveled silver cells, blue 1s, green 2s, central mine and red flag;
simplify for small-size readability and retain a genuinely transparent surround.
The generated master stays outside the repository to avoid shipping a
large source image. The app package contains only the production PNG.

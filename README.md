# UV Eye Texture Studio v0.4

A small local browser tool for designing anime / VTuber style eye UV textures directly on top of a PNG UV sheet.

## What changed in v0.4

- **Alpha-based eye auto detection**
  - Detects left/right eye UV areas from visible non-transparent islands in a PNG.
  - Best for PNGs where only the eye UV islands are opaque and the surrounding area is transparent.
- **Detailed element preset libraries** instead of relying only on full finished eye presets.
  - Background / gradient presets
  - Lower motif presets (wave, petals, droplet, light reflection, mixed points)
  - Pupil presets (circle, oval, heart, petal, slit)
  - Upper shadow / eyelash reflection presets
  - Reflection presets
  - Highlight presets
  - Particle presets
- **New rendering features**
  - New pupil shapes: heart, petal, slit
  - New lower motif types: lightShards, mixedPoints
  - New reflection type: topBand
  - New highlight preset: sparkleArc
- **Project version updated to 4**
  - Browser save key changed to `uv-eye-studio-v04-settings`
  - JSON export format version changed to `4`

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm install
npm run build
```

## Main workflow

1. Open a PNG UV texture.
2. Click **Auto Detect Eyes** if the eye UV islands are isolated by transparency.
3. Refine the masks with:
   - Draw Ellipse
   - Polygon Click
   - Edit Points
   - Move Mask
4. Build the iris using the **Detailed Element Presets**.
5. Fine-tune every layer in the right panel.
6. Export:
   - **Export Eye** for the selected iris only
   - **Export Full PNG** for the complete UV sheet

## Notes

- The tool is designed to work **fully in the browser**.
- The source PNG is **not embedded** inside browser save / project JSON.
- If you load a saved project, you may need to reopen the matching source PNG.

# Heart Catcher — Asset Guide

The game runs right now with colored placeholder shapes. This guide explains what to replace to make it look like a real 16-bit Pokémon game.

---

## Run the game immediately

```bash
cd heart-catcher
npm install
npm run dev
# Open http://localhost:3000
```

---

## Asset files to create

All assets live in `assets/`. Replace any placeholder file with the real version — same filename, same dimensions.

### Sprites (Aseprite or any pixel art tool)

| File | Size | Description |
|---|---|---|
| `sprites/danidu-walk.png` | 512×16 | Player spritesheet. 8 rows of directions × 4 walk frames. Each frame = 16×16px. Directions (left→right): S, SE, E, NE, N, NW, W, SW |
| `sprites/heart-normal.png` | 64×32 | Row 0 = pink hearts (4 frames). Row 1 = golden hearts (4 frames). Each 16×16px |
| `sprites/grass-rustle.png` | 80×16 | 5-frame squash-stretch animation of tall grass. Each 16×16px |
| `sprites/soso-giggle.png` | 128×32 | Soso peeking + giggling. 4 frames × 32×32px |
| `sprites/snow-shovel.png` | 48×16 | 3 frames of snow being shoveled away. Each 16×16px |
| `sprites/memory-fragment.png` | 32×16 | Polaroid icon, 2 frames (shimmer). Each 16×16px |
| `sprites/powerup-icons.png` | 64×16 | 4 powerup icons side by side. Each 16×16px (L→R: Running Shoes, Sweet Scent, Mower, Memory) |

**Tools:** [Aseprite](https://www.aseprite.org/) (paid, worth it) or [Libresprite](https://libresprite.github.io/) (free fork)

### Tilesets

Each tileset is **160×160px** (10 tiles wide × 10 tiles tall, each tile = 16×16px).

| File | Season | Notes |
|---|---|---|
| `tilesets/spring.png` | Spring (Levels 1–5) | Grass, flowers, dirt path, trees |
| `tilesets/summer.png` | Summer (Levels 6–12) | Lush grass, sunflowers, water edge |
| `tilesets/autumn.png` | Autumn (Levels 13–18) | Russet grass, fallen leaves, logs |
| `tilesets/winter.png` | Winter (Levels 19–21) + Finale | Snow, ice, bare trees |

**Tile index layout** (1-based, 10 cols wide):
```
Index 1–10:   Row 0  — ground variants, decorations, path, fence, tall grass, water
Index 11–20:  Row 1  — tree trunk tiles (obstacle = solid)
Index 21–30:  Row 2  — more trunks
Index 31–40:  Row 3  — overhead canopy tiles
Index 41–50:  Row 4  — more canopy
```
Zero = empty (transparent).

**Free starting point:** [LimeZu's Tiny Town](https://limezu.itch.io/moderninteriors) / [Kenney's assets](https://kenney.nl/assets) — customize to match the Pokémon Gen 5 aesthetic.

### UI

| File | Size | Description |
|---|---|---|
| `ui/scrapbook-cover.png` | 320×240 | Leather book cover (full screen) |
| `ui/scrapbook-page.png` | 288×216 | Blank page background for messages |
| `ui/stamp-gold.png` | 48×48 | "Master Catcher" gold stamp |
| `ui/polaroid-frame.png` | 240×180 | Frame overlay for memory photos |

### Photos (Memory Fragments)

Replace `photos/memory-00.jpg` through `photos/memory-06.jpg` with real photos of Dancy and Soso.

**How to pixelate a photo:**
1. Open in Preview (Mac) or GIMP
2. Scale image to 48×36 pixels
3. Scale back up to 240×180 using "Nearest Neighbor" (no blur)
4. Save as JPG

---

## Audio

The game plays silently if audio files are missing — no errors. Add `.ogg` files to:

```
assets/audio/music/
  spring.ogg      — Spring level theme
  summer.ogg      — Summer level theme
  autumn.ogg      — Autumn level theme
  winter.ogg      — Winter level theme
  finale.ogg      — Level 22 birthday theme
  scrapbook.ogg   — Soft music for scrapbook pages

assets/audio/sfx/
  heart-find.ogg        — High-pitched chime when heart found
  grass-rustle.ogg      — Rustling grass sound
  decoy-giggle.ogg      — Soso's giggle
  shovel.ogg            — Snow being shoveled
  level-complete.ogg    — Victory jingle
  page-turn.ogg         — Scrapbook page flip
  compass-tick.ogg      — Soft tick when compass pulses
  powerup.ogg           — Powerup collected
  sweet-scent.ogg       — Sweet Scent activation
```

**Free tools:**
- [BeepBox](https://www.beepbox.co/) — browser-based chiptune composer, zero install
- [Famitracker](http://famitracker.com/) — NES-style music
- [freesound.org](https://freesound.org/) — search "chiptune" or "8-bit"

Export everything as `.ogg` at 44.1kHz.

---

## Scrapbook messages

Edit `src/data/scrapbook/entries.ts` to write Soso's real messages to Dancy for all 22 chapters. Each entry has a `message` field — write whatever you want there, newlines (`\n`) are supported.

---

## Deploying to GitHub Pages

1. Create a GitHub repository (can be private until the birthday)
2. Push the `heart-catcher/` folder
3. In repository Settings → Pages → Source: GitHub Actions
4. The workflow at `.github/workflows/deploy.yml` will auto-deploy on every push to `main`
5. The game will be live at `https://YOUR_USERNAME.github.io/REPO_NAME/`

Share that URL as the gift! 🎁

---

## Placeholder regen

If you need to regenerate the placeholders:
```bash
node scripts/generate-placeholders.mjs
```

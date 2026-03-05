# Heart Catcher — Development Plan (No 3rd-Party Game Tools)

## Context
A personalized 16-bit hidden-object adventure game built as a 22nd birthday gift for Danidu from Soso. Built entirely on native browser APIs — no game engines or frameworks. General-purpose tooling only (TypeScript, Vite). Hosted as a static site on GitHub Pages.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.x |
| Build/Dev | Vite (general-purpose bundler only) |
| Rendering | HTML5 Canvas 2D API |
| Audio | Web Audio API |
| Input | Keyboard Events, Gamepad API, Pointer Events |
| Persistence | localStorage |
| Hosting | GitHub Pages (static, free, shareable URL) |

Zero game libraries. Zero runtime dependencies beyond TypeScript types.

---

## Project Structure

```
heart-catcher/
├── index.html                      # Single HTML file; mounts <canvas id="game">
├── vite.config.ts                  # base: './', assetsInclude: ['**/*.json']
├── tsconfig.json
├── package.json                    # devDependencies: vite, typescript only
│
├── src/
│   ├── main.ts                     # Creates canvas, boots engine, starts BootScene
│   │
│   ├── engine/                     # Pure engine — no game logic
│   │   ├── GameLoop.ts             # rAF + fixed-timestep accumulator (60 ticks/s)
│   │   ├── Renderer.ts             # Canvas setup, scale, clear, ctx exposure
│   │   ├── SceneManager.ts         # push/pop/switch scenes; parallel overlay support
│   │   ├── InputManager.ts         # Unified keyboard + Gamepad API + pointer events
│   │   ├── AssetLoader.ts          # fetch+decode images and audio; returns promises
│   │   ├── AudioEngine.ts          # AudioContext, BufferSource, GainNode, crossfade
│   │   ├── TweenEngine.ts          # Timeline-based tweens with easing functions
│   │   └── EventBus.ts             # Simple typed event emitter (decouples systems)
│   │
│   ├── scenes/
│   │   ├── BootScene.ts            # Loads critical assets, shows loading bar, → MainMenu
│   │   ├── MainMenuScene.ts        # "Happy Birthday Dancy" letter-drop animation
│   │   ├── GameScene.ts            # Gameplay orchestrator — owns all game systems
│   │   ├── UIOverlayScene.ts       # Parallel scene: HUD + compass (never destroyed)
│   │   ├── ScrapbookScene.ts       # Post-level overlay: Soso's messages, stats, stamps
│   │   ├── TransitionScene.ts      # Iris-wipe between levels
│   │   └── FinaleScene.ts          # Level 22: confetti, final letter, gift clue
│   │
│   ├── systems/                    # Game-specific logic
│   │   ├── PlayerController.ts     # Smooth-grid movement state machine
│   │   ├── TilemapRenderer.ts      # Draws tile layers from map data
│   │   ├── HeartManager.ts         # Heart hiding, reveal, moving-heart behavior
│   │   ├── CollisionMap.ts         # Walkability grid; tile-to-pixel helpers
│   │   ├── CameraController.ts     # Lerp follow-cam, world↔screen transforms
│   │   ├── CompassSystem.ts        # Proximity distance → pulse interval
│   │   ├── ParticleEmitter.ts      # Pool-based sparkle and confetti particles
│   │   ├── AnimationController.ts  # Spritesheet frame state machine
│   │   ├── DecoySystem.ts          # Autumn berry decoys + Soso giggle
│   │   ├── FogSystem.ts            # Winter snow overlays + shovel mechanic
│   │   ├── PowerupSystem.ts        # Inventory, activation, duration timers
│   │   ├── HintSystem.ts           # 45s idle → "Soso Call" dialogue
│   │   ├── ScrapbookManager.ts     # Unlock state, stats, master-catcher tracking
│   │   └── SaveManager.ts          # localStorage read/write
│   │
│   ├── data/
│   │   ├── types.ts                # All shared TypeScript interfaces
│   │   ├── LevelRegistry.ts        # Ordered array of all 22 LevelConfig objects
│   │   ├── levels/
│   │   │   ├── level01.ts … level22.ts  # Pure data: tiles, hearts, powerups, hints
│   │   └── scrapbook/
│   │       └── entries.ts          # All 22 personalized messages from Soso
│   │
│   └── ui/
│       ├── HUD.ts                  # Heart counter, powerup slots, level name
│       ├── Compass.ts              # Pulse widget drawn on canvas
│       ├── DialogueBox.ts          # Rounded box with avatar + typewriter text
│       └── ScrapbookPage.ts        # Page layout renderer (text, stats, stamp)
│
└── assets/
    ├── sprites/
    │   ├── danidu-walk.png         # 16×16 per frame, 8 dirs × 4 frames = 32 frames
    │   ├── heart-normal.png        # 16×16, 4 animation frames
    │   ├── heart-golden.png        # 16×16, 6 frames (sparkle cycle)
    │   ├── heart-moving.png        # 16×16, 6 frames (flutter)
    │   ├── grass-rustle.png        # 16×16, 5 frames (squash-stretch)
    │   ├── soso-giggle.png         # 32×32, 4 frames
    │   ├── snow-shovel.png         # 16×16, 3 frames
    │   └── memory-fragment.png     # 16×16, 2 frames
    ├── tilesets/
    │   ├── spring.png              # 160×160, 10×10 tiles at 16×16
    │   ├── summer.png
    │   ├── autumn.png
    │   └── winter.png
    ├── ui/
    │   ├── compass.png             # 32×32, 4 pulse frames
    │   ├── scrapbook-cover.png     # 320×240, 6 opening frames
    │   ├── scrapbook-page.png      # 280×200 blank page background
    │   ├── stamp-gold.png          # 48×48
    │   └── polaroid-frame.png      # Frame overlay for memory photos
    ├── audio/
    │   ├── music/spring.ogg, summer.ogg, autumn.ogg, winter.ogg, finale.ogg, scrapbook.ogg
    │   └── sfx/heart-find.ogg, grass-rustle.ogg, decoy-giggle.ogg, shovel.ogg,
    │           level-complete.ogg, page-turn.ogg, compass-tick.ogg, powerup.ogg
    └── photos/
        └── memory-01.jpg … (pixelated real photos for Memory Fragments)
```

---

## Core Data Types (`src/data/types.ts`)

```typescript
export enum Season { Spring, Summer, Autumn, Winter, Finale }
export enum HeartType { Normal = "normal", Moving = "moving", Golden = "golden" }
export enum PowerupType { RunningShoes, SweetScent, Mower, MemoryFragment }

export interface TilePos { tx: number; ty: number }

export interface MapLayer {
  width: number; height: number;
  tiles: number[];        // flat array, index = ty * width + tx; 0 = empty
}

export interface LevelConfig {
  id: number;
  season: Season;
  displayName: string;
  map: {
    width: number; height: number;   // in tiles
    ground: number[];                // tile indices (flat)
    decoration: number[];
    obstacles: number[];             // collision: non-zero = solid
    overhead: number[];              // drawn above player
    tilesetKey: string;              // 'spring' | 'summer' | 'autumn' | 'winter'
  };
  playerStart: TilePos;
  heartsRequired: number;
  hearts: Array<{
    pos: TilePos; type: HeartType; hiddenIn: string;
    moveDelayMs?: number;            // Summer moving hearts
  }>;
  decoys?: Array<{ pos: TilePos }>;
  snowTiles?: TilePos[];             // Winter: require shovel
  fogEnabled?: boolean;
  powerups: Array<{ pos: TilePos; type: PowerupType; photoIndex?: number }>;
  hintText: string[];
  musicKey: string;
  scrapbookEntryId: number;
}

export interface ScrapbookEntry {
  id: number; levelId: number;
  title: string; message: string;
}

export interface SaveData {
  currentLevel: number;
  levels: Record<number, {
    completed: boolean; bestTimeMs: number;
    heartsFound: number; masterCatcher: boolean;
  }>;
}
```

---

## Engine Design

### Game Loop (`src/engine/GameLoop.ts`)
Fixed-timestep accumulator — game logic always runs at 60 ticks/sec regardless of display refresh rate:
```typescript
// Fixed step: 1000/60 ms. Accumulate elapsed time, drain with fixed updates.
// Render receives interpolation alpha (accumulator / FIXED_STEP) for smooth visuals.
while (accumulator >= FIXED_STEP) { update(FIXED_STEP / 1000); accumulator -= FIXED_STEP; }
render(accumulator / FIXED_STEP);
```

### Renderer (`src/engine/Renderer.ts`)
- Internal canvas: 320×240 pixels (`width`/`height` attributes)
- CSS scales it to fill viewport: `canvas { width: 100%; height: 100%; image-rendering: pixelated; }`
- `ctx.imageSmoothingEnabled = false` — critical for pixel-art crispness
- On HiDPI screens: `devicePixelRatio` scaling applied to the display canvas, game canvas stays 320×240
- Exposes `ctx: CanvasRenderingContext2D` — all systems draw to this

### Scene Manager (`src/engine/SceneManager.ts`)
- Stack-based: `push(scene)` for overlays (Scrapbook over Game), `pop()` to return
- `switch(scene)` replaces the stack for full transitions
- `updateAll(dt)` and `renderAll(ctx)` walk the stack; only top scene receives input unless marked `transparent`
- UIOverlayScene runs permanently in a separate parallel slot (never stacked)

### Input Manager (`src/engine/InputManager.ts`)
- **Keyboard:** `keydown`/`keyup` listeners → `Set<string>` of active keys
- **Gamepad:** `navigator.getGamepads()` polled each frame (Gamepad API has no events)
- **Touch:** `pointerdown`/`pointermove` listeners → stores tap tile target for tap-to-walk
- Exposes unified query methods: `isDown('ArrowUp' | 'KeyW')`, `isActionDown()`, `getTouchTarget()`

### Audio Engine (`src/engine/AudioEngine.ts`)
Web Audio API — must be initialized on first user gesture (browser autoplay policy):
```typescript
// Music playback:
const source = ctx.createBufferSource();
source.buffer = decodedBuffer; source.loop = true;
source.connect(musicGain); musicGain.connect(ctx.destination);

// Crossfade between tracks:
oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
newGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1.0);

// SFX one-shot:
const sfx = ctx.createBufferSource();
sfx.buffer = sfxBuffers[key]; sfx.connect(sfxGain); sfx.start();
```

### Tween Engine (`src/engine/TweenEngine.ts`)
- Stores active tweens: `{ target, prop, from, to, duration, elapsed, easing, onComplete }`
- Updated each fixed tick; applies `target[prop] = easing(elapsed/duration) * (to - from) + from`
- Built-in easings: `linear`, `easeOutQuad`, `easeInOutQuad`, `easeOutBounce`, `easeOutElastic`
- Used for: heart pop (scale 0→1.3→1.0), compass pulse (scale 1→1.2→1.0), grass squash-stretch, transitions

### Asset Loader (`src/engine/AssetLoader.ts`)
```typescript
// Images: new Image() + onload promise
// Audio: fetch(url) → arrayBuffer → AudioContext.decodeAudioData()
// All assets stored in a Map<string, HTMLImageElement | AudioBuffer>
// Boot scene loads critical assets; PreloadScene loads per-level assets
```

---

## Rendering Architecture

### Tilemap Rendering (`src/systems/TilemapRenderer.ts`)
Map layers drawn in order each frame:
1. `ground` layer — `ctx.drawImage(tileset, srcX, srcY, 16, 16, worldX, worldY, 16, 16)`
2. `decoration` layer
3. `obstacles` layer (above-ground parts of trees, walls)
4. **Y-sorted world objects**: player + NPCs + interactive objects sorted by `worldY`, drawn in order
5. `overhead` layer — tree canopies, always drawn last (above everything)

Tile index → tileset coordinates: `srcX = (idx % 10) * 16`, `srcY = Math.floor(idx / 10) * 16`

### Camera & World↔Screen (`src/systems/CameraController.ts`)
```typescript
// Camera position = player world position - (viewportWidth/2, viewportHeight/2)
// Lerp: camera.x += (target.x - camera.x) * 0.12
// Clamp to world bounds; round to integer to prevent sub-pixel jitter
// World→screen transform applied to each drawImage call:
// screenX = worldX - Math.round(camera.x), screenY = worldY - Math.round(camera.y)
```

### 2.5D Depth Sorting
Each "world object" (player, Soso giggle sprite, heart reveals) has a `worldY` value.
Sort the list by `worldY` each frame before drawing. Objects higher on screen (smaller Y) appear behind objects lower on screen (larger Y). The overhead tile layer is always drawn after everything.

---

## Gameplay Systems

### Smooth-Grid Movement (`src/systems/PlayerController.ts`)
State machine with three states: `IDLE`, `MOVING`, `INTERACTING`:
- **IDLE:** Poll input → if direction pressed and neighbor tile walkable → start tween to neighbor, enter MOVING. Face direction even if blocked.
- **MOVING:** Tween moves sprite `worldX/Y` from current tile center to target tile center over `150ms`. Buffer exactly one input during tween. On complete → snap to tile, enter IDLE, apply buffered input.
- Diagonal movement: combine two axis inputs → resolve to diagonal tile neighbor
- Run mode: tween duration `150ms → 90ms` when running; sprint particle trail
- Mobile tap-to-walk: on pointer tap → store target tile; in IDLE, take one step toward it via simple `dx/dy` sign comparison

### Heart System (`src/systems/HeartManager.ts`)
- `Map<string, HeartState>` keyed by `"tx,ty"`
- Interact key → get facing tile → lookup → trigger `revealSequence()`:
  1. Play grass-rustle animation (5-frame squash-stretch sprite)
  2. If heart found: spawn sparkle particles + play chime SFX + heart pop-up tween + update HUD counter
  3. If empty: play empty rustle SFX only
- Moving hearts (Summer): `setInterval`-equivalent using accumulated `dt` timer; if player within 3 tiles → relocate heart key to random walkable neighbor; no visual indicator

### Compass (`src/systems/CompassSystem.ts`)
Each frame: find nearest unfound heart world position → compute pixel distance → map to pulse interval:
```typescript
const nearest = Math.min(...hearts.map(h => dist(playerPos, tileCenter(h.pos))));
const normalized = 1 - Math.min(nearest / 200, 1); // 0=far, 1=close
const intervalMs = lerp(2000, 150, normalized);
const tint = normalized > 0.7 ? '#ff0000' : '#ff8800';
```
Compass widget drawn on UI canvas (separate from game canvas, overlaid via CSS `position:absolute`).

### Particle Emitter (`src/systems/ParticleEmitter.ts`)
Pool of 100 particle objects (pre-allocated, recycled):
```typescript
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
// On emit: activate N particles from pool, randomize velocity/angle
// On update: move by velocity, reduce life; apply gravity for confetti
// On render: ctx.fillRect(p.x - camera.x, p.y - camera.y, p.size, p.size)
```

### Scrapbook Scene (`src/scenes/ScrapbookScene.ts`)
Pushed onto scene stack over GameScene. Receives `{ levelId }` data:
1. Fade-in dark overlay (semi-transparent black `fillRect`)
2. Draw scrapbook cover image; play book-open animation (6 frames at 8fps)
3. Render `ScrapbookPage`: title, typewriter effect for Soso's message (reveal one character per 30ms tick), level stats, stamp if earned
4. Left/right arrow to navigate previously unlocked entries
5. Z/Space/Enter → `sceneManager.pop()` → returns to GameScene; GameScene advances level

### Soso Call Hint (`src/systems/HintSystem.ts`)
```typescript
// Reset a countdown timer to 45000ms on every:
//   - player tile move
//   - heart found
// On expiry: EventBus.emit('show-dialogue', { text: randomHint, avatar: 'soso' })
// DialogueBox renders on UIOverlay; player can still move while it's showing
// Dismiss on interact key; timer resets
```

---

## Development Phases

### Phase 1 — Project Scaffold
- `npm create vite@latest heart-catcher -- --template vanilla-ts`
- `vite.config.ts`: `base: './'`, `assetsInclude: ['**/*.json']`
- `index.html`: single `<canvas id="game" width="320" height="240">` + CSS for pixel-perfect full-screen scaling
- `src/engine/GameLoop.ts` + `Renderer.ts` wired in `main.ts`
- Render a test rectangle at 60fps; confirm pixel-art scaling on retina display

**Milestone:** `npm run dev` → black canvas + colored test rect, no blur on retina.

### Phase 2 — Asset Loader + Input Manager
- `AssetLoader.ts`: load PNG as `HTMLImageElement`, load OGG as `AudioBuffer`
- `InputManager.ts`: keyboard Set, Gamepad API poll, pointer tap target
- `BootScene.ts`: loads a test sprite + font image, renders loading progress bar

**Milestone:** A sprite image loads and is drawn to canvas. Keyboard presses logged.

### Phase 3 — Tilemap + Camera + Collision
- `TilemapRenderer.ts`: draw 5 flat tile layers from `LevelConfig.map` data
- `CollisionMap.ts`: `isWalkable(tx, ty)` — obstacles layer non-zero = solid
- `CameraController.ts`: lerp follow, world↔screen transforms, clamp to bounds
- Define `level01` map data (20×15 tile Spring map in TypeScript)

**Milestone:** Spring level 1 map renders and scrolls; camera follows a moving test point.

### Phase 4 — Player Movement
- `PlayerController.ts`: IDLE/MOVING/INTERACTING state machine
- `AnimationController.ts`: 8-directional walk animation (8 dirs × 4 frames spritesheet)
- Wire to `InputManager`; all three input methods (keyboard, gamepad, touch tap)
- 2.5D depth sort (player Y vs obstacle Y)

**Milestone:** Danidu walks in all 8 directions, collides with obstacles, walks behind trees; camera follows; tap-to-walk works on mobile.

### Phase 5 — Heart System + Game Juice
- `HeartManager.ts`: seed from `LevelConfig.hearts`, interaction lookup
- `ParticleEmitter.ts`: sparkle burst on heart reveal
- `TweenEngine.ts`: heart pop-up scale tween, grass squash-stretch tween
- `AudioEngine.ts`: Web Audio API init on first user gesture; play `heart-find.ogg` and `grass-rustle.ogg`
- Level-complete sequence: victory jingle → 1.5s pause → push ScrapbookScene

**Milestone:** Level 1 fully completable. All 20 hearts findable. Sparkle + chime on each find. Scrapbook opens afterward.

### Phase 6 — UI: HUD + Compass + Scrapbook
- `UIOverlayScene.ts` running in parallel; draws on same canvas after GameScene
- `HUD.ts`: heart counter top-left, powerup slots bottom-right, level name centered top
- `CompassSystem.ts` + `Compass.ts`: proximity pulse animation
- `ScrapbookScene.ts`: full overlay with book-open animation, typewriter text, page navigation
- `EventBus.ts`: `GameScene` emits `heart-found`, `player-moved`; UIOverlay listens

**Milestone:** Compass pulses faster as player approaches hearts. Scrapbook opens post-level with Soso's message. HUD live.

### Phase 7 — Difficulty Mechanics
- **Summer moving hearts:** accumulated `dt` timer in `HeartManager`; relocate on proximity
- **Autumn decoys** (`DecoySystem.ts`): check decoy Map before HeartManager; trigger Soso giggle sprite + SFX; emit `'decoy-triggered'` → `ScrapbookManager` withholds Master Catcher stamp
- **Winter snow** (`FogSystem.ts`): render snow overlay sprites on configured tiles; shovel interaction (Z while facing) plays 3-frame removal animation → tile becomes interactable; fog variant: `ctx.fillRect` full map at 60% opacity + `ctx.save/restore` with `globalCompositeOperation: 'destination-out'` to punch circular visibility around player
- **Soso Call** (`HintSystem.ts`): 45s idle → `DialogueBox` with level hint

**Milestone:** Level 6 hearts flee. Level 13 decoys giggle. Level 19 snow requires shoveling. Soso Call triggers after 45s idle.

### Phase 8 — Powerups
- `PowerupSystem.ts`: walk-over collection (overlap check in update), inventory Map
- **Running Shoes:** `PlayerController` checks `isRunActive()` → tween duration 150→90ms
- **Sweet Scent:** one-use; draws golden glow ring around hearts within 5 tiles for 3s via `TweenEngine` alpha fade
- **Mower:** crosshair cursor overlay → 3×3 tile selector → confirm → `HeartManager.checkInteraction` all 9 tiles
- **Memory Fragment:** immediate push of photo overlay scene with Polaroid frame + pixelated real photo

**Milestone:** All 4 powerups functional.

### Phase 9 — Audio
- `AudioEngine.ts`: full music system — loop, crossfade between seasons via `linearRampToValueAtTime`
- All SFX wired to correct trigger points
- Volume settings (Escape → settings overlay with sliders drawn on canvas)
- `SaveManager.ts`: write to localStorage after every level complete

**Milestone:** Music crossfades between seasons. All SFX trigger correctly. Progress survives page refresh.

### Phase 10 — All 22 Levels + Scrapbook Content
- 5 base map templates (Spring, Summer, Autumn, Winter, Finale) as TypeScript objects; duplicate and modify per level
- All `LevelConfig` objects in `src/data/levels/level01.ts … level22.ts`
- All 22 scrapbook messages written in `src/data/scrapbook/entries.ts`
- Level 22: 22 golden hearts, Birthday Grove map (balloons in tile data), finale music, full-screen animation, final letter, physical gift clue

### Phase 11 — Polish + Deploy
- `MainMenuScene.ts`: "Happy Birthday Dancy" letters drop in with `easeOutBounce` tween
- `TransitionScene.ts`: iris-wipe via canvas circular clip (`ctx.arc` + `clip()`) shrinking/expanding
- `FinaleScene.ts`: confetti particles, typewriter final letter, gift clue button
- Performance audit: confirm 60fps on mid-range mobile; pool grass-rustle sprites; batch tilemap draws
- Cross-browser test: Chrome, Firefox, Safari, iOS Safari, Android Chrome
- `npm run build` → `dist/` folder

**Deploy to GitHub Pages:**
```yaml
# .github/workflows/deploy.yml
- run: npm ci && npm run build
- uses: peaceiris/actions-gh-pages@v3
  with: { publish_dir: ./dist }
```
`vite.config.ts`: `base: '/heart-catcher/'`
Live at: `https://sonarasolomon.github.io/heart-catcher/` — share as a URL gift.

---

## Key Implementation Notes

**Pixel-perfect canvas scaling (index.html):**
```html
<style>
  body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
  canvas { image-rendering: pixelated; image-rendering: crisp-edges; width: min(100vw, calc(100vh * 4/3)); height: min(100vh, calc(100vw * 3/4)); }
</style>
<canvas id="game" width="320" height="240"></canvas>
```

**Spritesheet draw:**
```typescript
// ctx.imageSmoothingEnabled = false — set ONCE on Renderer init
ctx.drawImage(sheet, srcX * 16, srcY * 16, 16, 16, screenX, screenY, 16, 16);
```

**Web Audio init (must be in user gesture handler):**
```typescript
document.addEventListener('keydown', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });
```

**Winter fog punchout:**
```typescript
ctx.fillStyle = 'rgba(0,0,30,0.7)';
ctx.fillRect(0, 0, 320, 240);
ctx.globalCompositeOperation = 'destination-out';
ctx.beginPath();
ctx.arc(playerScreenX, playerScreenY, 64, 0, Math.PI * 2);
ctx.fill();
ctx.globalCompositeOperation = 'source-over';
```

---

## Assets to Create

**Pixel Art (Aseprite — free tool, not a game framework):**
| Asset | Size | Frames |
|---|---|---|
| Danidu walk spritesheet | 16×16/frame | 8 dirs × 4 frames |
| Heart variants (normal, golden, moving) | 16×16/frame | 4–6 frames each |
| Grass rustle | 16×16/frame | 5 frames |
| Soso giggle | 32×32/frame | 4 frames |
| Snow shovel reveal | 16×16/frame | 3 frames |
| Season tilesets (×4) | 160×160 | Static (100 tiles) |
| Compass, scrapbook UI | various | 4–6 frames |

**Free asset bases:** Kenney.nl (UI elements, placeholder tiles), freesound.org (SFX base sounds).

**Audio:** BeepBox (browser-based, zero install) for SFX; LMMS for music. Export `.ogg`.

**Photos:** Pixelate in Preview/GIMP: scale to 48×36 → scale back to 240×180 nearest-neighbor.

---

## Verification Checklist

1. `npm run dev` → 320×240 pixel-crisp canvas, no blur, 60fps
2. All 3 input methods work (keyboard, gamepad, mobile tap)
3. Level 1: find all 20 hearts → victory jingle → scrapbook message
4. Level 6: hearts visibly flee when approached
5. Level 13: decoy berry → Soso giggle; Master Catcher stamp withheld
6. Level 19: snow tiles require shovel before interaction; fog obscures far tiles
7. Level 22: 22 golden hearts → full finale animation → final letter → gift clue
8. Refresh page → progress restored from localStorage
9. `npm run build` → `dist/` folder under 5MB
10. Deploy to GitHub Pages → URL works on desktop + iOS Safari + Android Chrome

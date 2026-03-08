/**
 * generate-placeholders.mjs
 * Pokémon BW2-style rich pixel art tilesets + Dancy portrait.
 * Run: node scripts/generate-placeholders.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

let canvas, loadImage;
try {
  const mod = await import('canvas');
  canvas = mod.createCanvas;
  loadImage = mod.loadImage;
} catch {
  console.log('💡  Install canvas: npm install canvas');
  process.exit(0);
}

// Load exterior.png for real path tiles (rows 10-11, cols 4-7 = cobblestone paths)
let exteriorImg = null;
try {
  const extPath = fileURLToPath(new URL('../../exterior.png', import.meta.url));
  exteriorImg = await loadImage(extPath);
  console.log('  ✓ Loaded exterior.png for path tiles');
} catch {
  console.log('  ⚠ exterior.png not found — using procedural paths');
}

function makeCanvas(w, h) { return canvas(w, h); }

function savePNG(filePath, w, h, drawFn) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, w, h);
  const buf = c.toBuffer('image/png');
  writeFileSync(filePath, buf);
  console.log(`  ✓ ${filePath}`);
}

function ensureDir(path) { mkdirSync(path, { recursive: true }); }

// ─── Colour helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, delta) {
  const [r,g,b] = hexToRgb(hex);
  const c = v => Math.max(0, Math.min(255, v + delta)).toString(16).padStart(2,'0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(hex1, hex2, t) {
  const [r1,g1,b1] = hexToRgb(hex1), [r2,g2,b2] = hexToRgb(hex2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ─── Seasonal palettes ────────────────────────────────────────────────────────

const SEASONS = {
  autumn: {
    // Rich russet-gold ground, vivid red/orange canopy, very dark conifers
    grass: '#96721a', grassDark: '#6e4e0a', path: '#c4904a',
    leaf1: '#e05020', leaf2: '#b01808', leaf3: '#d4a010',
    conifer: '#1a4a0c', berry: '#cc1010', highlight: '#e8b020',
    trunk: '#4a2808', tall: '#7a4010', tallLight: '#b86820',
  },
  spring: {
    // Fresh bright greens, pink berry blossoms, warm tan path
    grass: '#6aba38', grassDark: '#3e7a20', path: '#c4b060',
    leaf1: '#90d838', leaf2: '#b8e050', leaf3: '#e8f8a0',
    conifer: '#2a5c18', berry: '#f04878', highlight: '#d8f080',
    trunk: '#724828', tall: '#285e1a', tallLight: '#58a028',
  },
  summer: {
    // Deep lush greens, warm amber path, rich dark conifers
    grass: '#48a030', grassDark: '#246818', path: '#c08828',
    leaf1: '#28bc40', leaf2: '#58d058', leaf3: '#90e060',
    conifer: '#144020', berry: '#e42818', highlight: '#88e048',
    trunk: '#603818', tall: '#145020', tallLight: '#389028',
  },
  winter: {
    // Icy blue-white snow, grey-blue conifers, pale bark
    grass: '#c8e0f0', grassDark: '#98c0d8', path: '#b0c8e0',
    leaf1: '#e0f0ff', leaf2: '#b8d0e8', leaf3: '#f8ffff',
    conifer: '#485e70', berry: '#98b0c8', highlight: '#f8ffff',
    trunk: '#687888', tall: '#88a0c0', tallLight: '#c0d8ec',
  },
};

// ─── Tile drawing functions ────────────────────────────────────────────────────

/**
 * Rich grass: multi-shade checkerboard + 12 blade strokes.
 * Autumn variant adds fallen-leaf dots.
 */
function drawRichGrass(ctx, ox, oy, pal, variant = 0) {
  const g  = pal.grass;
  const gd = pal.grassDark;
  const gl = shade(g, 18);
  // Checkerboard base
  for (let ty = 0; ty < 16; ty++) {
    for (let tx = 0; tx < 16; tx++) {
      const even = ((tx >> 1) + (ty >> 1)) % 2 === 0;
      ctx.fillStyle = even ? g : mix(g, gd, 0.4);
      ctx.fillRect(ox + tx, oy + ty, 1, 1);
    }
  }
  // Shade variation by variant
  if (variant === 1) {
    ctx.fillStyle = mix(g, gd, 0.25);
    ctx.fillRect(ox, oy, 16, 3);
    ctx.fillRect(ox, oy + 13, 16, 3);
  } else if (variant === 2) {
    ctx.fillStyle = mix(g, gl, 0.3);
    ctx.fillRect(ox + 3, oy + 3, 10, 10);
  }
  // 12 grass blades
  const bladeXs = [1,2,4,5,7,8,10,11,13,14,0,6];
  const bladeHs = [4,6,3,5,4,7,3,5,4,6,5,3];
  for (let b = 0; b < 12; b++) {
    const bx = ox + (bladeXs[(b + variant * 4) % 12]);
    const bh = bladeHs[(b + variant) % 12];
    const by = oy + 16 - bh - (b % 3);
    ctx.fillStyle = b % 3 === 0 ? gl : b % 3 === 1 ? g : mix(g, gd, 0.5);
    ctx.fillRect(bx, by, 1, bh);
  }
  // Fallen leaf dots (always draw if leaf3 is defined — autumn/spring style)
  if (pal.leaf3) {
    const leafDots = [[3,6],[9,4],[13,10],[6,12],[11,7],[1,10],[15,3],[7,14]];
    for (let d = 0; d < leafDots.length - (variant === 0 ? 0 : 3); d++) {
      const [lx, ly] = leafDots[d];
      ctx.fillStyle = d % 3 === 0 ? pal.leaf1 : d % 3 === 1 ? pal.leaf3 : pal.leaf2;
      ctx.fillRect(ox + lx, oy + ly, 2, 1);
      ctx.fillRect(ox + lx + 1, oy + ly + 1, 1, 1);
    }
  }
}

/**
 * Winding path: lighter worn center channel, pebble dots, darker worn edges.
 * variant 0=straight (horizontal center), 1=diagonal curve.
 */
function drawWindingPath(ctx, ox, oy, pal, variant = 0) {
  const p  = pal.path;
  const pL = shade(p, 22);
  const pD = shade(p, -20);
  // Full base
  ctx.fillStyle = p;
  ctx.fillRect(ox, oy, 16, 16);
  if (variant === 0) {
    // Straight: worn lighter channel in center rows 5-10
    ctx.fillStyle = pL;
    ctx.fillRect(ox, oy + 5, 16, 6);
    // Darker edge wear
    ctx.fillStyle = pD;
    ctx.fillRect(ox, oy, 16, 2);
    ctx.fillRect(ox, oy + 14, 16, 2);
  } else {
    // Curve: S-bend, channel shifts from left side to right
    for (let row = 0; row < 16; row++) {
      const offset = Math.round(Math.sin((row / 16) * Math.PI) * 4);
      ctx.fillStyle = pL;
      ctx.fillRect(ox + 2 + offset, oy + row, 8, 1);
      ctx.fillStyle = pD;
      ctx.fillRect(ox + offset, oy + row, 2, 1);
    }
  }
  // Pebble dots
  const pebbles = [[2,3],[5,7],[9,2],[12,5],[14,11],[3,13],[7,9],[11,13]];
  for (let d = 0; d < pebbles.length; d++) {
    const [px, py] = pebbles[d];
    ctx.fillStyle = d % 2 === 0 ? shade(p, 30) : pD;
    ctx.fillRect(ox + px, oy + py, 2, 1);
    ctx.fillRect(ox + px + 1, oy + py + 1, 1, 1);
  }
}

/**
 * Dense undergrowth: dark base + 8 bushy clumps with highlights.
 */
function drawDenseUndergrowth(ctx, ox, oy, pal) {
  const base = mix(pal.grassDark, '#000000', 0.35);
  const mid  = pal.grassDark;
  const high = pal.grass;
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, 16, 16);
  // 8 bushy clumps
  const clumps = [[1,8],[4,5],[7,9],[10,6],[13,8],[2,12],[8,12],[12,11]];
  const clumpSizes = [3,4,3,4,3,3,4,3];
  for (let c = 0; c < 8; c++) {
    const [cx, cy] = clumps[c];
    const sz = clumpSizes[c];
    // Clump body
    ctx.fillStyle = mid;
    ctx.fillRect(ox + cx, oy + cy, sz, sz - 1);
    ctx.fillRect(ox + cx + 1, oy + cy - 1, sz - 2, 1);
    // Highlight top
    ctx.fillStyle = high;
    ctx.fillRect(ox + cx + 1, oy + cy, sz - 2, 1);
    // Dark shadow base
    ctx.fillStyle = base;
    ctx.fillRect(ox + cx, oy + cy + sz - 1, sz, 1);
  }
}

/**
 * Berry bush: rounded bush silhouette + clustered berry dots.
 * bgFn: optional function to draw the background (defaults to procedural grass).
 */
function drawBerryBush(ctx, ox, oy, pal, bgFn) {
  const bushBase = mix(pal.grassDark, '#000000', 0.2);
  const bushMid  = pal.grassDark;
  const bushHigh = pal.grass;
  // Ground
  if (bgFn) bgFn(); else drawRichGrass(ctx, ox, oy, pal, 1);
  // Bush blob (centered, 12×10)
  ctx.fillStyle = shade(bushBase, -10);
  ctx.fillRect(ox + 2, oy + 4, 12, 9);
  ctx.fillRect(ox + 3, oy + 3, 10, 1);
  ctx.fillRect(ox + 1, oy + 5, 14, 7);
  ctx.fillStyle = bushMid;
  ctx.fillRect(ox + 3, oy + 5, 10, 7);
  ctx.fillRect(ox + 2, oy + 6, 12, 5);
  // Bush highlight rim
  ctx.fillStyle = bushHigh;
  ctx.fillRect(ox + 4, oy + 4, 6, 2);
  ctx.fillRect(ox + 3, oy + 5, 2, 2);
  ctx.fillRect(ox + 11, oy + 5, 2, 2);
  // 6 berry clusters
  const berries = [[4,7],[7,6],[10,7],[5,10],[8,10],[11,8]];
  for (const [bx, by] of berries) {
    ctx.fillStyle = pal.berry;
    ctx.fillRect(ox + bx, oy + by, 2, 2);
    ctx.fillStyle = shade(pal.berry, 40);
    ctx.fillRect(ox + bx, oy + by, 1, 1);
  }
}

/**
 * Rich canopy: 4-layer arc per quadrant — dark shadow → mid-tone → bright highlights.
 * Includes secondary color patches for multi-tone autumn depth.
 * Transparent corners so ground shows through.
 */
function drawRichCanopy(ctx, ox, oy, quadrant, pal) {
  const outline  = shade(pal.leaf2, -55);
  const dark     = pal.leaf2;
  const mid      = pal.leaf1;
  const accent   = pal.leaf3 ?? pal.highlight;
  const high     = pal.highlight;
  // Circle center at inner corner of the quadrant
  const cx = (quadrant === 'tl' || quadrant === 'bl') ? ox + 16 : ox;
  const cy = (quadrant === 'tl' || quadrant === 'tr') ? oy + 16 : oy;
  ctx.clearRect(ox, oy, 16, 16);
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy, 16, 16); ctx.clip();
  // Layer 1: outline ring (darkest edge)
  ctx.beginPath(); ctx.arc(cx, cy, 15.5, 0, Math.PI * 2);
  ctx.fillStyle = outline; ctx.fill();
  // Layer 2: dark shadow
  ctx.beginPath(); ctx.arc(cx, cy, 14.0, 0, Math.PI * 2);
  ctx.fillStyle = dark; ctx.fill();
  // Layer 3: main mid canopy color
  ctx.beginPath(); ctx.arc(cx, cy, 12.2, 0, Math.PI * 2);
  ctx.fillStyle = mid; ctx.fill();
  // Layer 4: accent color sub-blobs (color variation within tile)
  const isL = quadrant === 'tl' || quadrant === 'bl';
  const isT = quadrant === 'tl' || quadrant === 'tr';
  const ax = ox + (isL ? 7 : 8);
  const ay = oy + (isT ? 7 : 8);
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(ax, ay, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ax + (isL ? -2 : 2), ay + (isT ? 3 : -3), 3.0, 0, Math.PI * 2); ctx.fill();
  // Layer 5: highlight blobs (brightest)
  const hx = isL ? 11 : 4;
  const hy = isT ? 11 : 4;
  ctx.fillStyle = high;
  ctx.beginPath(); ctx.arc(ox + hx, oy + hy, 2.8, 0, Math.PI * 2); ctx.fill();
  // Shine pixel
  ctx.fillStyle = '#ffffffbb';
  ctx.fillRect(ox + (isL ? 13 : 2), oy + (isT ? 13 : 2), 1, 1);
  ctx.restore();
}

/**
 * Conifer quadrant: dark triangular shape for contrast.
 */
function drawConifer(ctx, ox, oy, quadrant, pal) {
  const dark  = pal.conifer;
  const mid   = shade(pal.conifer, 20);
  const light = shade(pal.conifer, 40);
  ctx.clearRect(ox, oy, 16, 16);
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy, 16, 16); ctx.clip();
  // Base outline
  const cx = (quadrant === 'tl' || quadrant === 'bl') ? ox + 16 : ox;
  const cy = (quadrant === 'tl' || quadrant === 'tr') ? oy + 16 : oy;
  ctx.beginPath(); ctx.arc(cx, cy, 15.5, 0, Math.PI * 2);
  ctx.fillStyle = shade(dark, -30); ctx.fill();
  // Triangular tiers (2 banding rows)
  ctx.beginPath(); ctx.arc(cx, cy, 13.5, 0, Math.PI * 2);
  ctx.fillStyle = dark; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, 11.0, 0, Math.PI * 2);
  ctx.fillStyle = mid; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = light; ctx.fill();
  // Highlight
  const isL = quadrant === 'tl' || quadrant === 'bl';
  const isT = quadrant === 'tl' || quadrant === 'tr';
  ctx.fillStyle = '#ffffff55';
  ctx.fillRect(ox + (isL ? 12 : 3), oy + (isT ? 12 : 3), 1, 1);
  ctx.restore();
}

/**
 * Pokémon-style tree trunk quadrant tile (grass background + brown trunk column).
 */
function drawPokemonTrunk(ctx, ox, oy, quadrant, pal) {
  const tC = pal.trunk;
  const tL = shade(tC, 30);
  const tD = shade(tC, -35);
  drawRichGrass(ctx, ox, oy, pal, 0);
  const isLeft = quadrant === 'tl' || quadrant === 'bl';
  const tx = isLeft ? 9 : 0;
  const tw = 7;
  ctx.fillStyle = tC; ctx.fillRect(ox + tx, oy, tw, 16);
  ctx.fillStyle = tL; ctx.fillRect(ox + tx, oy, 2, 16);
  ctx.fillStyle = tD; ctx.fillRect(ox + tx + tw - 2, oy, 2, 16);
  // Root spread at base
  if (quadrant === 'bl' || quadrant === 'br') {
    ctx.fillStyle = tD;
    ctx.fillRect(ox + (isLeft ? 7 : 0), oy + 12, tw + 2, 4);
    ctx.fillStyle = tC;
    ctx.fillRect(ox + (isLeft ? 8 : 0), oy + 13, tw, 2);
  }
  // Bark texture
  for (let by = 2; by < 14; by += 4) {
    ctx.fillStyle = tD;
    ctx.fillRect(ox + tx + 2, oy + by, tw - 4, 1);
  }
}

/**
 * Tall grass tile — richer colors.
 */
function drawTallGrassTile(ctx, ox, oy, pal) {
  const base  = mix(pal.tall, '#000000', 0.3);
  const light = pal.tallLight;
  const mid   = pal.tall;
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, 16, 16);
  for (let b = 0; b < 8; b++) {
    const bx = ox + 1 + b * 2;
    const bh = 7 + b % 5;
    const by = oy + 16 - bh;
    ctx.fillStyle = b % 2 === 0 ? light : mid;
    ctx.fillRect(bx, by, 1, bh);
    // Tip highlight
    ctx.fillStyle = '#ffffff55';
    ctx.fillRect(bx, by, 1, 1);
    // Tip droop
    ctx.fillStyle = shade(b % 2 === 0 ? light : mid, -15);
    ctx.fillRect(bx + (b % 2 === 0 ? 1 : -1), by, 1, 2);
  }
  // Ground shadow
  ctx.fillStyle = shade(base, -10);
  ctx.fillRect(ox, oy + 13, 16, 3);
}

/**
 * Copy a 16×16 tile from exterior.png onto the tileset canvas.
 * extCol / extRow are 0-indexed tile grid coordinates in exterior.png (17 cols wide).
 * Falls back to the provided fallback draw function if exterior.png wasn't loaded.
 */
function drawExtTile(ctx, ox, oy, extCol, extRow, fallbackFn) {
  if (exteriorImg) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(exteriorImg, extCol * 16, extRow * 16, 16, 16, ox, oy, 16, 16);
    ctx.restore();
  } else if (fallbackFn) {
    fallbackFn();
  }
}

/**
 * Grass tile from exterior.png, tinted with the seasonal palette color.
 * Draws the seasonal grass color as a base, then overlays the exterior
 * leaf texture at partial opacity so the shape/detail comes through.
 */
function drawExtGrassTile(ctx, ox, oy, extCol, extRow, pal, fallbackFn) {
  if (!exteriorImg) {
    if (fallbackFn) fallbackFn();
    return;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // Seasonal color base (full opacity)
  ctx.fillStyle = pal.grass;
  ctx.fillRect(ox, oy, 16, 16);
  // Exterior leaf texture blended on top at ~40% opacity — adds shape detail
  ctx.globalAlpha = 0.4;
  ctx.drawImage(exteriorImg, extCol * 16, extRow * 16, 16, 16, ox, oy, 16, 16);
  ctx.restore();
}

// ─── Tileset builder ──────────────────────────────────────────────────────────

/**
 * 10-col × 10-row tileset (160×160).
 * Tile ID mapping (1-indexed):
 * Row 0: RichGrass(0), RichGrass(1), RichGrass(2), BerryBush, DenseUndergrowth,
 *         WindingPath(0), WindingPath(1), RichGrass(edge), DenseUndergrowth, TallGrass
 * Row 1: TreeTL, TreeTR, RichGrass×8
 * Row 2: TreeBL, TreeBR, ConiferTL, BerryBush, RichGrass×6
 * Row 3: CanopyTL, CanopyTR, RichGrass×8
 * Row 4: CanopyBL, CanopyBR, RichGrass×8
 * Rows 5-9: RichGrass
 */
function makeTileset(filePath, pal) {
  savePNG(filePath, 160, 160, (ctx) => {
    const tileDrawers = [
      // ── Row 0 ──
      (_,ox,oy) => drawExtGrassTile(ctx,ox,oy,4,15,pal,() => drawRichGrass(ctx,ox,oy,pal,0)),
      (_,ox,oy) => drawExtGrassTile(ctx,ox,oy,5,15,pal,() => drawRichGrass(ctx,ox,oy,pal,1)),
      (_,ox,oy) => drawExtGrassTile(ctx,ox,oy,13,15,pal,() => drawRichGrass(ctx,ox,oy,pal,2)),
      (_,ox,oy) => drawBerryBush(ctx,ox,oy,pal,() => drawExtGrassTile(ctx,ox,oy,4,15,pal,() => drawRichGrass(ctx,ox,oy,pal,1))),
      (_,ox,oy) => drawDenseUndergrowth(ctx,ox,oy,pal),
      (_,ox,oy) => drawExtTile(ctx,ox,oy,4,10,() => drawWindingPath(ctx,ox,oy,pal,0)),
      (_,ox,oy) => drawExtTile(ctx,ox,oy,5,10,() => drawWindingPath(ctx,ox,oy,pal,1)),
      (_,ox,oy) => { drawRichGrass(ctx,ox,oy,pal,0); /* edge */ ctx.fillStyle=shade(pal.grassDark,-10); ctx.fillRect(ox,oy,1,16); ctx.fillRect(ox+15,oy,1,16); },
      (_,ox,oy) => drawDenseUndergrowth(ctx,ox,oy,pal),
      (_,ox,oy) => drawTallGrassTile(ctx,ox,oy,pal),
      // ── Row 1 ──
      (_,ox,oy) => drawPokemonTrunk(ctx,ox,oy,'tl',pal),
      (_,ox,oy) => drawPokemonTrunk(ctx,ox,oy,'tr',pal),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,0),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,1),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,2),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,0),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,1),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,2),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,0),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,1),
      // ── Row 2 ──
      (_,ox,oy) => drawPokemonTrunk(ctx,ox,oy,'bl',pal),
      (_,ox,oy) => drawPokemonTrunk(ctx,ox,oy,'br',pal),
      (_,ox,oy) => drawConifer(ctx,ox,oy,'tl',pal),
      (_,ox,oy) => drawBerryBush(ctx,ox,oy,pal,() => drawExtGrassTile(ctx,ox,oy,4,15,pal,() => drawRichGrass(ctx,ox,oy,pal,1))),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,2),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,0),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,1),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,2),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,0),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,1),
      // ── Row 3 ──
      (_,ox,oy) => drawRichCanopy(ctx,ox,oy,'tl',pal),
      (_,ox,oy) => drawRichCanopy(ctx,ox,oy,'tr',pal),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,2),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,0),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,1),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,2),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,0),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,1),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,2),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,0),
      // ── Row 4 ──
      (_,ox,oy) => drawRichCanopy(ctx,ox,oy,'bl',pal),
      (_,ox,oy) => drawRichCanopy(ctx,ox,oy,'br',pal),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,1),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,2),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,0),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,1),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,2),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,0),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,1),
      (_,ox,oy) => drawRichGrass(ctx,ox,oy,pal,2),
    ];

    for (let i = 0; i < tileDrawers.length; i++) {
      const tx = i % 10, ty = Math.floor(i / 10);
      tileDrawers[i](i, tx * 16, ty * 16);
    }
    // Fill rows 5-9 with grass variants
    const extGrassCols = [4, 5, 13];
    for (let i = tileDrawers.length; i < 100; i++) {
      const tx = i % 10, ty = Math.floor(i / 10);
      const v = i % 3;
      drawExtGrassTile(ctx, tx * 16, ty * 16, extGrassCols[v], 15, pal, () => drawRichGrass(ctx, tx * 16, ty * 16, pal, v));
    }
  });
}

// ─── Generate assets ──────────────────────────────────────────────────────────

const ROOT = 'assets';
ensureDir(`${ROOT}/sprites`);
ensureDir(`${ROOT}/tilesets`);
ensureDir(`${ROOT}/ui`);
ensureDir(`${ROOT}/audio/sfx`);
ensureDir(`${ROOT}/audio/music`);
ensureDir(`${ROOT}/photos`);

console.log('\nGenerating assets (Pokémon BW2 style)...\n');

// ─── Seasonal tilesets ────────────────────────────────────────────────────────
makeTileset(`${ROOT}/tilesets/spring.png`,  SEASONS.spring);
makeTileset(`${ROOT}/tilesets/summer.png`,  SEASONS.summer);
makeTileset(`${ROOT}/tilesets/autumn.png`,  SEASONS.autumn);
makeTileset(`${ROOT}/tilesets/winter.png`,  SEASONS.winter);

// ─── Soso portrait ────────────────────────────────────────────────────────────
// The real portrait is cropped from the Dancy Piskel spritesheet.
// Only generate a pixel-art fallback if the real file isn't already present.
if (!existsSync(`${ROOT}/sprites/dancy-portrait.png`)) {
savePNG(`${ROOT}/sprites/dancy-portrait.png`, 32, 32, (ctx) => {
  const SKIN   = '#7a4822';  // dark brown skin
  const SKINHI = '#9a5e30';  // skin highlight
  const HAIR   = '#180e04';  // very dark hair
  const HAIRHI = '#2c1a08';  // hair highlight
  const GLASS  = '#ff6b9d';  // pink glasses
  const WHITE  = '#f4eedc';  // eye whites
  const PUPIL  = '#0a0400';

  // Dark backdrop
  ctx.fillStyle = '#12080400';
  ctx.fillRect(0, 0, 32, 32);

  // Shirt (white, bottom)
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(5, 24, 22, 8);
  ctx.fillRect(7, 22, 18, 4);
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(13, 22, 6, 2);  // collar shadow

  // Neck
  ctx.fillStyle = SKIN;
  ctx.fillRect(13, 19, 6, 5);

  // Head
  ctx.fillStyle = SKIN;
  ctx.fillRect(9, 7, 14, 13);
  ctx.fillRect(10, 6, 12, 1);
  ctx.fillRect(11, 5, 10, 1);
  ctx.fillRect(9, 19, 14, 1);
  // Skin highlight (left cheek)
  ctx.fillStyle = SKINHI;
  ctx.fillRect(10, 9, 3, 4);

  // Ears
  ctx.fillStyle = SKIN;
  ctx.fillRect(8, 12, 2, 4);
  ctx.fillRect(22, 12, 2, 4);

  // Voluminous curly hair (top mass)
  ctx.fillStyle = HAIR;
  ctx.fillRect(7, 2, 18, 7);
  ctx.fillRect(6, 4, 2, 5);
  ctx.fillRect(24, 4, 2, 5);
  // Curl texture — alternating highlight rows on top
  ctx.fillStyle = HAIRHI;
  ctx.fillRect(8, 1, 3, 2);
  ctx.fillRect(13, 0, 4, 2);
  ctx.fillRect(19, 1, 4, 2);
  ctx.fillRect(10, 3, 3, 1);
  ctx.fillRect(16, 3, 3, 1);
  // Side puffs
  ctx.fillStyle = HAIR;
  ctx.fillRect(5, 6, 3, 7);
  ctx.fillRect(24, 6, 3, 7);
  ctx.fillRect(4, 8, 2, 4);
  ctx.fillRect(26, 8, 2, 4);

  // Eyes
  ctx.fillStyle = WHITE;
  ctx.fillRect(11, 12, 3, 2);
  ctx.fillRect(18, 12, 3, 2);
  ctx.fillStyle = PUPIL;
  ctx.fillRect(12, 12, 2, 2);
  ctx.fillRect(19, 12, 2, 2);
  // Eye shine
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(13, 12, 1, 1);
  ctx.fillRect(20, 12, 1, 1);

  // Round pink glasses
  ctx.fillStyle = GLASS;
  // Left lens — round outline
  ctx.fillRect(10, 11, 5, 1); ctx.fillRect(10, 15, 5, 1);
  ctx.fillRect(10, 11, 1, 5); ctx.fillRect(14, 11, 1, 5);
  // Right lens
  ctx.fillRect(17, 11, 5, 1); ctx.fillRect(17, 15, 5, 1);
  ctx.fillRect(17, 11, 1, 5); ctx.fillRect(21, 11, 1, 5);
  // Bridge + temples
  ctx.fillRect(15, 13, 2, 1);
  ctx.fillRect(8, 12, 2, 1);
  ctx.fillRect(22, 12, 2, 1);

  // Nose
  ctx.fillStyle = shade(SKIN, -25);
  ctx.fillRect(15, 16, 2, 1);

  // Smile
  ctx.fillStyle = shade(SKIN, -40);
  ctx.fillRect(12, 18, 8, 1);
  ctx.fillRect(13, 19, 6, 1);
  ctx.fillStyle = '#c07050';
  ctx.fillRect(13, 18, 4, 1);
});
} // end portrait guard

// ─── Player walk spritesheet (keep existing LPC reference) ───────────────────
// Note: danidu-walk.png is already the LPC character-spritesheet.png.
// We do NOT regenerate it here to preserve the real asset.

// ─── Heart spritesheet ────────────────────────────────────────────────────────
savePNG(`${ROOT}/sprites/heart-normal.png`, 64, 32, (ctx) => {
  const colors = ['#ff6b9d', '#ffd700'];
  for (let row = 0; row < 2; row++) {
    for (let frame = 0; frame < 4; frame++) {
      const x = frame * 16, y = row * 16;
      const c = colors[row];
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + 5, y + 5, 3, 0, Math.PI * 2);
      ctx.arc(x + 11, y + 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 6);
      ctx.lineTo(x + 8, y + 14);
      ctx.lineTo(x + 14, y + 6);
      ctx.fill();
      if (frame === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + 6, y + 4, 4, 3);
      }
    }
  }
});

// ─── Grass rustle ─────────────────────────────────────────────────────────────
savePNG(`${ROOT}/sprites/grass-rustle.png`, 80, 16, (ctx) => {
  const greens = ['#3a7d44','#4a9e57','#3a7d44','#5ab868','#3a7d44'];
  for (let i = 0; i < 5; i++) {
    const x = i * 16;
    ctx.fillStyle = greens[i];
    const squash = i === 1 ? 2 : i === 3 ? -2 : 0;
    ctx.fillRect(x + 2, 4 + squash, 12, 12 - squash);
    ctx.fillStyle = '#5ab868';
    ctx.fillRect(x + 4, 2 + squash, 3, 8);
    ctx.fillRect(x + 9, 3 + squash, 3, 7);
  }
});

// ─── Soso giggle ─────────────────────────────────────────────────────────────
savePNG(`${ROOT}/sprites/soso-giggle.png`, 128, 32, (ctx) => {
  for (let i = 0; i < 4; i++) {
    const x = i * 32;
    ctx.fillStyle = '#ff9ef5';
    ctx.fillRect(x + 8, 10, 16, 16);
    ctx.fillStyle = '#ffd4f5';
    ctx.fillRect(x + 9, 3, 14, 12);
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 11, 7, 3, 3);
    ctx.fillRect(x + 18, 7, 3, 3);
    ctx.fillStyle = '#e75480';
    ctx.fillRect(x + 13, 12, 6, 2);
    if (i === 1 || i === 3) {
      ctx.fillStyle = '#ff9ef5aa';
      ctx.fillRect(x + 4, 14, 6, 8);
    }
  }
});

// ─── Snow/shovel ──────────────────────────────────────────────────────────────
savePNG(`${ROOT}/sprites/snow-shovel.png`, 48, 16, (ctx) => {
  for (let i = 0; i < 3; i++) {
    const x = i * 16;
    const alpha = 1 - i * 0.35;
    ctx.fillStyle = `rgba(210,240,255,${alpha})`;
    ctx.fillRect(x, 0, 16, 16);
    if (i < 2) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 2, 2, 12, 8);
    }
  }
});

// ─── Memory fragment ─────────────────────────────────────────────────────────
savePNG(`${ROOT}/sprites/memory-fragment.png`, 32, 16, (ctx) => {
  for (let i = 0; i < 2; i++) {
    const x = i * 16;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 2, 2, 12, 12);
    ctx.fillStyle = '#fff8';
    ctx.fillRect(x + 3, 3, 10, 10);
    ctx.fillStyle = '#33388844';
    ctx.fillRect(x + 4, 4, 8, 8);
    if (i === 1) {
      ctx.fillStyle = '#ffd700aa';
      ctx.fillRect(x, 0, 16, 16);
    }
  }
});

// ─── Powerup icons ────────────────────────────────────────────────────────────
savePNG(`${ROOT}/sprites/powerup-icons.png`, 64, 16, (ctx) => {
  const colors = ['#f9a826','#c678dd','#56b6c2','#ffd700'];
  const labels = ['R','S','M','★'];
  for (let i = 0; i < 4; i++) {
    const x = i * 16;
    ctx.fillStyle = colors[i];
    ctx.fillRect(x + 2, 2, 12, 12);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText(labels[i], x + 4, 12);
  }
});

// ─── UI assets ────────────────────────────────────────────────────────────────
savePNG(`${ROOT}/ui/polaroid-frame.png`, 240, 180, (ctx) => {
  ctx.fillStyle = '#fff8f0';
  ctx.fillRect(0, 0, 240, 180);
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 220, 160);
  ctx.fillStyle = '#c8a970';
  ctx.fillRect(0, 150, 240, 30);
});

savePNG(`${ROOT}/ui/scrapbook-cover.png`, 320, 240, (ctx) => {
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(0, 0, 320, 240);
  ctx.fillStyle = '#a0522d';
  ctx.fillRect(10, 10, 300, 220);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.fillText("Dancy's", 160, 100);
  ctx.fillText('Collection', 160, 125);
  ctx.fillStyle = '#ff6b9d';
  ctx.font = '32px serif';
  ctx.fillText('♥', 160, 170);
});

savePNG(`${ROOT}/ui/scrapbook-page.png`, 288, 216, (ctx) => {
  ctx.fillStyle = '#fdf6e3';
  ctx.fillRect(0, 0, 288, 216);
  ctx.strokeStyle = '#c8a97044';
  ctx.lineWidth = 1;
  for (let y = 20; y < 216; y += 12) {
    ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(280, y); ctx.stroke();
  }
});

savePNG(`${ROOT}/ui/stamp-gold.png`, 48, 48, (ctx) => {
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? 22 : 18;
    const x = 24 + Math.cos(angle) * r;
    const y = 24 + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b8860b';
  ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ MASTER', 24, 22);
  ctx.fillText('CATCHER', 24, 32);
});

// ─── Memory photos ────────────────────────────────────────────────────────────
for (let i = 0; i < 7; i++) {
  const colors = ['#ff9ef5','#ffd700','#7ec8e3','#f9a826','#a8e6cf','#ff6b9d','#c678dd'];
  savePNG(`${ROOT}/photos/memory-${String(i).padStart(2,'0')}.jpg`, 240, 180, (ctx) => {
    ctx.fillStyle = colors[i];
    ctx.fillRect(0, 0, 240, 180);
    ctx.fillStyle = '#ffffff44';
    ctx.font = 'bold 24px serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Memory ${i + 1}`, 120, 90);
    ctx.font = '14px serif';
    ctx.fillText('Add your real photo here!', 120, 115);
  });
}

console.log('\n✅  Assets generated successfully!\n');

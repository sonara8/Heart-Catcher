/**
 * generate-placeholders.mjs
 * Generates minimal placeholder PNG assets so the game runs
 * before real pixel art is created.
 *
 * Run: node scripts/generate-placeholders.mjs
 *
 * Uses only built-in Node.js — no npm packages needed.
 * Generates tiny PNGs using raw binary.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { createCanvas } from 'canvas'; // requires: npm install canvas

// ─── Tiny PNG builder (pure Node, no canvas dependency) ─────────────────────
// We use a simple approach: write a minimal valid PNG header + IDAT
// For simplicity we use node-canvas if available, else skip.

let canvas;
try {
  const mod = await import('canvas');
  canvas = mod.createCanvas;
} catch {
  console.log('💡  Install canvas for placeholder generation: npm install canvas');
  console.log('    Or just drop real assets into assets/ and run npm run dev');
  process.exit(0);
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

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

// ─── Generate assets ─────────────────────────────────────────────────────────

const ROOT = 'assets';
ensureDir(`${ROOT}/sprites`);
ensureDir(`${ROOT}/tilesets`);
ensureDir(`${ROOT}/ui`);
ensureDir(`${ROOT}/audio/sfx`);
ensureDir(`${ROOT}/audio/music`);
ensureDir(`${ROOT}/photos`);

console.log('\nGenerating placeholder assets...\n');

// Player walk spritesheet: 8 dirs × 4 frames = 32 frames, 16×16 each
// Layout: 32 cols × 1 row = 512×16
savePNG(`${ROOT}/sprites/danidu-walk.png`, 512, 16, (ctx) => {
  for (let dir = 0; dir < 8; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const x = (dir * 4 + frame) * 16;
      // Body
      ctx.fillStyle = '#e75480';
      ctx.fillRect(x + 3, 2, 10, 10);
      // Head
      ctx.fillStyle = '#f4b8c8';
      ctx.fillRect(x + 4, 1, 8, 6);
      // Eyes (direction indicator)
      ctx.fillStyle = '#000';
      if (dir < 2 || dir === 7) { // south-ish: eyes at bottom
        ctx.fillRect(x + 5, 5, 2, 1);
        ctx.fillRect(x + 9, 5, 2, 1);
      } else if (dir === 4 || dir === 3 || dir === 5) { // north-ish: eyes at top
        ctx.fillRect(x + 5, 2, 2, 1);
        ctx.fillRect(x + 9, 2, 2, 1);
      } else { // east/west: one eye
        ctx.fillRect(x + (dir === 2 || dir === 1 ? 9 : 5), 3, 2, 2);
      }
      // Legs (animate)
      ctx.fillStyle = '#a52a2a';
      const leg = (frame === 1 || frame === 3) ? 1 : 0;
      ctx.fillRect(x + 4, 12 + leg, 3, 3);
      ctx.fillRect(x + 9, 12 - leg, 3, 3);
    }
  }
});

// Heart spritesheet: 2 rows (normal, golden), 4 frames each, 16×16
savePNG(`${ROOT}/sprites/heart-normal.png`, 64, 32, (ctx) => {
  const colors = ['#ff6b9d', '#ffd700'];
  for (let row = 0; row < 2; row++) {
    for (let frame = 0; frame < 4; frame++) {
      const x = frame * 16, y = row * 16;
      ctx.fillStyle = colors[row];
      // Simple heart shape
      ctx.beginPath();
      ctx.arc(x + 5, y + 5, 3, 0, Math.PI * 2);
      ctx.arc(x + 11, y + 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 6);
      ctx.lineTo(x + 8, y + 14);
      ctx.lineTo(x + 14, y + 6);
      ctx.fill();
      // Scale effect per frame
      if (frame === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + 6, y + 4, 4, 3);
      }
    }
  }
});

// Grass rustle: 5 frames of 16×16
savePNG(`${ROOT}/sprites/grass-rustle.png`, 80, 16, (ctx) => {
  const greens = ['#3a7d44', '#4a9e57', '#3a7d44', '#5ab868', '#3a7d44'];
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

// Soso giggle: 4 frames of 32×32
savePNG(`${ROOT}/sprites/soso-giggle.png`, 128, 32, (ctx) => {
  for (let i = 0; i < 4; i++) {
    const x = i * 32;
    // Body
    ctx.fillStyle = '#ff9ef5';
    ctx.fillRect(x + 8, 10, 16, 16);
    // Head
    ctx.fillStyle = '#ffd4f5';
    ctx.fillRect(x + 9, 3, 14, 12);
    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 11, 7, 3, 3);
    ctx.fillRect(x + 18, 7, 3, 3);
    // Smile
    ctx.fillStyle = '#e75480';
    ctx.fillRect(x + 13, 12, 6, 2);
    // Giggle pose variation
    if (i === 1 || i === 3) {
      ctx.fillStyle = '#ff9ef5aa';
      ctx.fillRect(x + 4, 14, 6, 8);  // left arm raised
    }
  }
});

// Snow/shovel: 3 frames 16×16
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

// Memory fragment icon: 2 frames 16×16
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

// Powerup icons: 4 icons × 16×16
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

// Polaroid frame: 240×180
savePNG(`${ROOT}/ui/polaroid-frame.png`, 240, 180, (ctx) => {
  ctx.fillStyle = '#fff8f0';
  ctx.fillRect(0, 0, 240, 180);
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 220, 160);
  ctx.fillStyle = '#c8a970';
  ctx.fillRect(0, 150, 240, 30);
});

// Scrapbook cover: 320×240
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

// Scrapbook page: 288×216
savePNG(`${ROOT}/ui/scrapbook-page.png`, 288, 216, (ctx) => {
  ctx.fillStyle = '#fdf6e3';
  ctx.fillRect(0, 0, 288, 216);
  ctx.strokeStyle = '#c8a97044';
  ctx.lineWidth = 1;
  for (let y = 20; y < 216; y += 12) {
    ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(280, y); ctx.stroke();
  }
});

// Stamp: 48×48
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

// ─── Pixel-art tile helpers ────────────────────────────────────────────────

/** Parse '#rrggbb' → [r,g,b] */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Lighten/darken a hex colour by [delta] per channel */
function shade(hex, delta) {
  const [r,g,b] = hexToRgb(hex);
  const c = v => Math.max(0, Math.min(255, v + delta)).toString(16).padStart(2,'0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Draw a grass-textured 16×16 tile at canvas position (ox, oy).
 *  Uses deterministic offsets based on tileIndex so each tile looks slightly unique. */
function drawGrassTile(ctx, ox, oy, base, tileIndex) {
  const light = shade(base, 22);
  const dark  = shade(base, -18);
  // Base fill
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, 16, 16);
  // Subtle checkerboard variation (2×2 blocks)
  ctx.fillStyle = shade(base, (tileIndex % 3 === 0) ? 8 : -8);
  for (let y = 0; y < 16; y += 4) {
    for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < 16; x += 4) {
      ctx.fillRect(ox + x, oy + y, 2, 2);
    }
  }
  // Grass blades — 7 blades at fixed x offsets, staggered heights
  const bladeOffsets = [1, 3, 5, 7, 9, 11, 14];
  const bladeHeights = [5, 4, 6, 3, 5, 4, 6];
  for (let b = 0; b < bladeOffsets.length; b++) {
    const bx = ox + bladeOffsets[b] + ((tileIndex * 3 + b) % 2);
    const bh = bladeHeights[(b + tileIndex) % bladeHeights.length];
    const by = oy + 16 - bh - ((tileIndex + b) % 3);
    // Blade body
    ctx.fillStyle = light;
    ctx.fillRect(bx, by, 1, bh);
    // Darker shadow at base
    ctx.fillStyle = dark;
    ctx.fillRect(bx, by + bh - 1, 1, 1);
  }
}

/** Dirt/path tile */
function drawPathTile(ctx, ox, oy, base, tileIndex) {
  const light = shade(base, 18);
  const dark  = shade(base, -20);
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, 16, 16);
  // Pebble-like dots
  const dots = [2,5,8,11,14,3,7,12];
  for (let d = 0; d < dots.length; d++) {
    const dx = ox + dots[d];
    const dy = oy + dots[(d + 3) % dots.length];
    ctx.fillStyle = d % 2 === 0 ? light : dark;
    ctx.fillRect(dx, dy, 2, 1);
  }
}

/** Tall grass tile (interactable) — darker with visible tall blades */
function drawTallGrassTile(ctx, ox, oy, base, tileIndex) {
  const dark   = shade(base, -30);
  const light  = shade(base, 30);
  const mid    = shade(base, 10);
  ctx.fillStyle = dark;
  ctx.fillRect(ox, oy, 16, 16);
  // Dense tall blades
  for (let b = 0; b < 8; b++) {
    const bx = ox + 1 + b * 2;
    const bh = 8 + (b + tileIndex) % 5;
    const by = oy + 16 - bh;
    ctx.fillStyle = b % 2 === 0 ? light : mid;
    ctx.fillRect(bx, by, 1, bh);
    // Tip highlight
    ctx.fillStyle = '#ffffff55';
    ctx.fillRect(bx, by, 1, 1);
  }
}

/** Water tile */
function drawWaterTile(ctx, ox, oy, base, tileIndex) {
  const light = shade(base, 30);
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, 16, 16);
  // Horizontal ripple lines
  for (let y = 3; y < 16; y += 5) {
    const offset = (tileIndex + y) % 4;
    ctx.fillStyle = light;
    ctx.fillRect(ox + offset, oy + y, 8, 1);
    ctx.fillRect(ox + offset + 10, oy + y + 2, 4, 1);
  }
}

/** Tree trunk/obstacle tile */
function drawObstacleTile(ctx, ox, oy, base, tileIndex) {
  const light = shade(base, 25);
  const dark  = shade(base, -35);
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, 16, 16);
  // Bark texture vertical lines
  for (let x = 2; x < 16; x += 4) {
    ctx.fillStyle = (x / 4) % 2 === 0 ? dark : light;
    ctx.fillRect(ox + x, oy, 1, 16);
  }
  // Mossy top
  ctx.fillStyle = shade(base, 40);
  ctx.fillRect(ox, oy, 16, 2);
}

/** Canopy / overhead tile */
function drawCanopyTile(ctx, ox, oy, base, tileIndex) {
  const light = shade(base, 20);
  const dark  = shade(base, -20);
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, 16, 16);
  // Leaf cluster blobs
  const spots = [[2,3],[6,2],[10,4],[3,8],[7,7],[12,6],[5,12],[10,11]];
  for (let s = 0; s < spots.length; s++) {
    const [lx, ly] = spots[(s + tileIndex) % spots.length];
    ctx.fillStyle = s % 2 === 0 ? light : dark;
    ctx.fillRect(ox + lx, oy + ly, 3, 2);
    ctx.fillRect(ox + lx + 1, oy + ly - 1, 1, 1);
  }
}

/** Pokémon-style round tree canopy — one quadrant of a 2×2 circular blob.
 *  Background is transparent so the ground layer shows through the corners. */
function drawPokemonCanopy(ctx, ox, oy, quadrant, leafColor) {
  const light   = shade(leafColor, 38);
  const dark    = shade(leafColor, -22);
  const outline = shade(leafColor, -60);
  // Circle center sits at the *inner* corner so all 4 tiles form one circle
  const cx = (quadrant === 'tl' || quadrant === 'bl') ? ox + 16 : ox;
  const cy = (quadrant === 'tl' || quadrant === 'tr') ? oy + 16 : oy;
  ctx.clearRect(ox, oy, 16, 16);
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy, 16, 16); ctx.clip();
  // Dark outline ring
  ctx.beginPath(); ctx.arc(cx, cy, 15.5, 0, Math.PI * 2);
  ctx.fillStyle = outline; ctx.fill();
  // Shadow ring
  ctx.beginPath(); ctx.arc(cx, cy, 13.8, 0, Math.PI * 2);
  ctx.fillStyle = dark; ctx.fill();
  // Main leaf body
  ctx.beginPath(); ctx.arc(cx, cy, 12.2, 0, Math.PI * 2);
  ctx.fillStyle = leafColor; ctx.fill();
  // Highlight blobs — top-outer area of each quadrant gets more light
  ctx.fillStyle = light;
  const isL = quadrant === 'tl' || quadrant === 'bl';
  const isT = quadrant === 'tl' || quadrant === 'tr';
  const [hx1, hy1] = [isL ? 13 : 3, isT ? 13 : 3];
  const [hx2, hy2] = [isL ? 10 : 6, isT ? 10 : 6];
  ctx.beginPath(); ctx.arc(ox + hx1, oy + hy1, 3,   0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ox + hx2, oy + hy2, 1.8, 0, Math.PI * 2); ctx.fill();
  // Small white shine pixel
  ctx.fillStyle = '#ffffff88';
  ctx.fillRect(ox + (isL ? 14 : 2), oy + (isT ? 14 : 2), 1, 1);
  ctx.restore();
}

/** Pokémon-style tree trunk quadrant tile (grass background + brown trunk column). */
function drawPokemonTrunk(ctx, ox, oy, quadrant, grassColor, trunkColor) {
  const tL = shade(trunkColor, 25);
  const tD = shade(trunkColor, -30);
  drawGrassTile(ctx, ox, oy, grassColor, 0);
  // Trunk column sits at the inner edge (so both halves form one centered trunk)
  const isLeft = quadrant === 'tl' || quadrant === 'bl';
  const tx = isLeft ? 9 : 0;
  const tw = 7;
  ctx.fillStyle = trunkColor; ctx.fillRect(ox + tx,        oy, tw, 16);
  ctx.fillStyle = tL;         ctx.fillRect(ox + tx,        oy, 2,  16);
  ctx.fillStyle = tD;         ctx.fillRect(ox + tx + tw-2, oy, 2,  16);
  // Root spread at base of tree
  if (quadrant === 'bl' || quadrant === 'br') {
    ctx.fillStyle = tD;
    ctx.fillRect(ox + (isLeft ? 7 : 0), oy + 12, tw + 2, 4);
    ctx.fillStyle = trunkColor;
    ctx.fillRect(ox + (isLeft ? 8 : 0), oy + 13, tw,     2);
  }
}

/** Deco tile (flowers, leaves, mushrooms) */
function drawDecoTile(ctx, ox, oy, base, accent, tileIndex) {
  drawGrassTile(ctx, ox, oy, base, tileIndex);
  // Small flower/deco dots
  const positions = [[3,4],[8,3],[12,5],[5,10],[10,9],[7,13]];
  for (let p = 0; p < positions.length; p++) {
    const [dx, dy] = positions[(p + tileIndex) % positions.length];
    ctx.fillStyle = accent;
    ctx.fillRect(ox + dx, oy + dy, 2, 2);
    ctx.fillStyle = '#ffffff88';
    ctx.fillRect(ox + dx, oy + dy, 1, 1);
  }
}

// Tilesets — 160×160 (10×10 tiles, 16×16 each) for each season
function makeTileset(filePath, palette) {
  savePNG(filePath, 160, 160, (ctx) => {
    const [bg, accent, obstacle, deco, tall, path, water, edge] = palette;

    // Draw each tile using the right drawing function
    const tileDrawers = [
      // row 0: grass×3, flower deco×2, path×2, edge grass, obstacle, tall grass
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,shade(bg,-6),i),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,shade(bg,10),i),
      (i,ox,oy) => drawDecoTile(ctx,ox,oy,bg,deco,i),
      (i,ox,oy) => drawDecoTile(ctx,ox,oy,bg,accent,i+3),
      (i,ox,oy) => drawPathTile(ctx,ox,oy,path,i),
      (i,ox,oy) => drawPathTile(ctx,ox,oy,shade(path,-10),i),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,edge,i),
      (i,ox,oy) => drawObstacleTile(ctx,ox,oy,obstacle,i),
      (i,ox,oy) => drawTallGrassTile(ctx,ox,oy,tall,i),
      // row 1: TREE_TL, TREE_TR, water×2, deco×4, grass×2
      (i,ox,oy) => drawPokemonTrunk(ctx,ox,oy,'tl',bg,obstacle),
      (i,ox,oy) => drawPokemonTrunk(ctx,ox,oy,'tr',bg,obstacle),
      (i,ox,oy) => drawWaterTile(ctx,ox,oy,water,i),
      (i,ox,oy) => drawWaterTile(ctx,ox,oy,shade(water,15),i),
      (i,ox,oy) => drawDecoTile(ctx,ox,oy,bg,deco,i+1),
      (i,ox,oy) => drawDecoTile(ctx,ox,oy,bg,deco,i+2),
      (i,ox,oy) => drawDecoTile(ctx,ox,oy,bg,accent,i+4),
      (i,ox,oy) => drawDecoTile(ctx,ox,oy,bg,accent,i+5),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+1),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+2),
      // row 2: TREE_BL, TREE_BR, obstacle, grass×7
      (i,ox,oy) => drawPokemonTrunk(ctx,ox,oy,'bl',bg,obstacle),
      (i,ox,oy) => drawPokemonTrunk(ctx,ox,oy,'br',bg,obstacle),
      (i,ox,oy) => drawObstacleTile(ctx,ox,oy,shade(obstacle,10),i),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+1),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+2),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+3),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+4),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+5),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+6),
      // rows 3–4: canopy tiles (TREE_TOP_TL/TR first, then generic canopy)
      (i,ox,oy) => drawPokemonCanopy(ctx,ox,oy,'tl',accent),
      (i,ox,oy) => drawPokemonCanopy(ctx,ox,oy,'tr',accent),
      (i,ox,oy) => drawCanopyTile(ctx,ox,oy,shade(accent,10),i),
      (i,ox,oy) => drawCanopyTile(ctx,ox,oy,accent,i+1),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+1),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+2),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+3),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+4),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+5),
      (i,ox,oy) => drawPokemonCanopy(ctx,ox,oy,'bl',accent),
      (i,ox,oy) => drawPokemonCanopy(ctx,ox,oy,'br',accent),
      (i,ox,oy) => drawCanopyTile(ctx,ox,oy,accent,i+3),
      (i,ox,oy) => drawCanopyTile(ctx,ox,oy,shade(accent,-8),i),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+1),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+2),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+3),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+4),
      (i,ox,oy) => drawGrassTile(ctx,ox,oy,bg,i+5),
    ];

    for (let i = 0; i < tileDrawers.length; i++) {
      const tx = i % 10, ty = Math.floor(i / 10);
      const ox = tx * 16, oy = ty * 16;
      tileDrawers[i](i, ox, oy);
    }
    // Fill remaining rows 5–9 with grass
    for (let i = tileDrawers.length; i < 100; i++) {
      const tx = i % 10, ty = Math.floor(i / 10);
      drawGrassTile(ctx, tx * 16, ty * 16, bg, i);
    }
  });
}

makeTileset(`${ROOT}/tilesets/spring.png`,
  // bg=bright grass, accent=teal leaf, obstacle=brown trunk, deco=yellow, tall=dark green, path, water, edge
  ['#6ab840','#2d7855','#7a4e28','#f0e060','#2e5e20','#b8a050','#3a5fa0','#90d060']);
makeTileset(`${ROOT}/tilesets/summer.png`,
  ['#50a838','#1e6e48','#6a3e20','#f8e050','#185828','#c89030','#2878cc','#70c050']);
makeTileset(`${ROOT}/tilesets/autumn.png`,
  ['#7a5810','#c09040','#5c4010','#c84020','#503010','#987040','#1e4898','#b86820']);
makeTileset(`${ROOT}/tilesets/winter.png`,
  ['#c0d8f0','#e8f4ff','#708090','#a8c0e0','#90a8c8','#b8d0e8','#507898','#eaf4ff']);

// Memory photos: 7 placeholder polaroids
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

console.log('\n✅  Placeholder assets generated successfully!');
console.log('   Replace them with real pixel art when ready.\n');

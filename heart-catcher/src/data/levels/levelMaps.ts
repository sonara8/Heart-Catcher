/**
 * Procedural map generators — 7 distinct layouts per season.
 *
 * Layout is selected by: ((variant - 1) % 7) + 1
 *   1 = WindingPath    — cobblestone S-path through dense forest (classic)
 *   2 = OpenMeadow     — no path, open grass, corner/cluster trees
 *   3 = Labyrinth      — tree walls with gaps forming corridors, no cobblestone
 *   4 = Crossroads     — cobblestone + shape, dense forest in each quadrant
 *   5 = ScatteredGroves— random tree clusters, wild tall grass, no path
 *   6 = TwinPaths      — two parallel winding paths, trees packed between and outside
 *   7 = ClearingRing   — dense ring of trees around edge, wide open center clearing
 */
import { fill, rect, set, S, SU, A, W } from '../mapHelpers';

const CONIFER = 23;

interface TreeTiles {
  TREE_BL: number;
  TREE_BR: number;
  TREE_TOP_TL: number;
  TREE_TOP_TR: number;
  TREE_TOP_BL: number;
  TREE_TOP_BR: number;
  PATH_H: number;
  TALL_GRASS?: number;
  TALL_SNOW?: number;
}

export interface MapArrays {
  ground: number[];
  decoration: number[];
  obstacles: number[];
  overhead: number[];
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function tall(ts: TreeTiles): number {
  return ts.TALL_GRASS ?? ts.TALL_SNOW ?? 10;
}

function placeTree(
  obstacles: number[], overhead: number[],
  w: number, h: number, tx: number, ty: number, ts: TreeTiles,
): void {
  if (tx < 1 || ty < 1 || tx >= w - 2 || ty >= h - 2) return;
  set(obstacles, w, tx,   ty, ts.TREE_BL);
  set(obstacles, w, tx+1, ty, ts.TREE_BR);
}

function placeConifer(
  obstacles: number[], overhead: number[], ground: number[],
  w: number, h: number, tx: number, ty: number,
): void {
  if (tx < 1 || ty < 1 || tx >= w - 2 || ty >= h - 2) return;
  set(obstacles, w, tx,   ty, CONIFER);
  set(obstacles, w, tx+1, ty, CONIFER);
  void ground; void overhead;
}

function carvePath(
  ground: number[], w: number, h: number, variant: number, pathTile: number,
): number[] {
  const centers: number[] = [];
  for (let row = 1; row < h - 1; row++) {
    const amp = Math.max(2, Math.floor(w * 0.12));
    const cx = Math.round(w / 2 + Math.sin(row / 4.5 + variant * 1.1) * amp);
    const safeX = Math.max(3, Math.min(w - 4, cx));
    centers.push(safeX);
    for (let dx = -1; dx <= 1; dx++) {
      const px = safeX + dx;
      if (px >= 1 && px < w - 1) ground[row * w + px] = pathTile;
    }
  }
  return centers;
}

function plantForest(
  obstacles: number[], overhead: number[], ground: number[],
  w: number, h: number, centers: number[], clearR: number, ts: TreeTiles, variant: number,
): void {
  for (let ty = 1; ty < h - 3; ty += 2) {
    const cx = centers[Math.min(ty, centers.length - 1)] ?? Math.floor(w / 2);
    for (let tx = 1; tx < cx - clearR - 2; tx += 2) {
      if ((tx + ty + variant) % 5 === 0) continue;
      placeTree(obstacles, overhead, w, h, tx, ty, ts);
    }
    for (let tx = cx + clearR + 2; tx < w - 2; tx += 2) {
      if ((tx + ty + variant) % 5 === 0) continue;
      placeTree(obstacles, overhead, w, h, tx, ty, ts);
    }
  }
  for (let ty = 2; ty < h - 3; ty += 3) {
    const cx = centers[Math.min(ty, centers.length - 1)] ?? Math.floor(w / 2);
    if ((ty + variant * 3) % 7 === 0) {
      const cTx = cx - clearR - 3;
      if (cTx >= 1 && cTx < w - 2) placeConifer(obstacles, overhead, ground, w, h, cTx, ty);
    }
  }
}

function placeTallGrassEdges(
  ground: number[], w: number, h: number, centers: number[], tallTile: number,
): void {
  for (let row = 1; row < h - 1; row++) {
    const cx = centers[Math.min(row, centers.length - 1)] ?? Math.floor(w / 2);
    for (const side of [-1, 1]) {
      const base = cx + side * 2;
      for (let d = 0; d < 2; d++) {
        const tx = base + side * d;
        if (tx >= 1 && tx < w - 1) ground[row * w + tx] = tallTile;
      }
    }
  }
}

function scatterBerryBushes(
  ground: number[], w: number, h: number, centers: number[], clearR: number, variant: number,
): void {
  for (let row = 2; row < h - 2; row++) {
    const cx = centers[Math.min(row, centers.length - 1)] ?? Math.floor(w / 2);
    if ((row + variant) % 4 === 0) {
      const bx = cx - clearR - 1;
      if (bx >= 1 && bx < w - 1) ground[row * w + bx] = 4;
    }
    if ((row + variant * 2) % 6 === 0) {
      const bx = cx + clearR + 1;
      if (bx >= 1 && bx < w - 1) ground[row * w + bx] = 4;
    }
  }
}

// ─── Layout 1: Winding Path ──────────────────────────────────────────────────

function layoutWindingPath(
  ground: number[], obstacles: number[], overhead: number[],
  w: number, h: number, variant: number, ts: TreeTiles,
): void {
  const t = tall(ts);
  for (let x = 0; x < w; x += 2) {
    placeTree(obstacles, overhead, w, h, x, 1, ts);
    placeTree(obstacles, overhead, w, h, x, h - 2, ts);
  }
  for (let y = 1; y < h - 1; y += 2) {
    placeTree(obstacles, overhead, w, h, 0, y, ts);
    placeTree(obstacles, overhead, w, h, w - 2, y, ts);
  }
  const centers = carvePath(ground, w, h, variant, ts.PATH_H);
  plantForest(obstacles, overhead, ground, w, h, centers, 4, ts, variant);
  placeTallGrassEdges(ground, w, h, centers, t);
  scatterBerryBushes(ground, w, h, centers, 4, variant);
}

// ─── Layout 2: Open Meadow ───────────────────────────────────────────────────
// No cobblestone. Trees only in corners + 6 small interior clusters.

function layoutOpenMeadow(
  ground: number[], obstacles: number[], overhead: number[],
  w: number, h: number, variant: number, ts: TreeTiles,
): void {
  const t = tall(ts);

  // Corner clusters
  const corners: [number, number][] = [
    [1, 1], [3, 1], [1, 3],
    [w-4, 1], [w-2, 1], [w-4, 3],
    [1, h-3], [3, h-3], [1, h-4],
    [w-4, h-3], [w-2, h-3], [w-4, h-4],
  ];
  for (const [tx, ty] of corners) placeTree(obstacles, overhead, w, h, tx, ty, ts);

  // 6 interior tree clusters
  const seeds: [number, number][] = [
    [Math.floor(w * 0.20), Math.floor(h * 0.22)],
    [Math.floor(w * 0.68), Math.floor(h * 0.18)],
    [Math.floor(w * 0.14), Math.floor(h * 0.62)],
    [Math.floor(w * 0.74), Math.floor(h * 0.67)],
    [Math.floor(w * 0.42), Math.floor(h * 0.38)],
    [Math.floor(w * 0.56), Math.floor(h * 0.72)],
  ];
  for (const [cx, cy] of seeds) {
    placeTree(obstacles, overhead, w, h, cx,   cy,   ts);
    placeTree(obstacles, overhead, w, h, cx+2, cy,   ts);
    placeTree(obstacles, overhead, w, h, cx,   cy+2, ts);
    if ((cx + cy + variant) % 3 === 0)
      placeConifer(obstacles, overhead, ground, w, h, cx+2, cy+2);
  }

  // Scattered tall grass (~1 in 13 open tiles)
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if ((x * 7 + y * 11 + variant * 5) % 13 === 0) ground[y * w + x] = t;
    }
  }
  // Scattered berry bushes
  for (let y = 2; y < h - 2; y += 2) {
    for (let x = 2; x < w - 2; x += 3) {
      if ((x * 3 + y * 5 + variant * 7) % 11 === 0) ground[y * w + x] = 4;
    }
  }
}

// ─── Layout 3: Labyrinth ─────────────────────────────────────────────────────
// Horizontal tree walls with alternating gap positions. No cobblestone.

function layoutLabyrinth(
  ground: number[], obstacles: number[], overhead: number[],
  w: number, h: number, variant: number, ts: TreeTiles,
): void {
  const t = tall(ts);

  // Partial outer side walls (with gaps so player isn't trapped)
  for (let ty = 1; ty < h - 1; ty += 2) {
    if ((ty + variant) % 7 !== 0) placeTree(obstacles, overhead, w, h, 0, ty, ts);
    if ((ty + variant + 2) % 7 !== 0) placeTree(obstacles, overhead, w, h, w - 2, ty, ts);
  }

  // 3 horizontal tree walls — gaps alternate left / right / center
  const wallRows = [Math.floor(h * 0.25), Math.floor(h * 0.5), Math.floor(h * 0.75)];
  const gapXs   = [Math.floor(w * 0.22), Math.floor(w * 0.65), Math.floor(w * 0.40)];
  for (let wi = 0; wi < wallRows.length; wi++) {
    const wy = wallRows[wi];
    const gx = gapXs[wi];
    for (let tx = 1; tx < w - 2; tx += 2) {
      if (Math.abs(tx - gx) > 5) placeTree(obstacles, overhead, w, h, tx, wy, ts);
    }
    // Sparse second gap on opposite side
    const gx2 = wi % 2 === 0 ? Math.floor(w * 0.78) : Math.floor(w * 0.12);
    for (let tx = Math.max(1, gx2 - 2); tx < Math.min(w-2, gx2 + 4); tx += 2) {
      set(obstacles, w, tx, wy, 0); // clear this gap
    }
  }

  // Tall grass and berry bushes inside corridors
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (obstacles[y * w + x]) continue;
      if ((x * 5 + y * 7 + variant * 3) % 17 === 0) ground[y * w + x] = t;
      if ((x * 7 + y * 11 + variant * 9) % 23 === 0) ground[y * w + x] = 4;
    }
  }
}

// ─── Layout 4: Crossroads ────────────────────────────────────────────────────
// Cobblestone + shape (horizontal + vertical paths). Dense forest in quadrants.

function layoutCrossroads(
  ground: number[], obstacles: number[], overhead: number[],
  w: number, h: number, variant: number, ts: TreeTiles,
): void {
  const t = tall(ts);
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  // Horizontal path (3-tile-wide)
  for (let x = 1; x < w - 1; x++) {
    for (let dy = -1; dy <= 1; dy++) {
      const y = cy + dy;
      if (y >= 1 && y < h - 1) ground[y * w + x] = ts.PATH_H;
    }
  }
  // Vertical path (3-tile-wide)
  for (let y = 1; y < h - 1; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      if (x >= 1 && x < w - 1) ground[y * w + x] = ts.PATH_H;
    }
  }

  // Dense trees in all 4 quadrants (clearing around paths)
  for (let ty = 2; ty < h - 2; ty += 2) {
    for (let tx = 2; tx < w - 2; tx += 2) {
      if (Math.abs(ty - cy) <= 3 || Math.abs(tx - cx) <= 3) continue;
      if ((tx + ty + variant) % 5 !== 0)
        placeTree(obstacles, overhead, w, h, tx, ty, ts);
    }
  }

  // Tall grass along path edges
  for (let x = 1; x < w - 1; x++) {
    const above = cy - 2, below = cy + 2;
    if (above >= 1 && ground[above * w + x] !== ts.PATH_H) ground[above * w + x] = t;
    if (below < h - 1 && ground[below * w + x] !== ts.PATH_H) ground[below * w + x] = t;
  }
  for (let y = 1; y < h - 1; y++) {
    const left = cx - 2, right = cx + 2;
    if (left >= 1 && ground[y * w + left] !== ts.PATH_H) ground[y * w + left] = t;
    if (right < w - 1 && ground[y * w + right] !== ts.PATH_H) ground[y * w + right] = t;
  }

  // Berry bushes at the 4 diagonal corners of the intersection
  for (const [bx, by] of [[cx-5, cy-5],[cx+5, cy-5],[cx-5, cy+5],[cx+5, cy+5]] as [number,number][]) {
    if (bx >= 1 && bx < w-1 && by >= 1 && by < h-1 && !obstacles[by*w+bx])
      ground[by * w + bx] = 4;
  }
}

// ─── Layout 5: Scattered Groves ──────────────────────────────────────────────
// Random tree groves spread across the open map. Dense wild tall grass. No path.

function layoutScatteredGroves(
  ground: number[], obstacles: number[], overhead: number[],
  w: number, h: number, variant: number, ts: TreeTiles,
): void {
  const t = tall(ts);
  const groveCount = Math.min(9, Math.max(5, Math.floor((w * h) / 40)));

  for (let i = 0; i < groveCount; i++) {
    const gx = 3 + ((i * 41 + variant * 17) % (w - 10));
    const gy = 3 + ((i * 37 + variant * 13) % (h - 10));
    placeTree(obstacles, overhead, w, h, gx,   gy,   ts);
    placeTree(obstacles, overhead, w, h, gx+2, gy,   ts);
    placeTree(obstacles, overhead, w, h, gx,   gy+2, ts);
    placeTree(obstacles, overhead, w, h, gx+2, gy+2, ts);
    if ((i + variant) % 2 === 0)
      placeTree(obstacles, overhead, w, h, gx+4, gy+1, ts);
    if ((i + variant) % 3 === 0)
      placeConifer(obstacles, overhead, ground, w, h, gx+1, gy-2);
  }

  // Dense wild tall grass (every 7th open tile)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (obstacles[y * w + x]) continue;
      if ((x * 7 + y * 11 + variant * 5) % 7 === 0) ground[y * w + x] = t;
    }
  }
  // Berry bushes scattered across open area
  for (let y = 2; y < h - 2; y += 2) {
    for (let x = 2; x < w - 2; x += 2) {
      if (obstacles[y * w + x]) continue;
      if ((x * 5 + y * 9 + variant * 3) % 13 === 0) ground[y * w + x] = 4;
    }
  }
}

// ─── Layout 6: Twin Paths ────────────────────────────────────────────────────
// Two parallel winding cobblestone paths (left-third and right-third), trees
// packed between them and at outer edges. Creates a three-lane feel.

function layoutTwinPaths(
  ground: number[], obstacles: number[], overhead: number[],
  w: number, h: number, variant: number, ts: TreeTiles,
): void {
  const t = tall(ts);
  const amp = Math.max(1, Math.floor(w * 0.07));

  // Carve two paths: left at ~w/3, right at ~2w/3
  const leftCenters: number[] = [];
  const rightCenters: number[] = [];
  for (let row = 1; row < h - 1; row++) {
    const lx = Math.round(w / 3 + Math.sin(row / 4.0 + variant * 0.9) * amp);
    const rx = Math.round((2 * w) / 3 + Math.sin(row / 3.5 + variant * 1.3 + 1.5) * amp);
    const sl = Math.max(2, Math.min(w / 3 - 1, lx));
    const sr = Math.max(w / 3 + 2, Math.min(w - 3, rx));
    leftCenters.push(sl);
    rightCenters.push(sr);
    for (let dx = -1; dx <= 1; dx++) {
      if (sl + dx >= 1 && sl + dx < w - 1) ground[row * w + (sl + dx)] = ts.PATH_H;
      if (sr + dx >= 1 && sr + dx < w - 1) ground[row * w + (sr + dx)] = ts.PATH_H;
    }
  }

  // Trees in center strip (between the two paths)
  for (let ty = 1; ty < h - 3; ty += 2) {
    const lc = leftCenters[ty] ?? Math.floor(w / 3);
    const rc = rightCenters[ty] ?? Math.floor(2 * w / 3);
    for (let tx = lc + 3; tx < rc - 3; tx += 2) {
      if ((tx + ty + variant) % 4 !== 0)
        placeTree(obstacles, overhead, w, h, tx, ty, ts);
    }
    // Trees on outer edges
    for (let tx = 1; tx < lc - 3; tx += 2) {
      if ((tx + ty + variant) % 3 !== 0)
        placeTree(obstacles, overhead, w, h, tx, ty, ts);
    }
    for (let tx = rc + 3; tx < w - 2; tx += 2) {
      if ((tx + ty + variant) % 3 !== 0)
        placeTree(obstacles, overhead, w, h, tx, ty, ts);
    }
  }

  // Tall grass along both path edges
  for (let row = 1; row < h - 1; row++) {
    const lc = leftCenters[row] ?? Math.floor(w / 3);
    const rc = rightCenters[row] ?? Math.floor(2 * w / 3);
    for (const edge of [lc - 2, lc + 2, rc - 2, rc + 2]) {
      if (edge >= 1 && edge < w - 1 && !ground[row * w + edge]) ground[row * w + edge] = t;
    }
  }

  // Berry bushes at path entry/exit regions
  for (let row = 2; row < h - 2; row += 3) {
    const lc = leftCenters[row] ?? Math.floor(w / 3);
    if ((row + variant) % 5 === 0 && ground[row * w + lc] !== ts.PATH_H)
      ground[row * w + lc] = 4;
  }
}

// ─── Layout 7: Clearing Ring ──────────────────────────────────────────────────
// Dense ring of trees forming outer walls, wide open center clearing.
// Scattered berry bushes and tall grass in the open interior.

function layoutClearingRing(
  ground: number[], obstacles: number[], overhead: number[],
  w: number, h: number, variant: number, ts: TreeTiles,
): void {
  const t = tall(ts);
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const innerR = Math.min(cx, cy) - 4;  // clearing radius

  // Dense outer ring: place trees if outside the inner clearing radius
  for (let ty = 1; ty < h - 3; ty += 2) {
    for (let tx = 1; tx < w - 2; tx += 2) {
      const dx = tx - cx, dy = ty - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > innerR) {
        if ((tx + ty + variant) % 4 !== 0)   // slight gaps so it's not impenetrable
          placeTree(obstacles, overhead, w, h, tx, ty, ts);
      }
    }
  }

  // Open center: scattered tall grass (~1 in 9 tiles)
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (obstacles[y * w + x]) continue;
      const ddx = x - cx, ddy = y - cy;
      if (Math.sqrt(ddx * ddx + ddy * ddy) > innerR) continue;  // only inside ring
      if ((x * 5 + y * 7 + variant * 3) % 9 === 0) ground[y * w + x] = t;
    }
  }

  // Berry bushes in a loose inner circle ring
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (obstacles[y * w + x]) continue;
      const ddx = x - cx, ddy = y - cy;
      const d = Math.sqrt(ddx * ddx + ddy * ddy);
      if (d < innerR - 1 && d > innerR - 3) {  // ring of bushes just inside tree ring
        if ((x * 3 + y * 5 + variant * 7) % 5 === 0) ground[y * w + x] = 4;
      }
    }
  }

  // A few feature trees in center area for visual interest
  const featureTrees: [number, number][] = [
    [cx - 3, cy - 2], [cx + 2, cy - 3],
    [cx - 2, cy + 3], [cx + 3, cy + 2],
  ];
  for (const [tx, ty] of featureTrees) {
    if ((tx + ty + variant) % 3 !== 0)
      placeTree(obstacles, overhead, w, h, tx, ty, ts);
  }
}

// ─── Layout dispatcher ───────────────────────────────────────────────────────

function buildMap(
  w: number, h: number, variant: number, ts: TreeTiles, base: number,
): MapArrays {
  const ground     = fill(w, h, base);
  const decoration = fill(w, h, 0);
  const obstacles  = fill(w, h, 0);
  const overhead   = fill(w, h, 0);

  const layout = ((variant - 1) % 7) + 1;
  switch (layout) {
    case 1: layoutWindingPath(ground, obstacles, overhead, w, h, variant, ts); break;
    case 2: layoutOpenMeadow(ground, obstacles, overhead, w, h, variant, ts); break;
    case 3: layoutLabyrinth(ground, obstacles, overhead, w, h, variant, ts); break;
    case 4: layoutCrossroads(ground, obstacles, overhead, w, h, variant, ts); break;
    case 5: layoutScatteredGroves(ground, obstacles, overhead, w, h, variant, ts); break;
    case 6: layoutTwinPaths(ground, obstacles, overhead, w, h, variant, ts); break;
    default: layoutClearingRing(ground, obstacles, overhead, w, h, variant, ts); break;
  }

  void decoration;
  return { ground, decoration, obstacles, overhead };
}

// ─── Public season functions ──────────────────────────────────────────────────

export function makeSpringMap(w: number, h: number, variant: number): MapArrays {
  return buildMap(w, h, variant, S, S.GRASS);
}

export function makeSummerMap(w: number, h: number, variant: number): MapArrays {
  return buildMap(w, h, variant, SU, SU.GRASS);
}

export function makeAutumnMap(w: number, h: number, variant: number): MapArrays {
  return buildMap(w, h, variant, A, A.GRASS);
}

export function makeWinterMap(w: number, h: number, variant: number): MapArrays {
  return buildMap(w, h, variant, W, W.SNOW);
}

// ─── FINALE map (Birthday Grove) ─────────────────────────────────────────────
// Dense magical grove — celebratory layout with cross path, flower borders,
// many trees in a grid pattern, and mushroom/fern decorations.

export function makeFinaleMap(w: number, h: number): MapArrays {
  const ground     = fill(w, h, S.GRASS);
  const decoration = fill(w, h, 0);
  const obstacles  = fill(w, h, 0);
  const overhead   = fill(w, h, 0);

  const cx = Math.floor(w / 2);  // 17
  const cy = Math.floor(h / 2);  // 12

  // ── Border tree ring ──
  for (let x = 0; x < w; x += 2) {
    placeTree(obstacles, overhead, w, h, x, 1,     S);
    placeTree(obstacles, overhead, w, h, x, h - 2, S);
  }
  for (let y = 1; y < h - 1; y += 2) {
    placeTree(obstacles, overhead, w, h, 0,     y, S);
    placeTree(obstacles, overhead, w, h, w - 2, y, S);
  }

  // ── Cross-shaped cobblestone path ──
  // Horizontal arm (3 wide)
  for (let x = 2; x < w - 2; x++) {
    set(ground, w, x, cy - 1, S.PATH_H);
    set(ground, w, x, cy,     S.PATH_H);
    set(ground, w, x, cy + 1, S.PATH_H);
  }
  // Vertical arm (3 wide)
  for (let y = 2; y < h - 2; y++) {
    set(ground, w, cx - 1, y, S.PATH_H);
    set(ground, w, cx,     y, S.PATH_H);
    set(ground, w, cx + 1, y, S.PATH_H);
  }

  // ── Flowers: yellow border ring, pink along path edges ──
  rect(decoration, w, 2, 2, w - 4, h - 4, S.FLOWER_Y);
  for (let x = 2; x < w - 2; x++) {
    set(decoration, w, x, cy - 2, S.FLOWER_P);
    set(decoration, w, x, cy + 2, S.FLOWER_P);
  }
  for (let y = 2; y < h - 2; y++) {
    set(decoration, w, cx - 2, y, S.FLOWER_P);
    set(decoration, w, cx + 2, y, S.FLOWER_P);
  }

  // ── Interior grove trees ──
  // Columns safe for trees (avoid path cols 16-18 and heart cols 4-6,9-11,14-16,19-21,24-26,29-31):
  // Using cols 2, 7, 12, 22, 27, 32 at rows 3, 7, 17, 22 (avoid path row 11-13, heart rows 5,10,15,20)
  const interiorTreeCols = [2, 7, 12, 22, 27, 32];
  const interiorTreeRows = [3, 7, 17, 22];
  for (const ty of interiorTreeRows) {
    for (const tx of interiorTreeCols) {
      placeTree(obstacles, overhead, w, h, tx, ty, S);
    }
  }

  // ── Mushroom clusters (tile 4 = bush in ground layer → renders as mushroom sprite) ──
  // Placed in open clearings between trees, safe from heart positions
  const mushroomPos: [number, number][] = [
    // Left clearing band (between left border and first column)
    [4, 4], [4, 10], [4, 15], [4, 20],
    // Right clearing band
    [31, 4], [31, 10], [31, 15], [31, 20],
    // Top clearing (between border and first tree row)
    [9, 4], [16, 4], [21, 4], [26, 4],
    // Bottom clearing
    [9, 22], [16, 22], [21, 22], [26, 22],
    // Mid-quadrant mushroom clusters
    [9, 9],  [21, 9],
    [9, 16], [21, 16],
    [31, 9], [31, 16],
  ];
  for (const [mx, my] of mushroomPos) {
    if (mx >= 1 && mx < w - 1 && my >= 1 && my < h - 1
        && !obstacles[my * w + mx]
        && ground[my * w + mx] !== S.PATH_H) {
      set(ground, w, mx, my, 4);
    }
  }

  // ── Fern/tall-grass borders flanking the path arms ──
  for (let x = 2; x < w - 2; x++) {
    const above = cy - 3;
    const below = cy + 3;
    if (above >= 1 && !obstacles[above * w + x] && ground[above * w + x] !== S.PATH_H)
      set(ground, w, x, above, S.TALL_GRASS ?? 10);
    if (below < h - 1 && !obstacles[below * w + x] && ground[below * w + x] !== S.PATH_H)
      set(ground, w, x, below, S.TALL_GRASS ?? 10);
  }

  return { ground, decoration, obstacles, overhead };
}

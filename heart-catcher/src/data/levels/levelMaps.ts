/**
 * Procedural map generators for each season template.
 * Each generator returns { ground, decoration, obstacles, overhead } flat arrays.
 * Maps are hand-designed via fill/rect/set helpers — no external tool needed.
 */
import { fill, rect, set, border, S, SU, A, W } from '../mapHelpers';

export interface MapArrays {
  ground: number[];
  decoration: number[];
  obstacles: number[];
  overhead: number[];
}

// ─── SPRING maps ────────────────────────────────────────────────────────────

export function makeSpringMap(w: number, h: number, variant: number): MapArrays {
  const ground = fill(w, h, S.GRASS);
  const decoration = fill(w, h, 0);
  const obstacles = fill(w, h, 0);
  const overhead = fill(w, h, 0);

  // Border trees
  border(obstacles, w, h, S.TREE_BL);
  border(overhead, w, h, S.TREE_TOP_TL);

  // Flower patches (vary by variant)
  if (variant >= 1) {
    rect(decoration, w, 3, 3, 4, 3, S.FLOWER_Y);
    rect(decoration, w, 14, 8, 3, 2, S.FLOWER_P);
  }
  if (variant >= 2) {
    rect(decoration, w, 8, 2, 2, 2, S.FLOWER_P);
    rect(decoration, w, 16, 10, 3, 2, S.FLOWER_Y);
  }
  if (variant >= 3) {
    rect(decoration, w, 5, 10, 2, 2, S.FLOWER_Y);
    rect(decoration, w, 12, 5, 2, 2, S.FLOWER_P);
  }

  // Tall grass patches (interactable)
  if (variant === 1) {
    rect(ground, w, 5, 5, 3, 3, S.TALL_GRASS);
    rect(ground, w, 12, 3, 4, 2, S.TALL_GRASS);
    rect(ground, w, 8, 9, 3, 3, S.TALL_GRASS);
    rect(ground, w, 15, 8, 3, 2, S.TALL_GRASS);
  } else if (variant === 2) {
    rect(ground, w, 3, 4, 4, 2, S.TALL_GRASS);
    rect(ground, w, 10, 6, 3, 3, S.TALL_GRASS);
    rect(ground, w, 16, 4, 3, 3, S.TALL_GRASS);
    rect(ground, w, 6, 10, 4, 2, S.TALL_GRASS);
  } else {
    rect(ground, w, 4, 3, 3, 2, S.TALL_GRASS);
    rect(ground, w, 9, 5, 4, 3, S.TALL_GRASS);
    rect(ground, w, 15, 7, 3, 2, S.TALL_GRASS);
    rect(ground, w, 7, 10, 2, 3, S.TALL_GRASS);
    rect(ground, w, 14, 11, 4, 2, S.TALL_GRASS);
  }

  // Interior trees (for depth)
  if (variant >= 2) {
    // Tree cluster top-right
    set(obstacles, w, w - 4, 2, S.TREE_BL);
    set(obstacles, w, w - 3, 2, S.TREE_BR);
    set(overhead, w, w - 4, 1, S.TREE_TOP_TL);
    set(overhead, w, w - 3, 1, S.TREE_TOP_TR);
    set(overhead, w, w - 4, 2, S.TREE_TOP_BL);
    set(overhead, w, w - 3, 2, S.TREE_TOP_BR);
  }
  if (variant >= 3) {
    // Tree cluster mid-left
    set(obstacles, w, 3, 7, S.TREE_BL);
    set(obstacles, w, 4, 7, S.TREE_BR);
    set(overhead, w, 3, 6, S.TREE_TOP_TL);
    set(overhead, w, 4, 6, S.TREE_TOP_TR);
    set(overhead, w, 3, 7, S.TREE_TOP_BL);
    set(overhead, w, 4, 7, S.TREE_TOP_BR);
  }

  // Path through middle
  if (variant === 2) {
    for (let x = 1; x < w - 1; x++) set(ground, w, x, Math.floor(h / 2), S.PATH_H);
  }

  return { ground, decoration, obstacles, overhead };
}

// ─── SUMMER maps ────────────────────────────────────────────────────────────

export function makeSummerMap(w: number, h: number, variant: number): MapArrays {
  const ground = fill(w, h, SU.GRASS);
  const decoration = fill(w, h, 0);
  const obstacles = fill(w, h, 0);
  const overhead = fill(w, h, 0);

  border(obstacles, w, h, SU.TREE_BL);
  border(overhead, w, h, SU.TREE_TOP_TL);

  // More dense, lush feel
  if (variant >= 1) {
    rect(decoration, w, 3, 2, 5, 3, SU.FLOWER_Y);
    rect(decoration, w, 15, 9, 4, 3, SU.FLOWER_P);
  }
  if (variant >= 2) {
    rect(decoration, w, 10, 3, 3, 2, SU.FLOWER_P);
    rect(decoration, w, 5, 12, 4, 2, SU.FLOWER_Y);
  }

  // Lots of tall grass — hearts that move need to hide somewhere!
  const patches = variant === 1
    ? [[4,4,5,4],[12,3,5,3],[7,8,4,4],[16,6,4,3]]
    : variant === 2
    ? [[3,3,4,3],[9,5,5,4],[17,4,4,4],[5,10,5,3],[14,10,5,3]]
    : [[3,4,4,3],[8,3,5,4],[16,5,5,4],[5,9,4,4],[13,9,6,4],[7,13,4,2]];

  for (const [gx,gy,gw,gh] of patches) {
    rect(ground, w, gx, gy, gw, gh, SU.TALL_GRASS);
  }

  // Water feature
  if (variant >= 2) {
    rect(obstacles, w, Math.floor(w/2)-1, 2, 3, 2, SU.WATER);
  }

  return { ground, decoration, obstacles, overhead };
}

// ─── AUTUMN maps ────────────────────────────────────────────────────────────

export function makeAutumnMap(w: number, h: number, variant: number): MapArrays {
  const ground = fill(w, h, A.GRASS);
  const decoration = fill(w, h, 0);
  const obstacles = fill(w, h, 0);
  const overhead = fill(w, h, 0);

  border(obstacles, w, h, A.TREE_BL);
  border(overhead, w, h, A.TREE_TOP_TL);

  // Leaf piles as decoration
  if (variant >= 1) {
    rect(decoration, w, 4, 4, 5, 3, A.LEAF_PILE);
    rect(decoration, w, 16, 8, 4, 3, A.LEAF_PILE);
  }
  if (variant >= 2) {
    rect(decoration, w, 10, 6, 4, 3, A.MUSHROOM);
    rect(decoration, w, 3, 12, 5, 2, A.LEAF_PILE);
  }

  // Logs (solid)
  if (variant >= 2) {
    rect(obstacles, w, 7, 6, 2, 1, A.LOG);
    rect(obstacles, w, 18, 5, 2, 1, A.LOG);
  }
  if (variant >= 3) {
    rect(obstacles, w, 5, 10, 2, 1, A.LOG);
    rect(obstacles, w, 14, 12, 2, 1, A.LOG);
  }

  // Tall grass — denser in autumn
  const patches = variant === 1
    ? [[4,3,5,4],[13,4,5,4],[6,9,4,4],[17,10,4,3]]
    : variant === 2
    ? [[3,3,5,4],[10,4,6,4],[18,3,5,4],[5,10,5,4],[15,10,5,4]]
    : [[3,3,5,5],[10,3,6,5],[19,3,5,4],[4,10,5,5],[13,10,6,5],[8,16,5,3]];

  for (const [gx,gy,gw,gh] of patches) {
    rect(ground, w, gx, gy, gw, gh, A.TALL_GRASS);
  }

  // Interior trees
  for (let i = 0; i < variant + 1; i++) {
    const tx = 5 + i * 7;
    const ty = 6 + (i % 2) * 4;
    set(obstacles, w, tx, ty, A.TREE_BL);
    set(obstacles, w, tx+1, ty, A.TREE_BR);
    set(overhead, w, tx, ty-1, A.TREE_TOP_TL);
    set(overhead, w, tx+1, ty-1, A.TREE_TOP_TR);
    set(overhead, w, tx, ty, A.TREE_TOP_BL);
    set(overhead, w, tx+1, ty, A.TREE_TOP_BR);
  }

  return { ground, decoration, obstacles, overhead };
}

// ─── WINTER maps ────────────────────────────────────────────────────────────

export function makeWinterMap(w: number, h: number, variant: number): MapArrays {
  const ground = fill(w, h, W.SNOW);
  const decoration = fill(w, h, 0);
  const obstacles = fill(w, h, 0);
  const overhead = fill(w, h, 0);

  border(obstacles, w, h, W.TREE_BL);
  border(overhead, w, h, W.TREE_TOP_TL);

  // Snow variation tiles
  if (variant >= 1) {
    rect(ground, w, 5, 5, 4, 3, W.SNOW2);
    rect(ground, w, 15, 8, 5, 3, W.SNOW3);
  }
  if (variant >= 2) {
    rect(ground, w, 3, 12, 5, 3, W.SNOW2);
    rect(ground, w, 20, 5, 4, 4, W.SNOW3);
  }

  // Icicle decorations
  if (variant >= 2) {
    rect(decoration, w, 8, 3, 3, 1, W.ICICLE);
    rect(decoration, w, 18, 10, 3, 1, W.ICICLE);
  }

  // Ice patches (solid in winter)
  if (variant >= 2) {
    rect(obstacles, w, 10, 7, 3, 2, W.ICE);
  }
  if (variant >= 3) {
    rect(obstacles, w, 5, 15, 3, 2, W.ICE);
    rect(obstacles, w, 22, 8, 3, 2, W.ICE);
  }

  // Tall snow patches
  const patches = variant === 1
    ? [[4,4,5,4],[14,5,5,4],[7,10,4,4],[18,11,4,3]]
    : variant === 2
    ? [[3,3,5,4],[12,4,6,4],[20,4,5,4],[5,12,5,4],[17,12,5,4]]
    : [[3,3,5,5],[11,3,6,5],[21,3,5,4],[4,12,5,5],[15,12,6,5],[9,18,5,3]];

  for (const [gx,gy,gw,gh] of patches) {
    rect(ground, w, gx, gy, gw, gh, W.TALL_SNOW);
  }

  // Bare trees
  for (let i = 0; i < variant + 2; i++) {
    const tx = 4 + i * 6;
    const ty = 5 + (i % 2) * 5;
    if (tx >= w - 3) continue;
    set(obstacles, w, tx, ty, W.TREE_BL);
    set(obstacles, w, tx+1, ty, W.TREE_BR);
    set(overhead, w, tx, ty-1, W.TREE_TOP_TL);
    set(overhead, w, tx+1, ty-1, W.TREE_TOP_TR);
    set(overhead, w, tx, ty, W.TREE_TOP_BL);
    set(overhead, w, tx+1, ty, W.TREE_TOP_BR);
  }

  return { ground, decoration, obstacles, overhead };
}

// ─── FINALE map (Birthday Grove) ────────────────────────────────────────────

export function makeFinaleMap(w: number, h: number): MapArrays {
  const ground = fill(w, h, S.GRASS);
  const decoration = fill(w, h, 0);
  const obstacles = fill(w, h, 0);
  const overhead = fill(w, h, 0);

  border(obstacles, w, h, S.TREE_BL);
  border(overhead, w, h, S.TREE_TOP_TL);

  // Flower carpet everywhere
  rect(decoration, w, 2, 2, w-4, h-4, S.FLOWER_Y);

  // Pink flower path to center
  const cx = Math.floor(w/2), cy = Math.floor(h/2);
  for (let x = 2; x < w-2; x++) set(decoration, w, x, cy, S.FLOWER_P);
  for (let y = 2; y < h-2; y++) set(decoration, w, cx, y, S.FLOWER_P);

  // Celebratory trees forming a circle
  const treePositions = [
    [cx-4, cy-4], [cx, cy-4], [cx+4, cy-4],
    [cx-4, cy+4], [cx, cy+4], [cx+4, cy+4],
    [cx-6, cy], [cx+6, cy],
  ];
  for (const [tx, ty] of treePositions) {
    if (tx < 1 || ty < 1 || tx >= w-2 || ty >= h-2) continue;
    set(obstacles, w, tx, ty, S.TREE_BL);
    set(obstacles, w, tx+1, ty, S.TREE_BR);
    set(overhead, w, tx, ty-1, S.TREE_TOP_TL);
    set(overhead, w, tx+1, ty-1, S.TREE_TOP_TR);
    set(overhead, w, tx, ty, S.TREE_TOP_BL);
    set(overhead, w, tx+1, ty, S.TREE_TOP_BR);
  }

  // Path tiles
  for (let x = 2; x < w-2; x++) {
    set(ground, w, x, cy-1, S.PATH_H);
    set(ground, w, x, cy+1, S.PATH_H);
  }

  return { ground, decoration, obstacles, overhead };
}

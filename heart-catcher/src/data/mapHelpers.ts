/**
 * Map helpers — utilities for defining tile maps as TypeScript arrays.
 *
 * Tile index conventions (1-based, 0 = empty):
 *   SPRING tileset row 0: grass variants, flowers, path
 *   SUMMER tileset row 0: lush grass, sunflowers, water edge
 *   AUTUMN tileset row 0: russet grass, fallen leaves, logs
 *   WINTER tileset row 0: snow tiles, ice, bare trees
 *
 * Special values:
 *   0  = empty (transparent)
 *   For obstacles layer: any non-zero = solid collision
 */

/** Create a flat tile array filled with a single value */
export function fill(w: number, h: number, tile: number): number[] {
  return Array(w * h).fill(tile);
}

/** Set a rectangular region in a flat array */
export function rect(
  arr: number[],
  width: number,
  x: number, y: number,
  rw: number, rh: number,
  tile: number,
): void {
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const idx = (y + dy) * width + (x + dx);
      if (idx >= 0 && idx < arr.length) arr[idx] = tile;
    }
  }
}

/** Set a single tile */
export function set(arr: number[], width: number, x: number, y: number, tile: number): void {
  const idx = y * width + x;
  if (idx >= 0 && idx < arr.length) arr[idx] = tile;
}

/** Create a border wall around the map */
export function border(arr: number[], w: number, h: number, tile: number): void {
  for (let x = 0; x < w; x++) {
    set(arr, w, x, 0, tile);
    set(arr, w, x, h - 1, tile);
  }
  for (let y = 0; y < h; y++) {
    set(arr, w, 0, y, tile);
    set(arr, w, w - 1, y, tile);
  }
}

// ─── Tile ID constants ────────────────────────────────────────────────────────
// These correspond to 1-based positions in each tileset (left-to-right, top-to-bottom)
// Tileset is 10 columns wide

// SPRING tileset
export const S = {
  GRASS: 1,        // plain grass
  GRASS2: 2,       // slightly different grass
  GRASS3: 3,       // grass with tiny flowers
  FLOWER_Y: 4,     // yellow flower patch
  FLOWER_P: 5,     // pink flower patch
  PATH_H: 6,       // horizontal dirt path
  PATH_V: 7,       // vertical dirt path
  TREE_TL: 11,     // tree top-left
  TREE_TR: 12,     // tree top-right
  TREE_BL: 21,     // tree bottom-left (solid)
  TREE_BR: 22,     // tree bottom-right (solid)
  TREE_TOP_TL: 31, // overhead canopy TL
  TREE_TOP_TR: 32,
  TREE_TOP_BL: 41,
  TREE_TOP_BR: 42,
  FENCE_H: 8,      // horizontal fence
  FENCE_V: 9,      // vertical fence
  TALL_GRASS: 10,  // interactable tall grass
  WATER: 13,       // water (solid)
  STONE: 14,       // stone (solid)
};

// SUMMER tileset (offset by 0, same positions different art)
export const SU = {
  GRASS: 1, GRASS2: 2, GRASS3: 3,
  FLOWER_Y: 4, FLOWER_P: 5,
  PATH_H: 6, PATH_V: 7,
  TREE_TL: 11, TREE_TR: 12,
  TREE_BL: 21, TREE_BR: 22,
  TREE_TOP_TL: 31, TREE_TOP_TR: 32,
  TREE_TOP_BL: 41, TREE_TOP_BR: 42,
  TALL_GRASS: 10, WATER: 13,
};

// AUTUMN tileset
export const A = {
  GRASS: 1, GRASS2: 2, GRASS3: 3,
  LEAF_PILE: 4, MUSHROOM: 5,
  PATH_H: 6, PATH_V: 7,
  TREE_TL: 11, TREE_TR: 12,
  TREE_BL: 21, TREE_BR: 22,
  TREE_TOP_TL: 31, TREE_TOP_TR: 32,
  TREE_TOP_BL: 41, TREE_TOP_BR: 42,
  TALL_GRASS: 10, LOG: 8, BERRY: 9,
};

// WINTER tileset
export const W = {
  SNOW: 1, SNOW2: 2, SNOW3: 3,
  ICE: 4, SNOWDRIFT: 5,
  PATH_H: 6, PATH_V: 7,
  TREE_TL: 11, TREE_TR: 12,
  TREE_BL: 21, TREE_BR: 22,
  TREE_TOP_TL: 31, TREE_TOP_TR: 32,
  TREE_TOP_BL: 41, TREE_TOP_BR: 42,
  TALL_SNOW: 10, ICICLE: 8,
};

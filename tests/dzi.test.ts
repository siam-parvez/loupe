import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  InvalidDziError,
  getLevelDimensions,
  getMaxLevel,
  getSingleTileLevel,
  getTileGrid,
  parseDzi,
} from '@/lib/images/dzi';

const SHARP_DZI = `<?xml version="1.0" encoding="UTF-8"?>
<Image xmlns="http://schemas.microsoft.com/deepzoom/2008"
  Format="webp"
  Overlap="1"
  TileSize="512"
  >
  <Size
    Height="6144"
    Width="8192"
  />
</Image>`;

describe('parseDzi', () => {
  test('reads the multi-line descriptor written by sharp', () => {
    assert.deepEqual(parseDzi(SHARP_DZI), {
      width: 8192,
      height: 6144,
      tileSize: 512,
      overlap: 1,
      format: 'webp',
    });
  });

  test('rejects descriptors without a Size element', () => {
    assert.throws(
      () => parseDzi('<Image Format="webp" Overlap="0" TileSize="256"/>'),
      InvalidDziError,
    );
  });

  test('rejects non-numeric dimensions', () => {
    assert.throws(() => parseDzi(SHARP_DZI.replace('8192', 'abc')), InvalidDziError);
  });
});

describe('pyramid math (matches OpenSeadragon DZI levels)', () => {
  test('max level is ceil(log2(longest side))', () => {
    assert.equal(getMaxLevel(8192, 6144), 13);
    assert.equal(getMaxLevel(30000, 20000), 15);
    assert.equal(getMaxLevel(1, 1), 0);
  });

  test('level dimensions halve with rounding up', () => {
    assert.deepEqual(getLevelDimensions(4800, 6400, 13), { width: 4800, height: 6400 });
    assert.deepEqual(getLevelDimensions(4800, 6400, 12), { width: 2400, height: 3200 });
    assert.deepEqual(getLevelDimensions(4800, 6400, 0), { width: 1, height: 1 });
  });

  test('tile grid at full resolution', () => {
    assert.deepEqual(getTileGrid(8192, 6144, 13, 512), { columns: 16, rows: 12 });
    assert.deepEqual(getTileGrid(4800, 6400, 13, 512), { columns: 10, rows: 13 });
  });

  test('thumbnail level is the largest level that fits in one tile', () => {
    assert.equal(getSingleTileLevel(8192, 6144, 512), 9);
    assert.deepEqual(getLevelDimensions(8192, 6144, 9), { width: 512, height: 384 });
  });
});

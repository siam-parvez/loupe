import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createProjectRecord, upsertImage } from '@/lib/projects/manifest';
import type { ImageRecord } from '@/lib/projects/types';
import {
  InvalidProjectDataError,
  buildDownloadFileName,
  humanize,
  isValidId,
  isValidTileFile,
  parseProjectRecord,
  slugify,
} from '@/lib/projects/validation';

const image: ImageRecord = {
  id: 'sunset',
  title: 'Sunset',
  downloadFileName: 'Sunset-Original-Full-Resolution.png',
  originalBytes: 1024,
  originalSha256: 'a'.repeat(64),
  width: 100,
  height: 50,
  version: 'abc-123',
  createdAt: '2026-09-26T10:00:00.000Z',
};

describe('ids and names', () => {
  test('accepts slugs, rejects traversal and odd characters', () => {
    assert.ok(isValidId('demo'));
    assert.ok(isValidId('client-2026'));
    for (const bad of ['', '..', '../etc', 'Demo', '-demo', 'demo-', 'a/b', 'a'.repeat(65)]) {
      assert.equal(isValidId(bad), false, bad);
    }
  });

  test('tile file names', () => {
    assert.ok(isValidTileFile('0_0.webp'));
    assert.ok(isValidTileFile('15_11.webp'));
    assert.equal(isValidTileFile('0_0.png'), false);
    assert.equal(isValidTileFile('../0_0.webp'), false);
  });

  test('slugify / humanize', () => {
    assert.equal(slugify('My Artwork (Final) v2.png'), 'my-artwork-final-v2');
    assert.equal(slugify('Café Été.PNG'), 'cafe-ete');
    assert.equal(humanize('sunset-study_final.png'), 'Sunset Study Final');
  });

  test('download file name is ASCII and clearly the original', () => {
    assert.equal(buildDownloadFileName('Artwork'), 'Artwork-Original-Full-Resolution.png');
    assert.equal(buildDownloadFileName('Été / Nuit'), 'Ete-Nuit-Original-Full-Resolution.png');
    assert.equal(buildDownloadFileName('***'), 'Artwork-Original-Full-Resolution.png');
  });
});

describe('parseProjectRecord', () => {
  const valid = { ...createProjectRecord({ id: 'demo', title: 'Demo' }), images: [image] };

  test('round-trips a valid record', () => {
    assert.deepEqual(parseProjectRecord(JSON.parse(JSON.stringify(valid))), valid);
  });

  test('rejects bad ids, duplicate images and unknown access modes', () => {
    assert.throws(() => parseProjectRecord({ ...valid, id: '../x' }), InvalidProjectDataError);
    assert.throws(
      () => parseProjectRecord({ ...valid, images: [image, image] }),
      InvalidProjectDataError,
    );
    assert.throws(
      () => parseProjectRecord({ ...valid, access: { mode: 'secret' } }),
      InvalidProjectDataError,
    );
    assert.throws(() => parseProjectRecord(null), InvalidProjectDataError);
  });
});

describe('upsertImage', () => {
  test('appends new images and replaces existing ones without mutating', () => {
    const empty = createProjectRecord({ id: 'demo', title: 'Demo' });
    const withOne = upsertImage(empty, image);
    assert.equal(empty.images.length, 0);
    assert.equal(withOne.images.length, 1);

    const withTwo = upsertImage(withOne, { ...image, id: 'dawn', title: 'Dawn' });
    assert.deepEqual(
      withTwo.images.map((entry) => entry.id),
      ['sunset', 'dawn'],
    );

    const replaced = upsertImage(withTwo, { ...image, version: 'new-1' });
    assert.deepEqual(
      replaced.images.map((entry) => entry.version),
      ['new-1', 'abc-123'],
    );
  });
});

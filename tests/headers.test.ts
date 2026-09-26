import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { attachmentDisposition, parseRangeHeader } from '@/lib/http/headers';

describe('parseRangeHeader', () => {
  const size = 1000;

  test('no header or unsupported syntax means full file', () => {
    assert.equal(parseRangeHeader(null, size), null);
    assert.equal(parseRangeHeader('bytes=0-1,5-6', size), null);
    assert.equal(parseRangeHeader('items=0-1', size), null);
  });

  test('explicit, open-ended and suffix ranges', () => {
    assert.deepEqual(parseRangeHeader('bytes=0-99', size), { start: 0, end: 99 });
    assert.deepEqual(parseRangeHeader('bytes=900-', size), { start: 900, end: 999 });
    assert.deepEqual(parseRangeHeader('bytes=-100', size), { start: 900, end: 999 });
    assert.deepEqual(parseRangeHeader('bytes=990-5000', size), { start: 990, end: 999 });
  });

  test('out-of-bounds ranges are unsatisfiable', () => {
    assert.equal(parseRangeHeader('bytes=1000-', size), 'unsatisfiable');
    assert.equal(parseRangeHeader('bytes=50-10', size), 'unsatisfiable');
    assert.equal(parseRangeHeader('bytes=-0', size), 'unsatisfiable');
  });
});

describe('attachmentDisposition', () => {
  test('forces a download with the original filename', () => {
    assert.equal(
      attachmentDisposition('Artwork-Original-Full-Resolution.png'),
      'attachment; filename="Artwork-Original-Full-Resolution.png"; ' +
        "filename*=UTF-8''Artwork-Original-Full-Resolution.png",
    );
  });

  test('strips quotes and non-ASCII from the fallback name', () => {
    const header = attachmentDisposition('Été "x".png');
    assert.match(header, /filename="_t_ _x_\.png"/);
    assert.match(header, /filename\*=UTF-8''%C3%89t%C3%A9%20%22x%22\.png/);
  });
});

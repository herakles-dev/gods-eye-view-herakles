import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  illinoisCameraId,
  illinoisCameraToSource,
  normalizeIllinoisImageUrl,
} from '../../server/providers/cctv/sources.js';
import { ILLINOIS_IMAGE_ORIGIN } from '../../server/providers/cctv/constants.js';

/** One Illinois Gateway feature, shaped like the live ArcGIS payload. */
const feature = (attributes = {}, geometry = { x: -87.6449, y: 41.8819 }) => ({
  attributes: {
    ImgPath: 'https://travelmidwest.com/showCamera?id=IL-IDOTD1-IK14B&direction=NONE',
    CameraLocation: 'Polk St.',
    CameraDirection: 'NONE',
    SnapShot:
      'https://cctv.travelmidwest.com/snapshots/IL-IDOTD1_1_Cook_SB_I-90_4186990_-8764490_1_NONE.jpg',
    TooOld: 'false',
    ...attributes,
  },
  geometry,
});

test('an Illinois feature maps to a source on the pinned frame host', () => {
  const source = illinoisCameraToSource(feature());
  assert.equal(source.id, 'il-idotd1-ik14b-none');
  assert.equal(source.name, 'Polk St.');
  assert.equal(source.cityId, 'chicago');
  assert.equal(source.feedType, 'image');
  assert.ok(source.url.startsWith(ILLINOIS_IMAGE_ORIGIN));
  assert.equal(source.headingConfidence, 'low');
});

test('a reported facing becomes a high-confidence heading', () => {
  const source = illinoisCameraToSource(feature({ CameraDirection: 'E' }));
  assert.equal(source.headingDeg, 90);
  assert.equal(source.headingConfidence, 'high');
  assert.ok(source.id.endsWith('-e'));
});

test('frames off the TravelMidwest host are refused', () => {
  assert.equal(normalizeIllinoisImageUrl('https://evil.example/a.jpg'), null);
  assert.equal(normalizeIllinoisImageUrl('ftp://cctv.travelmidwest.com/a.jpg'), null);
  assert.equal(
    normalizeIllinoisImageUrl('http://cctv.travelmidwest.com/snapshots/a.jpg'),
    'https://cctv.travelmidwest.com/snapshots/a.jpg',
  );
  assert.equal(illinoisCameraToSource(feature({ SnapShot: 'https://evil.example/a.jpg' })), null);
});

test('stale, out-of-area and malformed features are dropped', () => {
  assert.equal(illinoisCameraToSource(feature({ TooOld: 'true' })), null);
  assert.equal(illinoisCameraToSource(feature({}, { x: -90.2, y: 38.6 })), null);
  assert.equal(illinoisCameraToSource(feature({}, null)), null);
  assert.equal(illinoisCameraToSource(null), null);
});

test('the id falls back to the snapshot filename without an ImgPath id', () => {
  const id = illinoisCameraId(
    { CameraDirection: 'NONE', ImgPath: '' },
    'https://cctv.travelmidwest.com/snapshots/IL-IDOTD1_1_Cook_SB_I-90_4186990_-8764490_1_NONE.jpg',
  );
  assert.match(id, /^il-idotd1-1-cook-sb-i-90-/);
});

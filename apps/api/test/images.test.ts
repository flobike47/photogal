import { describe, expect, it } from 'vitest';
import { isHeic } from '../src/images.js';

describe('isHeic', () => {
  it('détecte le HEIC par type MIME ou par extension', () => {
    expect(isHeic('image/heic')).toBe(true);
    expect(isHeic('image/heif')).toBe(true);
    expect(isHeic('application/octet-stream', 'IMG_0001.HEIC')).toBe(true);
    expect(isHeic('image/jpeg', 'photo.jpg')).toBe(false);
  });
});

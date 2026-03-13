import { isUnderSizeLimit, MAX_BASE64_BYTES, compressImage } from '../utils/imageUtils';

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

import * as ImageManipulator from 'expo-image-manipulator';

describe('isUnderSizeLimit', () => {
  it('returns true for bytes under 500KB', () => {
    expect(isUnderSizeLimit(499 * 1024)).toBe(true);
    expect(isUnderSizeLimit(500 * 1024)).toBe(true);
  });

  it('returns false for bytes over 500KB', () => {
    expect(isUnderSizeLimit(501 * 1024)).toBe(false);
    expect(isUnderSizeLimit(1024 * 1024)).toBe(false);
  });

  it('MAX_BASE64_BYTES is exactly 500KB', () => {
    expect(MAX_BASE64_BYTES).toBe(500 * 1024);
  });
});

describe('compressImage', () => {
  it('calls manipulateAsync with resize to 800px and 60% quality', async () => {
    const mockBase64 = 'abc123';
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file://compressed.jpg',
      base64: mockBase64,
      width: 800,
      height: 450,
    });

    const result = await compressImage('file://original.jpg');

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file://original.jpg',
      [{ resize: { width: 800 } }],
      expect.objectContaining({ compress: 0.6, base64: true })
    );

    expect(result.base64).toBe(mockBase64);
    expect(result.width).toBe(800);
    expect(result.height).toBe(450);
  });

  it('calculates byte size from base64 length', async () => {
    // base64 of length 1000 chars ≈ 750 bytes
    const base64 = 'A'.repeat(1000);
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file://test.jpg',
      base64,
      width: 800,
      height: 600,
    });

    const result = await compressImage('file://test.jpg');
    expect(result.bytes).toBe(Math.ceil((1000 * 3) / 4));
  });

  it('returns empty base64 gracefully when manipulator returns none', async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file://test.jpg',
      base64: undefined,
      width: 100,
      height: 100,
    });

    const result = await compressImage('file://test.jpg');
    expect(result.base64).toBe('');
    expect(result.bytes).toBe(0);
  });
});

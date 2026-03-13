import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 800;
const JPEG_QUALITY = 0.6;
// 500 KB limit before send
export const MAX_BASE64_BYTES = 500 * 1024;

export interface CompressResult {
  base64: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Compress a photo URI to max 800px wide at 60% JPEG quality.
 * Returns base64 string (no data: prefix).
 */
export async function compressImage(uri: string): Promise<CompressResult> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  const base64 = result.base64 ?? '';
  const bytes = Math.ceil((base64.length * 3) / 4);

  return {
    base64,
    width: result.width,
    height: result.height,
    bytes,
  };
}

export function isUnderSizeLimit(bytes: number): boolean {
  return bytes <= MAX_BASE64_BYTES;
}

/**
 * 300-DPI Black & White Editorial Engraving Processor (sharp + OWASP File Guard).
 * Converts raster photos/drawings (PNG, JPEG, WebP) into print-ready ink,
 * genuine Atkinson error-diffusion dithered woodcuts, or clean graphite sketches.
 */

import sharp from 'sharp';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const MAX_INPUT_PIXELS = 40_000_000;
export const DEFAULT_ENGRAVINGS_DIR = '/home/antigravity/storage/engravings';
const VALID_MODES = new Set(['ink', 'engraving', 'sketch']);

/**
 * Inspects real magic bytes (OWASP File Upload protection) for PNG, JPEG, and WebP.
 * Returns the detected MIME string or null if invalid/unsupported.
 */
export function detectImageMimeFromMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Clamps pixel dimensions safely to [120, 3000].
 */
function clampDimension(value, fallback) {
  const numeric = Math.round(Number(value) || fallback);
  return Math.max(120, Math.min(3000, numeric));
}

/**
 * Applies genuine Bill Atkinson error-diffusion dithering on a 1-channel grayscale array,
 * producing pure binary black (0) & white (255) pixels in a Uint8Array.
 */
export function applyAtkinsonDithering(grayData, width, height, channels = 1) {
  const pixelCount = width * height;
  const work = new Float32Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    work[i] = grayData[i * channels];
  }

  const dithered = new Uint8Array(pixelCount);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const oldPixel = Math.max(0, Math.min(255, work[idx]));
      const newPixel = oldPixel < 128 ? 0 : 255;
      dithered[idx] = newPixel;

      // Distribute 1/8 of quantization error to the 6 Atkinson neighbors
      const errPart = (oldPixel - newPixel) / 8;

      if (x + 1 < width) {
        work[idx + 1] += errPart;
      }
      if (x + 2 < width) {
        work[idx + 2] += errPart;
      }
      if (y + 1 < height) {
        const nextRow = idx + width;
        if (x - 1 >= 0) {
          work[nextRow - 1] += errPart;
        }
        work[nextRow] += errPart;
        if (x + 1 < width) {
          work[nextRow + 1] += errPart;
        }
      }
      if (y + 2 < height) {
        work[idx + width * 2] += errPart;
      }
    }
  }

  return dithered;
}

/**
 * Applies an editorial graphite sketch curve: cleans highlights (> 218) to pure 255 paper white
 * and accentuates dark pencil/charcoal strokes.
 */
export function applyEditorialSketchCurve(grayData, width, height, channels = 1) {
  const pixelCount = width * height;
  const out = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const val = grayData[i * channels];
    if (val > 218) {
      out[i] = 255;
    } else {
      const normalized = val / 218;
      const accentuated = Math.round(Math.pow(normalized, 1.38) * 232);
      out[i] = Math.max(0, Math.min(255, accentuated));
    }
  }

  return out;
}

/**
 * Processes an image buffer into a 300-DPI black-and-white PNG engraving saved on disk.
 */
export async function processImageToEngraving({
  buffer,
  mode = 'engraving',
  widthPx = 600,
  heightPx = 800,
  fit = 'contain',
  outputDir = DEFAULT_ENGRAVINGS_DIR
} = {}) {
  if (!buffer || (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array))) {
    const err = new Error('Se requiere un buffer de imagen válido.');
    err.statusCode = 400;
    err.code = 'MISSING_IMAGE_BUFFER';
    throw err;
  }

  const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const detectedMime = detectImageMimeFromMagicBytes(inputBuffer);
  if (!detectedMime) {
    const err = new Error('Formato de archivo no permitido. Solo se aceptan imágenes reales PNG, JPEG o WebP.');
    err.statusCode = 400;
    err.code = 'INVALID_IMAGE_SIGNATURE';
    throw err;
  }

  const width = clampDimension(widthPx, 600);
  const height = clampDimension(heightPx, 800);
  const normalizedFit = fit === 'cover' ? 'cover' : 'contain';
  const normalizedMode = VALID_MODES.has(mode) ? mode : 'engraving';

  const basePipeline = sharp(inputBuffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize(width, height, {
      fit: normalizedFit,
      background: '#ffffff'
    });

  let outputBuffer;

  if (normalizedMode === 'ink') {
    outputBuffer = await basePipeline
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.2 })
      .linear(1.45, -35)
      .threshold(150)
      .png({ compressionLevel: 9 })
      .withMetadata({ density: 300 })
      .toBuffer();
  } else if (normalizedMode === 'sketch') {
    const { data, info } = await basePipeline
      .grayscale()
      .normalize()
      .sharpen({ sigma: 0.85 })
      .toColourspace('b-w')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const sketchPixels = applyEditorialSketchCurve(data, info.width, info.height, info.channels);

    outputBuffer = await sharp(sketchPixels, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 1
      }
    })
      .png({ compressionLevel: 9 })
      .withMetadata({ density: 300 })
      .toBuffer();
  } else {
    // Default: 'engraving' — Genuine Atkinson error-diffusion dithering in pure B&W
    const { data, info } = await basePipeline
      .grayscale()
      .normalize()
      .sharpen({ sigma: 0.9 })
      .toColourspace('b-w')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const ditheredBuffer = applyAtkinsonDithering(data, info.width, info.height, info.channels);

    outputBuffer = await sharp(ditheredBuffer, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 1
      }
    })
      .png({ compressionLevel: 9 })
      .withMetadata({ density: 300 })
      .toBuffer();
  }

  await fs.mkdir(outputDir, { recursive: true });
  const filename = `${crypto.randomUUID()}.png`;
  const targetPath = path.join(outputDir, filename);
  await fs.writeFile(targetPath, outputBuffer);

  return {
    filename,
    url: `/storage/engravings/${filename}`,
    widthPx: width,
    heightPx: height,
    dpi: 300,
    mode: normalizedMode,
    fit: normalizedFit,
    sizeBytes: outputBuffer.byteLength
  };
}

import multer from 'multer';

export const MAX_UPLOAD_FILE_BYTES = 12 * 1024 * 1024; // 12 MB
const INVALID_IMAGE_MESSAGE = 'Archivo inválido. Subí una imagen real PNG, JPG o WebP.';

const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const JPEG_MAGIC = [0xFF, 0xD8, 0xFF];

const rawUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_FILE_BYTES,
    files: 1
  }
}).any();

/**
 * Inspects true binary magic bytes (OWASP File Upload Cheat Sheet) rather than
 * trusting client-supplied Content-Type or filename extension.
 *
 * @param {Buffer} buffer
 * @returns {'image/png' | 'image/jpeg' | 'image/webp' | null}
 */
export function detectImageMimeFromMagicBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= PNG_MAGIC.length &&
    PNG_MAGIC.every((byte, idx) => buffer[idx] === byte)
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (
    buffer.length >= JPEG_MAGIC.length &&
    JPEG_MAGIC.every((byte, idx) => buffer[idx] === byte)
  ) {
    return 'image/jpeg';
  }

  // WebP: bytes 0..3 == 'RIFF' and bytes 8..11 == 'WEBP'
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Express middleware that parses a single multipart image into memory (<= 12 MB)
 * regardless of whether the form field is named `image` or `file`, and converts
 * Multer errors into clean JSON responses.
 */
export function uploadSingleImage(req, res, next) {
  rawUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: 'La imagen supera el tamaño máximo permitido de 12 MB.'
          });
        }
        return res.status(400).json({
          error: INVALID_IMAGE_MESSAGE
        });
      }
      return res.status(400).json({
        error: INVALID_IMAGE_MESSAGE
      });
    }

    if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }

    return next();
  });
}

/**
 * Express middleware that verifies the uploaded buffer's binary magic bytes.
 */
export function validateImageMagicBytes(req, res, next) {
  if (!req.file || !Buffer.isBuffer(req.file.buffer) || req.file.buffer.length === 0) {
    return res.status(400).json({
      error: INVALID_IMAGE_MESSAGE
    });
  }

  const detectedMime = detectImageMimeFromMagicBytes(req.file.buffer);
  if (!detectedMime) {
    return res.status(400).json({
      error: INVALID_IMAGE_MESSAGE
    });
  }

  req.detectedImageMime = detectedMime;
  return next();
}

/**
 * Paper Letter Scanner Service (OCR + Automatic & Manual Drawing Extraction).
 * Processes photographed or scanned paper letters/poems (JPEG, PNG, WebP):
 *  1) Validates real magic bytes (OWASP) and auto-orients EXIF photos with sharp.
 *  2) Runs offline-cached Tesseract.js Spanish OCR to extract text, structure
 *     (title, body verses, signature), and text line bounding boxes.
 *  3) Masks out recognized text regions and clusters remaining ink strokes to
 *     automatically detect hand-drawn sketches/ornaments on the letter, converting
 *     them into clean 300-DPI B&W ink/engraving PNGs ready for the book page.
 *  4) Also supports manual crop extraction of any specific drawing on the letter.
 */

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createWorker } from 'tesseract.js';
import {
  detectImageMimeFromMagicBytes,
  processImageToEngraving,
  MAX_INPUT_PIXELS
} from './engravingService.js';

const OCR_CACHE_DIR = process.env.OCR_CACHE_DIR
  ? path.resolve(process.env.OCR_CACHE_DIR)
  : path.resolve(process.cwd(), 'storage/ocr');

const VALID_ENHANCE_MODES = new Set(['standard', 'light_ink', 'shadow']);
const VALID_DRAWING_MODES = new Set(['ink', 'engraving', 'sketch']);

// Keep a single warm worker per language serialized via promise queue to avoid race conditions
let cachedLang = null;
let cachedWorker = null;
let ocrQueue = Promise.resolve();

async function getOcrWorker(lang = 'spa') {
  const safeLang = lang === 'spa+eng' || lang === 'eng' ? lang : 'spa';
  await fs.mkdir(OCR_CACHE_DIR, { recursive: true });

  if (cachedWorker && cachedLang === safeLang) {
    return cachedWorker;
  }

  if (cachedWorker) {
    try {
      await cachedWorker.terminate();
    } catch {
      // ignore termination failure
    }
    cachedWorker = null;
    cachedLang = null;
  }

  const worker = await createWorker(safeLang, 1, {
    cachePath: OCR_CACHE_DIR
  });
  cachedWorker = worker;
  cachedLang = safeLang;
  return worker;
}

export async function terminatePaperScannerWorker() {
  if (cachedWorker) {
    try {
      await cachedWorker.terminate();
    } catch {
      // ignore
    }
    cachedWorker = null;
    cachedLang = null;
  }
}

/**
 * Cleans OCR text into structured title, body text, and optional signature.
 */
export function parseScannedLetterText(rawText = '') {
  const normalized = String(rawText ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) {
    return {
      fullText: '',
      suggestedTitle: '',
      suggestedText: '',
      suggestedSignature: '',
      lineCount: 0,
      wordCount: 0
    };
  }

  // Split into paragraph blocks separated by blank lines
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).join('\n'))
    .filter(Boolean);

  let suggestedTitle = '';
  let suggestedSignature = '';
  const bodyParagraphs = [...paragraphs];

  // Detect optional title if first paragraph is a single short heading line
  if (bodyParagraphs.length >= 2) {
    const first = bodyParagraphs[0];
    if (!first.includes('\n') && first.length <= 64 && !/[.;:!?]$/.test(first)) {
      suggestedTitle = first;
      bodyParagraphs.shift();
    }
  }

  // Detect optional signature if last paragraph is short or starts with dash/tilde
  if (bodyParagraphs.length >= 2) {
    const last = bodyParagraphs[bodyParagraphs.length - 1];
    if (
      !last.includes('\n') &&
      last.length <= 48 &&
      (/^[-—–~·]/.test(last) || last.split(/\s+/).length <= 4)
    ) {
      suggestedSignature = last;
      bodyParagraphs.pop();
    }
  }

  // Fallback: if single paragraph has multiple lines and last line starts with dash
  if (!suggestedSignature && bodyParagraphs.length === 1) {
    const lines = bodyParagraphs[0].split('\n');
    if (lines.length >= 3) {
      const lastLine = lines[lines.length - 1];
      if (/^[-—–~]/.test(lastLine) && lastLine.length <= 48) {
        suggestedSignature = lastLine;
        lines.pop();
        bodyParagraphs[0] = lines.join('\n');
      }
    }
  }

  const suggestedText = bodyParagraphs.join('\n\n').trim() || normalized;
  const allLines = normalized.split('\n').filter((l) => l.trim().length > 0);
  const words = normalized.split(/\s+/).filter(Boolean);

  return {
    fullText: normalized,
    suggestedTitle,
    suggestedText,
    suggestedSignature,
    lineCount: allLines.length,
    wordCount: words.length
  };
}

/**
 * Extracts reliable text line bounding boxes from Tesseract blocks structure.
 */
function collectTextLineBoxes(ocrData) {
  const boxes = [];
  const blocks = Array.isArray(ocrData?.blocks) ? ocrData.blocks : [];

  for (const block of blocks) {
    const paragraphs = Array.isArray(block?.paragraphs) ? block.paragraphs : [];
    for (const para of paragraphs) {
      const lines = Array.isArray(para?.lines) ? para.lines : [];
      for (const line of lines) {
        const text = String(line?.text ?? '').trim();
        const alphaNumCount = (text.match(/[A-Za-zÀ-ÿ0-9]/g) || []).length;
        const conf = Number(line?.confidence ?? 0);
        if (alphaNumCount >= 2 && conf >= 28 && line?.bbox) {
          boxes.push({
            x0: Number(line.bbox.x0) || 0,
            y0: Number(line.bbox.y0) || 0,
            x1: Number(line.bbox.x1) || 0,
            y1: Number(line.bbox.y1) || 0,
            confidence: conf
          });
        }
      }
    }
  }

  return boxes;
}

/**
 * Detects the most prominent non-text hand-drawn region on a preprocessed scan.
 * Masks out OCR text line boxes, then clusters remaining ink strokes on a coarse grid.
 */
async function detectNonTextDrawingBox(ocrPngBuffer, ocrWidth, ocrHeight, textBoxes, enhanceMode) {
  const analysisWidth = Math.min(800, ocrWidth);
  const scale = analysisWidth / ocrWidth;
  const analysisHeight = Math.max(1, Math.round(ocrHeight * scale));

  const { data, info } = await sharp(ocrPngBuffer)
    .resize(analysisWidth, analysisHeight, { fit: 'fill' })
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // Compute paper background brightness (75th percentile approximation via histogram)
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) {
    hist[data[i]]++;
  }
  let accum = 0;
  let paperLevel = 235;
  const target75 = data.length * 0.75;
  for (let v = 0; v < 256; v++) {
    accum += hist[v];
    if (accum >= target75) {
      paperLevel = v;
      break;
    }
  }

  const delta = enhanceMode === 'light_ink' ? 35 : enhanceMode === 'shadow' ? 52 : 45;
  const inkThreshold = Math.max(90, Math.min(220, paperLevel - delta));

  // Build binary ink mask (1 = ink, 0 = paper)
  const ink = new Uint8Array(w * h);
  const borderX = Math.max(4, Math.round(w * 0.025));
  const borderY = Math.max(4, Math.round(h * 0.025));

  for (let y = borderY; y < h - borderY; y++) {
    const rowOff = y * w;
    for (let x = borderX; x < w - borderX; x++) {
      if (data[rowOff + x] < inkThreshold) {
        ink[rowOff + x] = 1;
      }
    }
  }

  // Mask out recognized text bounding boxes with generous padding
  const padX = Math.max(10, Math.round(w * 0.016));
  const padY = Math.max(8, Math.round(h * 0.014));
  for (const box of textBoxes) {
    const x0 = Math.max(0, Math.floor(box.x0 * scale) - padX);
    const y0 = Math.max(0, Math.floor(box.y0 * scale) - padY);
    const x1 = Math.min(w - 1, Math.ceil(box.x1 * scale) + padX);
    const y1 = Math.min(h - 1, Math.ceil(box.y1 * scale) + padY);
    for (let y = y0; y <= y1; y++) {
      const rowOff = y * w;
      for (let x = x0; x <= x1; x++) {
        ink[rowOff + x] = 0;
      }
    }
  }

  // Cluster remaining ink on a coarse cell grid (20x20 px cells)
  const cellSize = 20;
  const cols = Math.ceil(w / cellSize);
  const rows = Math.ceil(h / cellSize);
  const cellInkCount = new Uint32Array(cols * rows);
  const active = new Uint8Array(cols * rows);

  for (let y = 0; y < h; y++) {
    const r = Math.floor(y / cellSize);
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      if (ink[rowOff + x]) {
        const c = Math.floor(x / cellSize);
        cellInkCount[r * cols + c]++;
      }
    }
  }

  // A cell is active if it has enough ink strokes (>= 10 ink pixels per 400 px cell)
  for (let i = 0; i < active.length; i++) {
    if (cellInkCount[i] >= 10) {
      active[i] = 1;
    }
  }

  // BFS 8-connected components across active cells (also bridge 1-cell gaps for sparse sketches)
  const visited = new Uint8Array(cols * rows);
  let bestCluster = null;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const startIdx = r * cols + c;
      if (!active[startIdx] || visited[startIdx]) continue;

      const queue = [[r, c]];
      visited[startIdx] = 1;
      let minC = c;
      let maxC = c;
      let minR = r;
      let maxR = r;
      let totalInk = 0;
      let activeCells = 0;

      while (queue.length > 0) {
        const [cr, cc] = queue.pop();
        const idx = cr * cols + cc;
        totalInk += cellInkCount[idx];
        activeCells++;
        if (cc < minC) minC = cc;
        if (cc > maxC) maxC = cc;
        if (cr < minR) minR = cr;
        if (cr > maxR) maxR = cr;

        // Check neighborhood radius 2 cells so light hand-drawn lines stay unified
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            const nIdx = nr * cols + nc;
            if (active[nIdx] && !visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push([nr, nc]);
            }
          }
        }
      }

      // Compute exact ink pixel bounds within this cell cluster
      const bx0 = Math.max(0, minC * cellSize);
      const by0 = Math.max(0, minR * cellSize);
      const bx1 = Math.min(w - 1, (maxC + 1) * cellSize - 1);
      const by1 = Math.min(h - 1, (maxR + 1) * cellSize - 1);

      let pxMinX = bx1;
      let pxMinY = by1;
      let pxMaxX = bx0;
      let pxMaxY = by0;
      for (let py = by0; py <= by1; py++) {
        const rowOff = py * w;
        for (let px = bx0; px <= bx1; px++) {
          if (ink[rowOff + px]) {
            if (px < pxMinX) pxMinX = px;
            if (px > pxMaxX) pxMaxX = px;
            if (py < pxMinY) pxMinY = py;
            if (py > pxMaxY) pxMaxY = py;
          }
        }
      }

      const bw = pxMaxX - pxMinX + 1;
      const bh = pxMaxY - pxMinY + 1;
      const widthFrac = bw / w;
      const heightFrac = bh / h;
      const aspect = Math.max(bw / Math.max(1, bh), bh / Math.max(1, bw));

      // Filter out tiny specks, thin paper fold lines, or huge full-page shadows
      const isValidDrawing =
        totalInk >= 140 &&
        activeCells >= 2 &&
        widthFrac >= 0.05 &&
        heightFrac >= 0.04 &&
        widthFrac <= 0.92 &&
        heightFrac <= 0.85 &&
        aspect <= 9;

      if (isValidDrawing) {
        const score = totalInk * (1 + Math.min(widthFrac, heightFrac));
        if (!bestCluster || score > bestCluster.score) {
          bestCluster = {
            score,
            totalInk,
            x0: pxMinX,
            y0: pxMinY,
            x1: pxMaxX,
            y1: pxMaxY
          };
        }
      }
    }
  }

  if (!bestCluster) {
    return null;
  }

  // Add slight aesthetic margin around the detected drawing
  const marginX = Math.max(8, Math.round((bestCluster.x1 - bestCluster.x0) * 0.08));
  const marginY = Math.max(8, Math.round((bestCluster.y1 - bestCluster.y0) * 0.08));

  const x0 = Math.max(0, bestCluster.x0 - marginX);
  const y0 = Math.max(0, bestCluster.y0 - marginY);
  const x1 = Math.min(w - 1, bestCluster.x1 + marginX);
  const y1 = Math.min(h - 1, bestCluster.y1 + marginY);

  return {
    xPct: Number(((x0 / w) * 100).toFixed(2)),
    yPct: Number(((y0 / h) * 100).toFixed(2)),
    widthPct: Number((((x1 - x0 + 1) / w) * 100).toFixed(2)),
    heightPct: Number((((y1 - y0 + 1) / h) * 100).toFixed(2))
  };
}

/**
 * Extracts a rectangular region (given in 0..100 percentages) from a letter photo
 * and converts it into a clean 300-DPI B&W ink/engraving PNG saved on disk.
 */
export async function extractDrawingCrop({
  buffer,
  cropBoxPct,
  mode = 'ink',
  widthPx = 640,
  heightPx = 640,
  outputDir
}) {
  const mime = detectImageMimeFromMagicBytes(buffer);
  if (!mime) {
    const err = new Error('Formato de imagen no válido. Solo se aceptan JPEG, PNG o WebP.');
    err.statusCode = 400;
    throw err;
  }

  const safeMode = VALID_DRAWING_MODES.has(mode) ? mode : 'ink';
  const rotatedBuf = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .png()
    .toBuffer();

  const meta = await sharp(rotatedBuf).metadata();
  const imgW = meta.width || 1;
  const imgH = meta.height || 1;

  const xPct = Math.max(0, Math.min(95, Number(cropBoxPct?.xPct ?? 0)));
  const yPct = Math.max(0, Math.min(95, Number(cropBoxPct?.yPct ?? 0)));
  const wPct = Math.max(4, Math.min(100 - xPct, Number(cropBoxPct?.widthPct ?? 100)));
  const hPct = Math.max(4, Math.min(100 - yPct, Number(cropBoxPct?.heightPct ?? 100)));

  const left = Math.max(0, Math.min(imgW - 2, Math.round((xPct / 100) * imgW)));
  const top = Math.max(0, Math.min(imgH - 2, Math.round((yPct / 100) * imgH)));
  const extractWidth = Math.max(16, Math.min(imgW - left, Math.round((wPct / 100) * imgW)));
  const extractHeight = Math.max(16, Math.min(imgH - top, Math.round((hPct / 100) * imgH)));

  const croppedPng = await sharp(rotatedBuf)
    .extract({ left, top, width: extractWidth, height: extractHeight })
    .normalize()
    .png()
    .toBuffer();

  // Preserve crop aspect ratio within requested target bounds
  const aspect = extractWidth / Math.max(1, extractHeight);
  const maxSide = Math.max(300, Math.min(1400, Math.max(Number(widthPx) || 640, Number(heightPx) || 640)));
  let targetW = maxSide;
  let targetH = maxSide;
  if (aspect >= 1) {
    targetH = Math.max(180, Math.round(maxSide / aspect));
  } else {
    targetW = Math.max(180, Math.round(maxSide * aspect));
  }

  const asset = await processImageToEngraving({
    buffer: croppedPng,
    mode: safeMode,
    widthPx: targetW,
    heightPx: targetH,
    fit: 'contain',
    outputDir
  });

  return {
    asset,
    cropBoxPct: { xPct, yPct, widthPct: wPct, heightPct: hPct }
  };
}

/**
 * Full paper letter scan pipeline:
 *  - Preprocesses photo (EXIF orientation + contrast cleanup)
 *  - Recognizes Spanish/multilingual text via Tesseract.js
 *  - Parses Title / Body / Signature
 *  - Optionally detects and extracts any hand-drawn illustration into a 300 DPI PNG
 */
export async function scanPaperLetter({
  buffer,
  lang = 'spa',
  enhanceMode = 'standard',
  detectDrawing = true,
  drawingMode = 'ink',
  widthPx = 640,
  heightPx = 640,
  outputDir
}) {
  const mime = detectImageMimeFromMagicBytes(buffer);
  if (!mime) {
    const err = new Error('El archivo no es una imagen válida (JPEG, PNG o WebP).');
    err.statusCode = 400;
    throw err;
  }

  const safeEnhance = VALID_ENHANCE_MODES.has(enhanceMode) ? enhanceMode : 'standard';
  const safeDrawingMode = VALID_DRAWING_MODES.has(drawingMode) ? drawingMode : 'ink';

  // Step 1: Preprocess photo for optimal OCR accuracy
  let pipeline = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: 1600, height: 2200, fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .normalize();

  if (safeEnhance === 'light_ink') {
    pipeline = pipeline.gamma(1.4).linear(1.25, -30).sharpen({ sigma: 1.2 });
  } else if (safeEnhance === 'shadow') {
    pipeline = pipeline.linear(1.35, -35).sharpen({ sigma: 1.1 });
  } else {
    pipeline = pipeline.sharpen({ sigma: 0.9 });
  }

  const ocrPngBuffer = await pipeline.png().toBuffer();
  const ocrMeta = await sharp(ocrPngBuffer).metadata();
  const ocrWidth = ocrMeta.width || 800;
  const ocrHeight = ocrMeta.height || 1000;

  // Step 2: Run serialized OCR via cached worker
  const ocrResult = await new Promise((resolve, reject) => {
    ocrQueue = ocrQueue
      .catch(() => {})
      .then(async () => {
        try {
          const worker = await getOcrWorker(lang);
          const recognized = await worker.recognize(ocrPngBuffer, {}, { blocks: true });
          resolve(recognized.data);
        } catch (err) {
          reject(err);
        }
      });
  });

  const parsed = parseScannedLetterText(ocrResult?.text || '');
  const confidence = Math.max(0, Math.min(100, Math.round(Number(ocrResult?.confidence) || 0)));
  const textBoxes = collectTextLineBoxes(ocrResult);

  // Step 3: Automatic drawing detection & 300 DPI engraving extraction
  let detectedDrawing = null;
  if (detectDrawing) {
    try {
      const boxPct = await detectNonTextDrawingBox(
        ocrPngBuffer,
        ocrWidth,
        ocrHeight,
        textBoxes,
        safeEnhance
      );
      if (boxPct) {
        const extracted = await extractDrawingCrop({
          buffer,
          cropBoxPct: boxPct,
          mode: safeDrawingMode,
          widthPx,
          heightPx,
          outputDir
        });
        detectedDrawing = {
          detected: true,
          cropBoxPct: extracted.cropBoxPct,
          asset: extracted.asset
        };
      }
    } catch {
      // Non-fatal: still return recognized text cleanly even if drawing detection fails
      detectedDrawing = null;
    }
  }

  return {
    ocr: {
      language: lang === 'spa+eng' || lang === 'eng' ? lang : 'spa',
      confidence,
      enhanceMode: safeEnhance,
      fullText: parsed.fullText,
      suggestedTitle: parsed.suggestedTitle,
      suggestedText: parsed.suggestedText,
      suggestedSignature: parsed.suggestedSignature,
      lineCount: parsed.lineCount,
      wordCount: parsed.wordCount,
      textBlockCount: textBoxes.length
    },
    drawing: detectedDrawing || {
      detected: false,
      cropBoxPct: null,
      asset: null
    }
  };
}

/**
 * Paper Letter Scanner Service — Editorial Personal (v2 Neural OCR + Vision HTR).
 *
 * Recognizes photographed or scanned paper letters/poems (JPEG, PNG, WebP):
 *  1) Validates binary magic bytes (OWASP) and auto-orients EXIF photos with sharp.
 *  2) Flattens uneven camera illumination, shadows, and paper tint via local
 *     background division (Difference-of-Gaussian / adaptive paper leveling).
 *  3) Primary Offline Engine: PaddleOCR PP-OCRv5 Neural Transformer (DBNet + SVTRv2
 *     Latin/Spanish dictionary with full accents áéíóúüñ¿¡) running via WASM ONNX
 *     with zero external network dependencies.
 *  4) Optional Cursive Vision AI Engine: Gemini 2.5 Flash multimodal HTR when a
 *     GEMINI_API_KEY is configured in env or supplied by the user for difficult
 *     cursive manuscripts.
 *  5) Masks out recognized text boxes on the shadow-flattened sheet to detect and
 *     extract hand-drawn sketches/ornaments into 300-DPI B&W ink/engraving PNGs.
 */

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as ort from 'onnxruntime-web';
import { PaddleOcrService, parseRecognitionDictionary } from 'paddleocr';
import {
  detectImageMimeFromMagicBytes,
  processImageToEngraving,
  MAX_INPUT_PIXELS
} from './engravingService.js';

const require = createRequire(import.meta.url);

// Configure ONNX Runtime WASM directory deterministically across Linux, macOS, and Windows
try {
  const ortEntry = require.resolve('onnxruntime-web');
  ort.env.wasm.wasmPaths = path.dirname(ortEntry) + path.sep;
  ort.env.wasm.numThreads = 1;
} catch {
  // Default resolution fallback
}

const OCR_MODELS_DIR = process.env.OCR_CACHE_DIR
  ? path.resolve(process.env.OCR_CACHE_DIR)
  : path.resolve(process.cwd(), 'storage/ocr');

const DET_MODEL_FILE = 'PP-OCRv5_mobile_det.onnx';
const REC_MODEL_FILE = 'latin_PP-OCRv5_rec.onnx';
const DICT_FILE = 'ppocrv5_latin_dict.txt';

const VALID_ENHANCE_MODES = new Set(['standard', 'light_ink', 'shadow']);
const VALID_DRAWING_MODES = new Set(['ink', 'engraving', 'sketch']);
const OCR_BORDER_PAD_PX = 28;

let paddleInstancePromise = null;
let ocrQueue = Promise.resolve();

function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Lazily initializes and caches the singleton PP-OCRv5 Latin neural service.
 */
async function getPaddleOcrInstance() {
  if (!paddleInstancePromise) {
    paddleInstancePromise = (async () => {
      const detPath = path.join(OCR_MODELS_DIR, DET_MODEL_FILE);
      const recPath = path.join(OCR_MODELS_DIR, REC_MODEL_FILE);
      const dictPath = path.join(OCR_MODELS_DIR, DICT_FILE);

      const [detBuf, recBuf, dictText] = await Promise.all([
        fs.readFile(detPath),
        fs.readFile(recPath),
        fs.readFile(dictPath, 'utf8')
      ]);

      return PaddleOcrService.createInstance({
        ort,
        modelPreset: 'PP-OCRv5_mobile',
        detection: {
          modelBuffer: toArrayBuffer(detBuf),
          maxSideLength: 1280,
          boxScoreThreshold: 0.42,
          unclipRatio: 1.72,
          paddingBoxVertical: 0.45,
          paddingBoxHorizontal: 0.65
        },
        recognition: {
          modelBuffer: toArrayBuffer(recBuf),
          charactersDictionary: parseRecognitionDictionary(dictText)
        }
      });
    })().catch((err) => {
      paddleInstancePromise = null;
      throw err;
    });
  }
  return paddleInstancePromise;
}

export async function terminatePaperScannerWorker() {
  if (paddleInstancePromise) {
    try {
      const svc = await paddleInstancePromise;
      await svc.destroy();
    } catch {
      // ignore cleanup error
    }
    paddleInstancePromise = null;
  }
}

/**
 * Flattens uneven lighting, camera shadows, warm paper color cast, and faint ruled lines
 * by dividing each pixel by a wide Gaussian estimate of the local paper illumination.
 * Returns raw 3-channel RGB buffer + dimensions.
 */
async function buildIlluminationFlattenedRgb(basePngBuffer, mode = 'standard') {
  const [fg, bg] = await Promise.all([
    sharp(basePngBuffer).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(basePngBuffer).removeAlpha().blur(26).raw().toBuffer({ resolveWithObject: true })
  ]);

  const { width, height, channels } = fg.info;
  const out = new Uint8Array(width * height * 3);

  const gamma = mode === 'light_ink' ? 2.15 : mode === 'shadow' ? 1.75 : 1.35;
  const whiteClip = mode === 'shadow' ? 0.90 : mode === 'light_ink' ? 0.96 : 0.95;

  const pixelCount = width * height;
  for (let i = 0; i < pixelCount; i++) {
    const off = i * channels;
    const outOff = i * 3;
    for (let c = 0; c < 3; c++) {
      const val = fg.data[off + c];
      const localPaper = Math.max(38, bg.data[off + c]);
      const ratio = val / localPaper;
      if (ratio >= whiteClip) {
        out[outOff + c] = 255;
      } else {
        const norm = Math.max(0, ratio / whiteClip);
        out[outOff + c] = Math.max(0, Math.min(255, Math.round(Math.pow(norm, gamma) * 255)));
      }
    }
  }

  // Sharpen strokes slightly and add a white quiet border so edge letters are never clipped
  const padded = await sharp(out, { raw: { width, height, channels: 3 } })
    .sharpen({ sigma: 0.85 })
    .extend({
      top: OCR_BORDER_PAD_PX,
      bottom: OCR_BORDER_PAD_PX,
      left: OCR_BORDER_PAD_PX,
      right: OCR_BORDER_PAD_PX,
      background: { r: 255, g: 255, b: 255 }
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: padded.data,
    width: padded.info.width,
    height: padded.info.height,
    innerWidth: width,
    innerHeight: height,
    padPx: OCR_BORDER_PAD_PX
  };
}

/**
 * Builds a mildly contrast-normalized RGB input with white quiet border for clean scans.
 */
async function buildNaturalNormalizedRgb(basePngBuffer) {
  const meta = await sharp(basePngBuffer).metadata();
  const innerWidth = meta.width || 800;
  const innerHeight = meta.height || 1000;

  const padded = await sharp(basePngBuffer)
    .removeAlpha()
    .normalize()
    .sharpen({ sigma: 0.75 })
    .extend({
      top: OCR_BORDER_PAD_PX,
      bottom: OCR_BORDER_PAD_PX,
      left: OCR_BORDER_PAD_PX,
      right: OCR_BORDER_PAD_PX,
      background: { r: 255, g: 255, b: 255 }
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: padded.data,
    width: padded.info.width,
    height: padded.info.height,
    innerWidth,
    innerHeight,
    padPx: OCR_BORDER_PAD_PX
  };
}

function computeMedian(values) {
  if (!values.length) return 24;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Filters out drawing noise (e.g. a large circle misread as 'O'), sorts word/line boxes
 * in natural reading order, merges words on the same physical line, and reconstructs
 * poetic stanza breaks based on vertical line spacing.
 */
function reconstructTextAndBoxes(rawItems, padPx, innerWidth, innerHeight) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { text: '', avgConfidence: 0, textBoxes: [] };
  }

  // Initial basic filter
  const candidates = rawItems
    .map((item) => {
      const text = String(item?.text ?? '').trim();
      const conf = Number(item?.confidence ?? 0);
      const b = item?.box || {};
      const x0 = Math.max(0, Math.min(innerWidth, (Number(b.x) || 0) - padPx));
      const y0 = Math.max(0, Math.min(innerHeight, (Number(b.y) || 0) - padPx));
      const x1 = Math.max(x0 + 1, Math.min(innerWidth, (Number(b.x) || 0) + (Number(b.width) || 0) - padPx));
      const y1 = Math.max(y0 + 1, Math.min(innerHeight, (Number(b.y) || 0) + (Number(b.height) || 0) - padPx));
      return {
        text,
        confidence: conf,
        x0,
        y0,
        x1,
        y1,
        width: x1 - x0,
        height: y1 - y0,
        centerY: (y0 + y1) / 2
      };
    })
    .filter((c) => c.text.length > 0 && c.confidence >= 0.36);

  if (candidates.length === 0) {
    return { text: '', avgConfidence: 0, textBoxes: [] };
  }

  const multiCharHeights = candidates.filter((c) => c.text.length >= 2).map((c) => c.height);
  const medianHeight = computeMedian(
    multiCharHeights.length > 0 ? multiCharHeights : candidates.map((c) => c.height)
  );

  // Filter isolated 1-character drawing hallucinations (e.g., circles/lines read as 'O', '0', '|', 'I')
  const validItems = candidates.filter((c) => {
    if (c.text.length >= 2) {
      return c.height <= medianHeight * 3.4;
    }
    // Single char: reject if oversized (drawing contour) or purely punctuation/symbol noise
    if (c.height > medianHeight * 2.1) return false;
    if (!/[A-Za-zÀ-ÿ0-9]/.test(c.text)) return false;
    if (c.confidence < 0.80) return false;

    // Also check if this 1-char box is vertically isolated far from all multi-char text lines
    if (multiCharHeights.length > 0) {
      const minVertDist = Math.min(
        ...candidates
          .filter((other) => other !== c && other.text.length >= 2)
          .map((other) => Math.abs(other.centerY - c.centerY))
      );
      if (minVertDist > medianHeight * 2.6 && /^[Oo0Il1VvXxCc]$/.test(c.text)) {
        return false;
      }
    }
    return true;
  });

  if (validItems.length === 0) {
    return { text: '', avgConfidence: 0, textBoxes: [] };
  }

  // Group boxes into horizontal reading lines
  const sortedByY = [...validItems].sort((a, b) => a.centerY - b.centerY);
  const lines = [];

  for (const item of sortedByY) {
    const lastLine = lines[lines.length - 1];
    if (lastLine) {
      const lineTol = Math.max(8, Math.min(lastLine.avgHeight, item.height) * 0.58);
      if (Math.abs(item.centerY - lastLine.centerY) <= lineTol) {
        lastLine.items.push(item);
        const n = lastLine.items.length;
        lastLine.centerY = (lastLine.centerY * (n - 1) + item.centerY) / n;
        lastLine.avgHeight = (lastLine.avgHeight * (n - 1) + item.height) / n;
        lastLine.topY = Math.min(lastLine.topY, item.y0);
        lastLine.bottomY = Math.max(lastLine.bottomY, item.y1);
        continue;
      }
    }
    lines.push({
      items: [item],
      centerY: item.centerY,
      avgHeight: item.height,
      topY: item.y0,
      bottomY: item.y1
    });
  }

  const lineHeights = lines.map((l) => l.bottomY - l.topY);
  const medLineH = computeMedian(lineHeights);

  const outputChunks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    line.items.sort((a, b) => a.x0 - b.x0);
    const lineStr = line.items.map((it) => it.text).join(' ').replace(/\s+/g, ' ').trim();
    if (!lineStr) continue;

    if (i > 0) {
      const prev = lines[i - 1];
      const gap = line.topY - prev.bottomY;
      if (gap > medLineH * 0.85) {
        outputChunks.push('\n\n');
      } else {
        outputChunks.push('\n');
      }
    }
    outputChunks.push(lineStr);
  }

  const totalWeight = validItems.reduce((acc, it) => acc + Math.max(1, it.text.length), 0);
  const weightedConf =
    validItems.reduce((acc, it) => acc + it.confidence * Math.max(1, it.text.length), 0) /
    Math.max(1, totalWeight);

  return {
    text: outputChunks.join('').trim(),
    avgConfidence: Math.round(weightedConf * 100),
    textBoxes: validItems
  };
}

/**
 * Cleans OCR text into structured title, body verses, and optional signature.
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

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).join('\n'))
    .filter(Boolean);

  let suggestedTitle = '';
  let suggestedSignature = '';
  const bodyParagraphs = [...paragraphs];

  if (bodyParagraphs.length >= 2) {
    const first = bodyParagraphs[0];
    if (!first.includes('\n') && first.length <= 68 && !/[.;:!?]$/.test(first)) {
      suggestedTitle = first;
      bodyParagraphs.shift();
    }
  }

  if (bodyParagraphs.length >= 2) {
    const last = bodyParagraphs[bodyParagraphs.length - 1];
    if (
      !last.includes('\n') &&
      last.length <= 52 &&
      (/^[-—–~·]/.test(last) || /^(con\s+(amor|cariño|afecto)|atentamente|besos|abrazos|tuyo|tuya)\b/i.test(last) || last.split(/\s+/).length <= 4)
    ) {
      suggestedSignature = last;
      bodyParagraphs.pop();
    }
  }

  if (!suggestedSignature && bodyParagraphs.length === 1) {
    const lines = bodyParagraphs[0].split('\n');
    if (lines.length >= 3) {
      const lastLine = lines[lines.length - 1];
      if ((/^[-—–~]/.test(lastLine) || /^(con\s+(amor|cariño|afecto))\b/i.test(lastLine)) && lastLine.length <= 52) {
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
 * Detects the most prominent hand-drawn non-text region using local-illumination-flattened
 * grayscale so camera shadows on paper are never mistaken for drawings.
 */
async function detectNonTextDrawingBox(basePngBuffer, innerWidth, innerHeight, textBoxes, enhanceMode) {
  const analysisWidth = Math.min(800, innerWidth);
  const scale = analysisWidth / innerWidth;
  const analysisHeight = Math.max(1, Math.round(innerHeight * scale));

  // Flatten paper shadows first so uneven lighting does NOT trigger false drawing clusters
  const [fg, bg] = await Promise.all([
    sharp(basePngBuffer).resize(analysisWidth, analysisHeight, { fit: 'fill' }).grayscale().raw().toBuffer({ resolveWithObject: true }),
    sharp(basePngBuffer).resize(analysisWidth, analysisHeight, { fit: 'fill' }).grayscale().blur(20).raw().toBuffer({ resolveWithObject: true })
  ]);

  const w = fg.info.width;
  const h = fg.info.height;
  const ratioCutoff = enhanceMode === 'light_ink' ? 0.87 : 0.82;

  const ink = new Uint8Array(w * h);
  const borderX = Math.max(6, Math.round(w * 0.03));
  const borderY = Math.max(6, Math.round(h * 0.03));

  for (let y = borderY; y < h - borderY; y++) {
    const rowOff = y * w;
    for (let x = borderX; x < w - borderX; x++) {
      const idx = rowOff + x;
      const localBg = Math.max(40, bg.data[idx]);
      if (fg.data[idx] / localBg < ratioCutoff) {
        ink[idx] = 1;
      }
    }
  }

  // Mask out all recognized text boxes with generous padding
  const padX = Math.max(12, Math.round(w * 0.02));
  const padY = Math.max(10, Math.round(h * 0.016));
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
        cellInkCount[r * cols + Math.floor(x / cellSize)]++;
      }
    }
  }

  for (let i = 0; i < active.length; i++) {
    if (cellInkCount[i] >= 10) {
      active[i] = 1;
    }
  }

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

      const isValidDrawing =
        totalInk >= 140 &&
        activeCells >= 2 &&
        widthFrac >= 0.05 &&
        heightFrac >= 0.04 &&
        widthFrac <= 0.90 &&
        heightFrac <= 0.85 &&
        aspect <= 8.5;

      if (isValidDrawing) {
        const score = totalInk * (1 + Math.min(widthFrac, heightFrac));
        if (!bestCluster || score > bestCluster.score) {
          bestCluster = { score, x0: pxMinX, y0: pxMinY, x1: pxMaxX, y1: pxMaxY };
        }
      }
    }
  }

  if (!bestCluster) return null;

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
 * Optional Multimodal Vision HTR via Gemini 2.5 Flash for complex cursive handwriting.
 */
async function recognizeWithGeminiVision(basePngBuffer, apiKey) {
  const jpegBuf = await sharp(basePngBuffer).jpeg({ quality: 86 }).toBuffer();
  const base64Data = jpegBuf.toString('base64');

  const prompt = [
    'Eres un experto paleógrafo y editor literario en español.',
    'Lee con máxima fidelidad esta foto de una carta o poema escrito en papel (manuscrito cursivo o impreso).',
    'Devuelve EXCLUSIVAMENTE un objeto JSON válido con estas claves:',
    '- "suggestedTitle": string (título o encabezado si lo hay, o "" si no tiene)',
    '- "suggestedText": string (cuerpo íntegro de la carta/poema respetando saltos de verso "\\n" y estrofas "\\n\\n", sin inventar palabras)',
    '- "suggestedSignature": string (firma o despedida breve al pie si existe, o "")',
    '- "hasDrawing": boolean (true SOLO si hay un dibujo/boceto/ilustración hecho a mano aparte de las letras)',
    '- "drawingBoxPct": null o {"xPct": number, "yPct": number, "widthPct": number, "heightPct": number} en porcentajes 0..100 rodeando únicamente el dibujo sin incluir párrafos de texto.'
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = payload?.error?.message || `Error HTTP ${res.status} en Gemini Vision.`;
      const err = new Error(msg);
      err.statusCode = res.status === 400 || res.status === 401 || res.status === 403 ? 400 : 502;
      throw err;
    }

    const rawJsonText = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(rawJsonText);
    const title = String(parsed.suggestedTitle ?? '').trim();
    const body = String(parsed.suggestedText ?? '').trim();
    const sig = String(parsed.suggestedSignature ?? '').trim();
    const fullParts = [title, body, sig].filter(Boolean);
    const fullText = fullParts.join('\n\n').trim();
    const allLines = fullText ? fullText.split('\n').filter((l) => l.trim().length > 0) : [];
    const words = fullText ? fullText.split(/\s+/).filter(Boolean) : [];

    let boxPct = null;
    if (parsed.hasDrawing && parsed.drawingBoxPct && typeof parsed.drawingBoxPct === 'object') {
      const b = parsed.drawingBoxPct;
      if (Number(b.widthPct) >= 4 && Number(b.heightPct) >= 4) {
        boxPct = {
          xPct: Math.max(0, Math.min(95, Number(b.xPct) || 0)),
          yPct: Math.max(0, Math.min(95, Number(b.yPct) || 0)),
          widthPct: Math.max(4, Math.min(100, Number(b.widthPct) || 20)),
          heightPct: Math.max(4, Math.min(100, Number(b.heightPct) || 20))
        };
      }
    }

    return {
      ocr: {
        engine: 'gemini-vision-htr',
        language: 'spa',
        confidence: 98,
        fullText,
        suggestedTitle: title,
        suggestedText: body || fullText,
        suggestedSignature: sig,
        lineCount: allLines.length,
        wordCount: words.length,
        textBlockCount: allLines.length
      },
      visionDrawingBoxPct: boxPct
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extracts a rectangular region (0..100 percentages) from a letter photo, flattens
 * uneven lighting so background paper stays pure white, and converts strokes to 300-DPI B&W PNG.
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

  const rawCrop = await sharp(rotatedBuf)
    .extract({ left, top, width: extractWidth, height: extractHeight })
    .png()
    .toBuffer();

  // Flatten paper lighting inside the crop so shadows don't turn into black blotches in ink mode
  const flattened = await buildIlluminationFlattenedRgb(rawCrop, 'shadow');
  const cleanCropPng = await sharp(flattened.data, {
    raw: { width: flattened.width, height: flattened.height, channels: 3 }
  })
    .extract({
      left: flattened.padPx,
      top: flattened.padPx,
      width: flattened.innerWidth,
      height: flattened.innerHeight
    })
    .png()
    .toBuffer();

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
    buffer: cleanCropPng,
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
 *  - Validates & normalizes EXIF orientation
 *  - Uses Gemini Vision HTR if an API key is provided/requested, OR runs the local
 *    PP-OCRv5 Neural Transformer with adaptive illumination flattening + dual-pass recovery
 *  - Separates Title / Body Verses / Signature
 *  - Detects & extracts hand-drawn illustrations into clean 300-DPI B&W ink PNGs
 */
export async function scanPaperLetter({
  buffer,
  lang = 'spa',
  enhanceMode = 'standard',
  detectDrawing = true,
  drawingMode = 'ink',
  ocrEngine = 'auto',
  visionApiKey = '',
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

  const basePngBuffer = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: 1500, height: 2100, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const baseMeta = await sharp(basePngBuffer).metadata();
  const innerWidth = baseMeta.width || 800;
  const innerHeight = baseMeta.height || 1000;

  const effectiveApiKey = (typeof visionApiKey === 'string' && visionApiKey.trim())
    ? visionApiKey.trim()
    : (process.env.GEMINI_API_KEY || '').trim();

  // Optional Vision AI branch for difficult cursive handwriting
  if (effectiveApiKey && (ocrEngine === 'vision_ai' || ocrEngine === 'auto')) {
    try {
      const visionOut = await recognizeWithGeminiVision(basePngBuffer, effectiveApiKey);
      let detectedDrawing = null;
      if (detectDrawing && visionOut.visionDrawingBoxPct) {
        try {
          const extracted = await extractDrawingCrop({
            buffer,
            cropBoxPct: visionOut.visionDrawingBoxPct,
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
        } catch {
          detectedDrawing = null;
        }
      }

      return {
        ocr: {
          ...visionOut.ocr,
          enhanceMode: safeEnhance
        },
        drawing: detectedDrawing || { detected: false, cropBoxPct: null, asset: null }
      };
    } catch (err) {
      if (ocrEngine === 'vision_ai') {
        throw err;
      }
      // In 'auto' mode, gracefully fall back to local PP-OCRv5 neural engine
    }
  }

  // Local Offline PP-OCRv5 Neural Engine (serialized on single ONNX WASM session)
  const runNeuralPass = async (rgbInput) =>
    new Promise((resolve, reject) => {
      ocrQueue = ocrQueue
        .catch(() => {})
        .then(async () => {
          try {
            const svc = await getPaddleOcrInstance();
            const rawItems = await svc.recognize({
              width: rgbInput.width,
              height: rgbInput.height,
              data: rgbInput.data
            });
            resolve(
              reconstructTextAndBoxes(
                rawItems,
                rgbInput.padPx,
                rgbInput.innerWidth,
                rgbInput.innerHeight
              )
            );
          } catch (e) {
            reject(e);
          }
        });
    });

  // Primary pass: illumination-flattened image for shadow/light_ink, or natural normalized for standard
  const primaryInput =
    safeEnhance === 'standard'
      ? await buildNaturalNormalizedRgb(basePngBuffer)
      : await buildIlluminationFlattenedRgb(basePngBuffer, safeEnhance);

  let bestPass = await runNeuralPass(primaryInput);

  // Automatic fallback pass: if standard photo had strong shadows or faint pen strokes (low confidence or tiny output),
  // automatically run illumination-flattened enhancement and keep whichever pass extracted cleaner text!
  const scoreOf = (p) => (p.avgConfidence / 100) * Math.sqrt(Math.max(1, p.text.replace(/\s+/g, '').length));
  if (safeEnhance === 'standard' && (bestPass.avgConfidence < 78 || bestPass.text.length < 18)) {
    const flattenedInput = await buildIlluminationFlattenedRgb(basePngBuffer, 'light_ink');
    const secondPass = await runNeuralPass(flattenedInput);
    if (scoreOf(secondPass) > scoreOf(bestPass) * 1.05) {
      bestPass = secondPass;
    }
  }

  const parsed = parseScannedLetterText(bestPass.text);

  // Automatic drawing detection on shadow-flattened sheet with text boxes masked out
  let detectedDrawing = null;
  if (detectDrawing) {
    try {
      const boxPct = await detectNonTextDrawingBox(
        basePngBuffer,
        innerWidth,
        innerHeight,
        bestPass.textBoxes,
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
      detectedDrawing = null;
    }
  }

  return {
    ocr: {
      engine: 'pp-ocrv5-neural',
      language: lang === 'spa+eng' || lang === 'eng' ? lang : 'spa',
      confidence: bestPass.avgConfidence,
      enhanceMode: safeEnhance,
      fullText: parsed.fullText,
      suggestedTitle: parsed.suggestedTitle,
      suggestedText: parsed.suggestedText,
      suggestedSignature: parsed.suggestedSignature,
      lineCount: parsed.lineCount,
      wordCount: parsed.wordCount,
      textBlockCount: bestPass.textBoxes.length
    },
    drawing: detectedDrawing || {
      detected: false,
      cropBoxPct: null,
      asset: null
    }
  };
}

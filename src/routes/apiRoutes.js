import { Router } from 'express';
import {
  listBooks,
  getBookById,
  createBook,
  updateBook,
  duplicateBook,
  deleteBook,
  resetSeedBook
} from '../models/bookRepository.js';
import {
  computeFormatGeometry,
  getRecommendedSlotSpecs
} from '../shared/formatSpecs.js';
import {
  uploadSingleImage,
  validateImageMagicBytes
} from '../middlewares/uploadSecurity.js';
import {
  ILLUSTRATIONS_CATALOG,
  getIllustrationById,
  listIllustrationsByCategory
} from '../shared/illustrationsCatalog.js';
import {
  analyzePoemAndSuggest,
  splitPoemIntoPages
} from '../shared/poemMatcher.js';
import { processImageToEngraving } from '../services/engravingService.js';
import {
  searchOnlineIllustrations,
  importOnlineImageAsEngraving
} from '../services/onlineArtService.js';
import { imposeBookSpreads } from '../shared/impositionEngine.js';
import { generatePressPdf, generateGuidePdf } from '../services/pdfService.js';
import { scanPaperLetter, extractDrawingCrop } from '../services/paperScannerService.js';

import path from 'node:path';

const ENGRAVINGS_OUTPUT_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(process.cwd(), 'storage/engravings');

const router = Router();

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toAsciiSlug(value, fallback = 'poemario') {
  const cleaned = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned || fallback;
}

// Health check
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    phase: 5,
    app: 'switch-lit-poetry-press'
  });
});

// Books CRUD & seed
router.get('/books', asyncHandler(async (_req, res) => {
  const books = await listBooks();
  res.json({ books });
}));

router.post('/books', asyncHandler(async (req, res) => {
  const book = await createBook(req.body || {});
  res.status(201).json({ book });
}));

router.post('/books/seed', asyncHandler(async (_req, res) => {
  const book = await resetSeedBook();
  res.json({ book });
}));

router.get('/books/:id', asyncHandler(async (req, res) => {
  const book = await getBookById(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Poemario no encontrado.' });
  }
  return res.json({ book });
}));

router.put('/books/:id', asyncHandler(async (req, res) => {
  const book = await updateBook(req.params.id, req.body || {});
  if (!book) {
    return res.status(404).json({ error: 'Poemario no encontrado.' });
  }
  return res.json({ book });
}));

router.post('/books/:id/duplicate', asyncHandler(async (req, res) => {
  const book = await duplicateBook(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Poemario original no encontrado.' });
  }
  return res.status(201).json({ book });
}));

router.delete('/books/:id', asyncHandler(async (req, res) => {
  const deleted = await deleteBook(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Poemario no encontrado.' });
  }
  return res.json({ ok: true });
}));

// Imposition for saved book & live preview
router.get('/books/:id/imposition', asyncHandler(async (req, res) => {
  const book = await getBookById(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Poemario no encontrado.' });
  }

  const parsedWidth = req.query.customWidthMm !== undefined && req.query.customWidthMm !== ''
    ? Number(req.query.customWidthMm)
    : book.customWidthMm;
  const parsedHeight = req.query.customHeightMm !== undefined && req.query.customHeightMm !== ''
    ? Number(req.query.customHeightMm)
    : book.customHeightMm;

  const imposition = imposeBookSpreads({
    pages: Array.isArray(book.pages) ? book.pages : [],
    paperId: req.query.paperId ? String(req.query.paperId) : (book.paperId || 'A4'),
    formatId: req.query.formatId ? String(req.query.formatId) : (book.formatId || 'saddle_half'),
    customWidthMm: parsedWidth,
    customHeightMm: parsedHeight
  });

  return res.json({
    ok: true,
    bookId: book.id,
    bookTitle: book.title,
    imposition
  });
}));

// Zero-config 1:1 press PDF & A4 folding guide PDF exports
router.get('/books/:id/export/press.pdf', asyncHandler(async (req, res) => {
  const book = await getBookById(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Poemario no encontrado.' });
  }

  try {
    const buffer = await generatePressPdf(book);
    const slug = toAsciiSlug(book.title, book.id || 'poemario');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}-imprenta.pdf"`);
    res.setHeader('Content-Length', String(buffer.length));
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'No se pudo generar el PDF de imprenta.' });
  }
}));

router.get('/books/:id/export/guide.pdf', asyncHandler(async (req, res) => {
  const book = await getBookById(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Poemario no encontrado.' });
  }

  try {
    const buffer = await generateGuidePdf(book);
    const slug = toAsciiSlug(book.title, book.id || 'poemario');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}-guia-armado.pdf"`);
    res.setHeader('Content-Length', String(buffer.length));
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'No se pudo generar la guía de armado en PDF.' });
  }
}));

router.post('/imposition/preview', (req, res) => {
  const {
    pages,
    pageCount,
    paperId = 'A4',
    formatId = 'saddle_half',
    customWidthMm,
    customHeightMm
  } = req.body || {};

  let inputPages = [];
  if (Array.isArray(pages) && pages.length > 0) {
    inputPages = pages;
  } else if (Number.isFinite(Number(pageCount)) && Number(pageCount) > 0) {
    const clampedCount = Math.max(1, Math.min(128, Math.round(Number(pageCount))));
    inputPages = Array.from({ length: clampedCount }, (_, idx) => ({
      id: idx + 1,
      role: `Página ${idx + 1}`,
      title: '',
      text: ''
    }));
  }

  const imposition = imposeBookSpreads({
    pages: inputPages,
    paperId: String(paperId || 'A4'),
    formatId: String(formatId || 'saddle_half'),
    customWidthMm: customWidthMm !== undefined && customWidthMm !== '' ? Number(customWidthMm) : undefined,
    customHeightMm: customHeightMm !== undefined && customHeightMm !== '' ? Number(customHeightMm) : undefined
  });

  res.json({ ok: true, imposition });
});

// Physical format geometry & 300-DPI slot specs
router.get('/formats/specs', (req, res) => {
  const {
    paperId = 'A4',
    formatId = 'saddle_half',
    customWidthMm,
    customHeightMm,
    layoutId = 'butterflies',
    fontSize = '12.5pt'
  } = req.query;

  const parsedWidth = customWidthMm !== undefined && customWidthMm !== ''
    ? Number(customWidthMm)
    : undefined;
  const parsedHeight = customHeightMm !== undefined && customHeightMm !== ''
    ? Number(customHeightMm)
    : undefined;

  const geometry = computeFormatGeometry({
    paperId: String(paperId),
    formatId: String(formatId),
    customWidthMm: parsedWidth,
    customHeightMm: parsedHeight
  });

  const slotSpecs = getRecommendedSlotSpecs({
    paperId: String(paperId),
    formatId: String(formatId),
    customWidthMm: parsedWidth,
    customHeightMm: parsedHeight,
    layoutId: String(layoutId),
    fontSize: String(fontSize)
  });

  res.json({ geometry, slotSpecs });
});

// Built-in B&W SVG illustrations catalog
router.get('/illustrations', (req, res) => {
  const { category, q } = req.query;
  const catStr = typeof category === 'string' ? category.trim() : '';

  let list;
  if (catStr && catStr !== 'all' && catStr !== 'todas' && catStr !== 'todos') {
    const filtered = typeof listIllustrationsByCategory === 'function'
      ? listIllustrationsByCategory(catStr)
      : [];
    list = Array.isArray(filtered) ? [...filtered] : Object.values(filtered || {});
  } else {
    list = Array.isArray(ILLUSTRATIONS_CATALOG)
      ? [...ILLUSTRATIONS_CATALOG]
      : Object.values(ILLUSTRATIONS_CATALOG || {});
  }

  const queryNorm = normalizeSearchText(q);
  if (queryNorm) {
    list = list.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      const tags = Array.isArray(item.tags) ? item.tags.join(' ') : '';
      const keywords = Array.isArray(item.keywords) ? item.keywords.join(' ') : '';
      const haystack = normalizeSearchText(
        `${item.id || ''} ${item.name || ''} ${item.title || ''} ${item.category || ''} ${item.description || ''} ${tags} ${keywords}`
      );
      return haystack.includes(queryNorm);
    });
  }

  res.json({ illustrations: list });
});

router.get('/illustrations/:id', (req, res) => {
  const illustration = getIllustrationById(req.params.id);
  if (!illustration) {
    return res.status(404).json({ error: 'Ilustración no encontrada.' });
  }
  return res.json({ illustration });
});

// Semantic poem analyzer & page splitter
router.post('/poems/analyze', asyncHandler(async (req, res) => {
  const {
    text = '',
    paperId = 'A4',
    formatId = 'saddle_half',
    customWidthMm,
    customHeightMm,
    currentLayoutId,
    fontSize
  } = req.body || {};

  const analysis = await Promise.resolve(analyzePoemAndSuggest({
    text: typeof text === 'string' ? text : String(text ?? ''),
    paperId,
    formatId,
    customWidthMm: customWidthMm !== undefined ? Number(customWidthMm) : undefined,
    customHeightMm: customHeightMm !== undefined ? Number(customHeightMm) : undefined,
    currentLayoutId,
    fontSize
  }));

  res.json(analysis);
}));

router.post('/poems/split', asyncHandler(async (req, res) => {
  const {
    text = '',
    maxLinesPerPage,
    paperId = 'A4',
    formatId = 'saddle_half',
    customWidthMm,
    customHeightMm,
    layoutId = 'diptych_poem',
    fontSize = '12.5pt'
  } = req.body || {};

  const slot = getRecommendedSlotSpecs({
    paperId,
    formatId,
    customWidthMm: customWidthMm !== undefined ? Number(customWidthMm) : undefined,
    customHeightMm: customHeightMm !== undefined ? Number(customHeightMm) : undefined,
    layoutId,
    fontSize
  });

  const chunks = await Promise.resolve(
    splitPoemIntoPages(
      typeof text === 'string' ? text : String(text ?? ''),
      Number(maxLinesPerPage) || slot.maxLines
    )
  );

  res.json({ ok: true, pages: chunks, maxLinesPerPage: Number(maxLinesPerPage) || slot.maxLines });
}));

// Image upload & B&W ink/Atkinson engraving conversion
router.post(
  '/art/engrave-upload',
  uploadSingleImage,
  validateImageMagicBytes,
  asyncHandler(async (req, res) => {
    const { mode, widthPx, heightPx, fit } = req.body || {};
    const asset = await processImageToEngraving({
      buffer: req.file.buffer,
      mode: mode || 'ink',
      widthPx: Number(widthPx) || 600,
      heightPx: Number(heightPx) || 800,
      fit: fit || 'contain',
      outputDir: ENGRAVINGS_OUTPUT_DIR
    });
    res.json({ ok: true, asset });
  })
);

// Online public-domain art search & engraving import
router.post('/art/online-search', asyncHandler(async (req, res) => {
  const { query = '', poemText = '', style, limit } = req.body || {};
  const parsedLimit = Math.max(1, Math.min(30, Number(limit) || 12));
  const result = await searchOnlineIllustrations({
    query: typeof query === 'string' ? query.trim() : '',
    poemText: typeof poemText === 'string' ? poemText : '',
    style: typeof style === 'string' && style.trim() ? style.trim() : undefined,
    limit: parsedLimit
  });

  if (Array.isArray(result)) {
    return res.json({ ok: true, results: result });
  }
  return res.json(result && typeof result === 'object' ? result : { ok: true, results: [] });
}));

router.post('/art/online-import', asyncHandler(async (req, res) => {
  const { imageUrl, mode, widthPx, heightPx, fit } = req.body || {};
  if (!imageUrl || typeof imageUrl !== 'string' || !/^https?:\/\//i.test(imageUrl.trim())) {
    return res.status(400).json({
      error: 'Ingresá una URL de imagen válida (http o https).'
    });
  }

  const asset = await importOnlineImageAsEngraving({
    imageUrl: imageUrl.trim(),
    mode: mode || 'engraving',
    widthPx: Number(widthPx) || 600,
    heightPx: Number(heightPx) || 800,
    fit: fit || 'contain',
    outputDir: ENGRAVINGS_OUTPUT_DIR
  });

  return res.json({ ok: true, asset });
}));

// Paper letter scanner (OCR text + automatic drawing extraction)
router.post(
  '/scan/letter',
  uploadSingleImage,
  validateImageMagicBytes,
  asyncHandler(async (req, res) => {
    const {
      lang = 'spa',
      enhanceMode = 'standard',
      detectDrawing = 'true',
      drawingMode = 'ink',
      widthPx,
      heightPx
    } = req.body || {};

    const shouldDetect =
      detectDrawing === true ||
      detectDrawing === 'true' ||
      detectDrawing === '1' ||
      detectDrawing === 'on';

    const result = await scanPaperLetter({
      buffer: req.file.buffer,
      lang: typeof lang === 'string' ? lang : 'spa',
      enhanceMode: typeof enhanceMode === 'string' ? enhanceMode : 'standard',
      detectDrawing: shouldDetect,
      drawingMode: typeof drawingMode === 'string' ? drawingMode : 'ink',
      widthPx: Number(widthPx) || 640,
      heightPx: Number(heightPx) || 640,
      outputDir: ENGRAVINGS_OUTPUT_DIR
    });

    res.json({ ok: true, ...result });
  })
);

// Manual crop extraction of a drawing from a photographed letter
router.post(
  '/scan/extract-drawing',
  uploadSingleImage,
  validateImageMagicBytes,
  asyncHandler(async (req, res) => {
    const { xPct, yPct, widthPct, heightPct, mode = 'ink', widthPx, heightPx } = req.body || {};

    const result = await extractDrawingCrop({
      buffer: req.file.buffer,
      cropBoxPct: {
        xPct: Number(xPct),
        yPct: Number(yPct),
        widthPct: Number(widthPct),
        heightPct: Number(heightPct)
      },
      mode: typeof mode === 'string' ? mode : 'ink',
      widthPx: Number(widthPx) || 640,
      heightPx: Number(heightPx) || 640,
      outputDir: ENGRAVINGS_OUTPUT_DIR
    });

    res.json({ ok: true, ...result });
  })
);

export default router;

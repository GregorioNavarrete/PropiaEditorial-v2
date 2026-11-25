/**
 * Deterministic physical geometry & 300-DPI slot calculator for all book formats,
 * paper sheets, and editorial page layouts.
 * Pure isomorphic ES Module (works in both Node.js and Browser).
 */

import { PAPER_SHEETS, BOOK_FORMATS, PAGE_LAYOUTS } from './contracts.js';

export const MM_PER_INCH = 25.4;
export const PRINT_DPI = 300;
export const MM_TO_PT = 72 / MM_PER_INCH; // 2.834645669291339 pt/mm

/**
 * Converts millimeters to pixels at 300 DPI (standard offset/laser print quality).
 */
export function mmToPx300Dpi(mm) {
  return Math.max(1, Math.round((Number(mm) / MM_PER_INCH) * PRINT_DPI));
}

/**
 * Converts millimeters to exact PostScript points.
 */
export function mmToPt(mm) {
  return Number(mm) * MM_TO_PT;
}

/**
 * Computes a simplified human-readable aspect ratio label (e.g., "1 : 2.5 Vertical" or "1 : 1 Cuadrado").
 */
export function describeAspectRatio(widthMm, heightMm) {
  if (!widthMm || !heightMm) return '1 : 1';
  const ratio = widthMm / heightMm;
  if (Math.abs(ratio - 1) <= 0.08) {
    return '1 : 1 (Cuadrado)';
  }
  if (ratio < 1) {
    const inv = (heightMm / widthMm).toFixed(1).replace(/\.0$/, '');
    return `1 : ${inv} (Vertical)`;
  }
  const dir = ratio.toFixed(1).replace(/\.0$/, '');
  return `${dir} : 1 (Horizontal)`;
}

/**
 * Base slot ratios relative to a standard A5 reference trim page (148.5 mm × 210 mm).
 * Every format (A5, A6 pocket, 1-sheet zine, or custom mm×mm) scales slots proportionally
 * so layouts keep harmonious editorial balance while reporting exact physical mm & 300-DPI px!
 */
const A5_REF_WIDTH_MM = 148.5;
const A5_REF_HEIGHT_MM = 210;

const LAYOUT_SLOT_PROPORTIONS = {
  cover: {
    wRatio: 46 / A5_REF_WIDTH_MM,
    hRatio: 46 / A5_REF_HEIGHT_MM,
    maxLinesBase: 8,
    maxCharsBase: 36,
    slotLabel: 'Emblema central de portada',
    placementHint: 'Centrado arriba del título principal con amplio margen blanco.'
  },
  dedication: {
    wRatio: 26 / A5_REF_WIDTH_MM,
    hRatio: 26 / A5_REF_HEIGHT_MM,
    maxLinesBase: 12,
    maxCharsBase: 38,
    slotLabel: 'Viñeta íntima opcional',
    placementHint: 'Ornamento sutil sobre la dedicatoria centrada.'
  },
  butterflies: {
    wRatio: 48 / A5_REF_WIDTH_MM,
    hRatio: 58 / A5_REF_HEIGHT_MM,
    secondaryWRatio: 42 / A5_REF_WIDTH_MM,
    secondaryHRatio: 26 / A5_REF_HEIGHT_MM,
    maxLinesBase: 19,
    maxCharsBase: 34,
    slotLabel: 'Escena inferior derecha (+ viñeta superior)',
    placementHint: 'Ilustración principal abajo a la derecha acompañando el cierre del poema.'
  },
  klimt: {
    wRatio: 52 / A5_REF_WIDTH_MM,
    hRatio: 132 / A5_REF_HEIGHT_MM,
    maxLinesBase: 22,
    maxCharsBase: 29,
    slotLabel: 'Cuadro vertical enmarcado (derecha)',
    placementHint: 'Columna ilustrada vertical con filete negro de 1.5px al lado de los versos.'
  },
  baroque: {
    wRatio: 46 / A5_REF_WIDTH_MM,
    hRatio: 46 / A5_REF_HEIGHT_MM,
    secondaryWRatio: 50 / A5_REF_WIDTH_MM,
    secondaryHRatio: 50 / A5_REF_HEIGHT_MM,
    maxLinesBase: 18,
    maxCharsBase: 36,
    slotLabel: 'Grabado inferior derecho (+ esquinero superior)',
    placementHint: 'Equilibra el esquinero floral superior izquierdo con una figura al pie.'
  },
  starboy: {
    wRatio: 45 / A5_REF_WIDTH_MM,
    hRatio: 86 / A5_REF_HEIGHT_MM,
    maxLinesBase: 22,
    maxCharsBase: 31,
    slotLabel: 'Silueta vertical derecha',
    placementHint: 'Figura esbelta de alto contraste a la derecha del cuerpo poético.'
  },
  cupid: {
    wRatio: 42 / A5_REF_WIDTH_MM,
    hRatio: 38 / A5_REF_HEIGHT_MM,
    maxLinesBase: 25,
    maxCharsBase: 42,
    slotLabel: 'Viñeta flotante superior derecha',
    placementHint: 'Deja libre casi todo el ancho inferior para poemas de estrofas largas.'
  },
  sacredheart: {
    wRatio: 45 / A5_REF_WIDTH_MM,
    hRatio: 58 / A5_REF_HEIGHT_MM,
    secondaryWRatio: 36 / A5_REF_WIDTH_MM,
    secondaryHRatio: 40 / A5_REF_HEIGHT_MM,
    maxLinesBase: 19,
    maxCharsBase: 33,
    slotLabel: 'Ilustración botánica inferior (+ símbolo arriba)',
    placementHint: 'Composición diagonal entre el emblema superior y las flores al pie.'
  },
  diptych_poem: {
    wRatio: 28 / A5_REF_WIDTH_MM,
    hRatio: 22 / A5_REF_HEIGHT_MM,
    maxLinesBase: 28,
    maxCharsBase: 44,
    slotLabel: 'Remate editorial al pie',
    placementHint: 'Máxima capacidad de lectura para poemas extensos o dípticos enfrentados.'
  },
  backcover: {
    wRatio: 34 / A5_REF_WIDTH_MM,
    hRatio: 26 / A5_REF_HEIGHT_MM,
    maxLinesBase: 8,
    maxCharsBase: 36,
    slotLabel: ' Sello de contratapa',
    placementHint: ' Grabado pequeño de cierre centrado sobre los versos finales y colofón.'
  }
};

/**
 * Computes exact physical page trim size, sheet orientation, N-up grid, and margins
 * for any combination of paper sheet + book format + optional custom dimensions.
 */
export function computeFormatGeometry({
  paperId = 'A4',
  formatId = 'saddle_half',
  customWidthMm = 100,
  customHeightMm = 140
} = {}) {
  const sheet = PAPER_SHEETS[paperId] || PAPER_SHEETS.A4;
  const format = BOOK_FORMATS[formatId] || BOOK_FORMATS.saddle_half;

  let pageWidthMm;
  let pageHeightMm;
  let sheetOrientation; // 'landscape' | 'portrait'
  let cols;
  let rows;
  let sheetRenderWidthMm;
  let sheetRenderHeightMm;

  if (format.id === 'saddle_half') {
    // Landscape sheet folded in half along vertical center line
    sheetOrientation = 'landscape';
    sheetRenderWidthMm = sheet.heightMm; // e.g., 297 mm on A4
    sheetRenderHeightMm = sheet.widthMm; // e.g., 210 mm on A4
    cols = 2;
    rows = 1;
    pageWidthMm = Number((sheetRenderWidthMm / 2).toFixed(2));
    pageHeightMm = Number(sheetRenderHeightMm.toFixed(2));
  } else if (format.id === 'pocket_quarter') {
    // Portrait sheet: 2 columns x 2 rows (4 pages per side = 8 pages per sheet)
    sheetOrientation = 'portrait';
    sheetRenderWidthMm = sheet.widthMm; // 210 mm on A4
    sheetRenderHeightMm = sheet.heightMm; // 297 mm on A4
    cols = 2;
    rows = 2;
    pageWidthMm = Number((sheetRenderWidthMm / 2).toFixed(2)); // 105 mm
    pageHeightMm = Number((sheetRenderHeightMm / 2).toFixed(2)); // 148.5 mm
  } else if (format.id === 'single_sheet_zine') {
    // Landscape sheet: 4 columns x 2 rows = 8 pages on 1 single side!
    sheetOrientation = 'landscape';
    sheetRenderWidthMm = sheet.heightMm; // 297 mm on A4
    sheetRenderHeightMm = sheet.widthMm; // 210 mm on A4
    cols = 4;
    rows = 2;
    pageWidthMm = Number((sheetRenderWidthMm / 4).toFixed(2)); // 74.25 mm on A4, 105 mm on A3
    pageHeightMm = Number((sheetRenderHeightMm / 2).toFixed(2)); // 105 mm on A4, 148.5 mm on A3
  } else {
    // Custom user dimensions (mm x mm) — choose sheet orientation that fits the most pages!
    const safeMarginMm = 5;
    const w = Math.max(45, Math.min(sheet.widthMm - 10, Number(customWidthMm) || 100));
    const h = Math.max(60, Math.min(sheet.heightMm - 10, Number(customHeightMm) || 140));
    pageWidthMm = Number(w.toFixed(2));
    pageHeightMm = Number(h.toFixed(2));

    const portraitCols = Math.max(1, Math.floor((sheet.widthMm - safeMarginMm * 2) / pageWidthMm));
    const portraitRows = Math.max(1, Math.floor((sheet.heightMm - safeMarginMm * 2) / pageHeightMm));
    const landscapeCols = Math.max(1, Math.floor((sheet.heightMm - safeMarginMm * 2) / pageWidthMm));
    const landscapeRows = Math.max(1, Math.floor((sheet.widthMm - safeMarginMm * 2) / pageHeightMm));

    if (landscapeCols * landscapeRows > portraitCols * portraitRows) {
      sheetOrientation = 'landscape';
      sheetRenderWidthMm = sheet.heightMm;
      sheetRenderHeightMm = sheet.widthMm;
      cols = landscapeCols;
      rows = landscapeRows;
    } else {
      sheetOrientation = 'portrait';
      sheetRenderWidthMm = sheet.widthMm;
      sheetRenderHeightMm = sheet.heightMm;
      cols = portraitCols;
      rows = portraitRows;
    }
  }

  const scaleVsA5 = Math.min(pageWidthMm / A5_REF_WIDTH_MM, pageHeightMm / A5_REF_HEIGHT_MM);
  const safeMarginVerticalMm = Number(Math.max(6, Math.round(15 * scaleVsA5 * 10) / 10).toFixed(1));
  const safeMarginHorizontalMm = Number(Math.max(5.5, Math.round(13.5 * scaleVsA5 * 10) / 10).toFixed(1));

  return {
    paperId: sheet.id,
    paperName: sheet.name,
    formatId: format.id,
    formatName: format.name,
    shortLabel: format.shortLabel,
    sheetOrientation,
    sheetWidthMm: sheetRenderWidthMm,
    sheetHeightMm: sheetRenderHeightMm,
    sheetWidthPt: Number(mmToPt(sheetRenderWidthMm).toFixed(2)),
    sheetHeightPt: Number(mmToPt(sheetRenderHeightMm).toFixed(2)),
    pageWidthMm,
    pageHeightMm,
    pageWidthPx300: mmToPx300Dpi(pageWidthMm),
    pageHeightPx300: mmToPx300Dpi(pageHeightMm),
    pageWidthPt: Number(mmToPt(pageWidthMm).toFixed(2)),
    pageHeightPt: Number(mmToPt(pageHeightMm).toFixed(2)),
    cols,
    rows,
    pagesPerSide: cols * rows,
    pagesPerSheet: format.duplex ? cols * rows * 2 : cols * rows,
    pagesMultiple: format.id === 'custom_nup' ? 2 : format.pagesMultiple,
    duplex: format.duplex,
    flipEdge: format.flipEdge,
    requiresCut: format.requiresCut,
    bindingMethod: format.bindingMethod,
    summary: format.summary,
    scaleVsA5: Number(scaleVsA5.toFixed(3)),
    safeMarginVerticalMm,
    safeMarginHorizontalMm
  };
}

/**
 * Returns exact recommended illustration slot dimensions (in mm and px @ 300 DPI)
 * and poem line/character capacity for a specific format + layout combination.
 */
export function getRecommendedSlotSpecs({
  paperId = 'A4',
  formatId = 'saddle_half',
  customWidthMm = 100,
  customHeightMm = 140,
  layoutId = 'butterflies',
  fontSize = '12.5pt'
} = {}) {
  const geo = computeFormatGeometry({ paperId, formatId, customWidthMm, customHeightMm });
  const layout = PAGE_LAYOUTS[layoutId] || PAGE_LAYOUTS.butterflies;
  const prop = LAYOUT_SLOT_PROPORTIONS[layout.id] || LAYOUT_SLOT_PROPORTIONS.butterflies;

  const widthMm = Number((geo.pageWidthMm * prop.wRatio).toFixed(1));
  const heightMm = Number((geo.pageHeightMm * prop.hRatio).toFixed(1));
  const widthPx = mmToPx300Dpi(widthMm);
  const heightPx = mmToPx300Dpi(heightMm);

  const fontPt = parseFloat(fontSize) || 12.5;
  const fontFactor = 12.5 / fontPt;
  const maxLines = Math.max(6, Math.floor(prop.maxLinesBase * geo.scaleVsA5 * fontFactor));
  const maxCharsPerLine = Math.max(20, Math.floor(prop.maxCharsBase * Math.sqrt(geo.scaleVsA5) * fontFactor));

  let secondarySlot = null;
  if (prop.secondaryWRatio && prop.secondaryHRatio) {
    const secW = Number((geo.pageWidthMm * prop.secondaryWRatio).toFixed(1));
    const secH = Number((geo.pageHeightMm * prop.secondaryHRatio).toFixed(1));
    secondarySlot = {
      widthMm: secW,
      heightMm: secH,
      widthPx: mmToPx300Dpi(secW),
      heightPx: mmToPx300Dpi(secH),
      aspectRatioLabel: describeAspectRatio(secW, secH)
    };
  }

  // Ideal font size recommendation for this format size
  let recommendedFontSize = '12.5pt';
  if (geo.scaleVsA5 <= 0.56) {
    recommendedFontSize = '9.5pt';
  } else if (geo.scaleVsA5 <= 0.75) {
    recommendedFontSize = '11pt';
  }

  return {
    layoutId: layout.id,
    layoutName: layout.name,
    slotLabel: prop.slotLabel,
    placementHint: prop.placementHint,
    widthMm,
    heightMm,
    widthPx,
    heightPx,
    dpi: PRINT_DPI,
    aspectRatioLabel: describeAspectRatio(widthMm, heightMm),
    secondarySlot,
    maxLines,
    maxCharsPerLine,
    recommendedFontSize,
    pageWidthMm: geo.pageWidthMm,
    pageHeightMm: geo.pageHeightMm,
    formatShortLabel: geo.shortLabel,
    paperId: geo.paperId
  };
}

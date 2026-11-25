import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import {
  PAGE_LAYOUTS,
  normalizeExtraImage
} from '../shared/contracts.js';
import {
  mmToPt,
  getRecommendedSlotSpecs
} from '../shared/formatSpecs.js';
import { getIllustrationById } from '../shared/illustrationsCatalog.js';
import { imposeBookSpreads } from '../shared/impositionEngine.js';

const WINANSI_EXTENDED_MAP = {
  0x20AC: true, // €
  0x201A: true, // ‚
  0x0192: true, // ƒ
  0x201E: true, // „
  0x2026: true, // …
  0x2020: true, // †
  0x2021: true, // ‡
  0x02C6: true, // ˆ
  0x2030: true, // ‰
  0x0160: true, // Š
  0x2039: true, // ‹
  0x0152: true, // Œ
  0x017D: true, // Ž
  0x2018: true, // ‘
  0x2019: true, // ’
  0x201C: true, // “
  0x201D: true, // ”
  0x2022: true, // •
  0x2013: true, // –
  0x2014: true, // —
  0x02DC: true, // ˜
  0x2122: true, // ™
  0x0161: true, // š
  0x203A: true, // ›
  0x0153: true, // œ
  0x017E: true, // ž
  0x0178: true  // Ÿ
};

/**
 * Sanitizes text for PDFKit standard WinAnsi fonts (removes emojis/non-WinAnsi glyphs safely).
 */
export function sanitizeWinAnsi(value) {
  if (value === null || value === undefined) return '';
  const normalized = String(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↑/g, '^')
    .replace(/↓/g, 'v')
    .replace(/↻/g, '(rotar)');

  let out = '';
  for (const ch of normalized) {
    const code = ch.codePointAt(0);
    if (
      code === 0x09 ||
      code === 0x0A ||
      (code >= 0x20 && code <= 0x7E) ||
      (code >= 0xA0 && code <= 0xFF) ||
      WINANSI_EXTENDED_MAP[code]
    ) {
      out += ch;
    }
  }
  return out.replace(/[ \t]+\n/g, '\n').trimEnd();
}

function collectPdfBuffer(doc, buildFn) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    try {
      buildFn(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function resolveFonts(fontId) {
  switch (fontId) {
    case 'font-serif-classic':
      return { body: 'Times-Roman', bold: 'Times-Bold', italic: 'Times-Italic' };
    case 'font-sans-clean':
      return { body: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique' };
    case 'font-mono-zine':
      return { body: 'Courier', bold: 'Courier-Bold', italic: 'Courier-Oblique' };
    case 'font-serif-italic':
    default:
      return { body: 'Times-Italic', bold: 'Times-Bold', italic: 'Times-Italic' };
  }
}

function resolveCustomImagePath(customImageUrl) {
  if (!customImageUrl || typeof customImageUrl !== 'string') return null;
  const filename = path.basename(customImageUrl.split('?')[0]);
  if (!filename) return null;

  const candidates = [];
  if (process.env.STORAGE_DIR) {
    candidates.push(path.resolve(process.env.STORAGE_DIR, 'engravings', filename));
    candidates.push(path.resolve(process.env.STORAGE_DIR, filename));
  }
  candidates.push(path.resolve(process.cwd(), 'storage', 'engravings', filename));

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Ignore fs errors and continue checking candidates
    }
  }
  return null;
}

function drawSvgSafely(doc, svgString, x, y, width, height) {
  if (!svgString || width <= 1 || height <= 1) return;
  try {
    doc.save();
    SVGtoPDF(doc, svgString, x, y, {
      width,
      height,
      preserveAspectRatio: 'xMidYMid meet'
    });
    doc.restore();
  } catch {
    try {
      doc.restore();
    } catch {
      // Ignore restore error
    }
  }
}

function drawCustomImageSafely(doc, customImageUrl, x, y, width, height, fitMode = 'contain') {
  const imgPath = resolveCustomImagePath(customImageUrl);
  if (!imgPath || width <= 1 || height <= 1) return false;
  try {
    doc.save();
    if (fitMode === 'cover') {
      doc.rect(x, y, width, height).clip();
      doc.image(imgPath, x, y, { cover: [width, height], align: 'center', valign: 'center' });
    } else {
      doc.image(imgPath, x, y, { fit: [width, height], align: 'center', valign: 'center' });
    }
    doc.restore();
    return true;
  } catch {
    try {
      doc.restore();
    } catch {
      // Ignore restore error
    }
    return false;
  }
}

function drawPrimaryArt(doc, page, layoutSpec, x, y, width, height) {
  if (page.customImageUrl) {
    const ok = drawCustomImageSafely(doc, page.customImageUrl, x, y, width, height, page.imageFit);
    if (ok) return;
  }
  const targetId = page.illustrationId || layoutSpec?.primaryDefaultId || null;
  if (!targetId) return;
  const art = getIllustrationById(targetId);
  if (art?.svg) {
    drawSvgSafely(doc, art.svg, x, y, width, height);
  }
}

function drawSecondaryArt(doc, page, layoutSpec, x, y, width, height) {
  const secId = page.secondaryIllustrationId || layoutSpec?.secondaryDefaultId || null;
  if (!secId) return;
  const art = getIllustrationById(secId);
  if (art?.svg) {
    drawSvgSafely(doc, art.svg, x, y, width, height);
  }
}

function drawExtraImages(doc, cell, page) {
  const extras = Array.isArray(page?.extraImages) ? page.extraImages : [];
  if (extras.length === 0) return;

  for (let i = 0; i < extras.length; i += 1) {
    try {
      const item = normalizeExtraImage(extras[i], i);
      const exW = cell.widthPt * (item.widthPct / 100);
      const exH = exW;
      const exX = cell.xPt + cell.widthPt * (item.xPct / 100);
      const exY = cell.yPt + cell.heightPt * (item.yPct / 100);

      doc.save();
      if (item.rotationDeg) {
        doc.rotate(item.rotationDeg, { origin: [exX + exW / 2, exY + exH / 2] });
      }
      if (item.kind === 'custom' && item.customImageUrl) {
        drawCustomImageSafely(doc, item.customImageUrl, exX, exY, exW, exH, 'contain');
      } else {
        const art = getIllustrationById(item.illustrationId || 'miniMoon');
        if (art?.svg) {
          drawSvgSafely(doc, art.svg, exX, exY, exW, exH);
        }
      }
      doc.restore();
    } catch {
      // Never fail PDF if one extra image fails
    }
  }
}

function drawTextSafely(doc, text, x, y, options = {}) {
  const clean = sanitizeWinAnsi(text);
  if (!clean) return;
  try {
    doc.text(clean, x, y, options);
  } catch {
    // Fallback: strip non-ASCII completely if PDFKit throws on any edge glyph
    const asciiSafe = clean.replace(/[^\x20-\x7E\n]/g, '');
    if (asciiSafe) {
      doc.text(asciiSafe, x, y, options);
    }
  }
}

function renderCellPage(doc, cell, geometry, book) {
  const page = cell.page;
  if (!page || cell.isBlankPadding) return;

  const layoutKey = PAGE_LAYOUTS[page.layout] ? page.layout : 'butterflies';
  const layoutSpec = PAGE_LAYOUTS[layoutKey];
  const fonts = resolveFonts(page.font);

  const scaleVsA5 = Number(geometry?.scaleVsA5) || 1;
  const clampedScale = Math.max(0.56, Math.min(1.18, scaleVsA5));
  const rawPt = parseFloat(page.fontSize) || 12.5;
  const bodySize = Number((rawPt * clampedScale).toFixed(2));
  const titleSize = Number((bodySize * 1.28).toFixed(2));
  const sigSize = Number(Math.max(6, bodySize * 0.84).toFixed(2));
  const metaSize = Number(Math.max(5.5, bodySize * 0.72).toFixed(2));

  const padX = mmToPt(geometry.safeMarginHorizontalMm || 10);
  const padY = mmToPt(geometry.safeMarginVerticalMm || 12);
  const innerX = cell.xPt + padX;
  const innerY = cell.yPt + padY;
  const innerW = Math.max(20, cell.widthPt - padX * 2);
  const innerH = Math.max(20, cell.heightPt - padY * 2);

  const slotSpecs = getRecommendedSlotSpecs({
    paperId: geometry.paperId,
    formatId: geometry.formatId,
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm,
    layoutId: layoutKey,
    fontSize: page.fontSize || '12.5pt'
  });

  const primaryW = Math.min(innerW * 0.85, mmToPt(slotSpecs.widthMm));
  const primaryH = Math.min(innerH * 0.78, mmToPt(slotSpecs.heightMm));
  const secW = slotSpecs.secondarySlot ? Math.min(innerW * 0.65, mmToPt(slotSpecs.secondarySlot.widthMm)) : 0;
  const secH = slotSpecs.secondarySlot ? Math.min(innerH * 0.35, mmToPt(slotSpecs.secondarySlot.heightMm)) : 0;

  doc.fillColor('#000000');

  if (layoutKey === 'cover') {
    const eyebrow = sanitizeWinAnsi(page.subtitle || book.subtitle || 'Edición Artesanal en Tinta');
    doc.font(fonts.body).fontSize(metaSize);
    drawTextSafely(doc, eyebrow.toUpperCase(), innerX, innerY, {
      width: innerW,
      align: 'center',
      characterSpacing: 1.1
    });

    const artX = innerX + (innerW - primaryW) / 2;
    const artY = innerY + innerH * 0.14;
    if (page.customImageUrl || page.illustrationId || layoutSpec.primaryDefaultId) {
      drawPrimaryArt(doc, { ...page, illustrationId: page.illustrationId || 'sacredHeart' }, layoutSpec, artX, artY, primaryW, primaryH);
    }

    const titleY = artY + primaryH + Math.max(8, innerH * 0.04);
    doc.font(fonts.bold).fontSize(titleSize * 1.15);
    drawTextSafely(doc, page.title || book.title || 'Poemario', innerX, titleY, {
      width: innerW,
      align: 'center'
    });

    const ruleY = Math.min(innerY + innerH * 0.72, doc.y + 8);
    doc.save()
      .strokeColor('#000000')
      .lineWidth(0.75)
      .moveTo(innerX + innerW * 0.38, ruleY)
      .lineTo(innerX + innerW * 0.62, ruleY)
      .stroke()
      .restore();

    doc.font(fonts.body).fontSize(bodySize);
    drawTextSafely(doc, page.text || '', innerX + innerW * 0.06, ruleY + 10, {
      width: innerW * 0.88,
      align: 'center',
      lineGap: 2
    });

    if (page.signature) {
      doc.font(fonts.body).fontSize(metaSize);
      drawTextSafely(doc, sanitizeWinAnsi(page.signature).toUpperCase(), innerX, cell.yPt + cell.heightPt - padY - metaSize * 1.4, {
        width: innerW,
        align: 'center',
        characterSpacing: 1.2
      });
    }
  } else if (layoutKey === 'dedication') {
    let cursorY = innerY + innerH * 0.24;
    if (page.customImageUrl || page.illustrationId) {
      const miniW = Math.min(primaryW, innerW * 0.32);
      const miniH = Math.min(primaryH, innerH * 0.18);
      drawPrimaryArt(doc, page, layoutSpec, innerX + (innerW - miniW) / 2, cursorY - miniH - 10, miniW, miniH);
    }

    doc.font(fonts.body).fontSize(bodySize);
    drawTextSafely(doc, page.text || '', innerX + innerW * 0.08, cursorY, {
      width: innerW * 0.84,
      align: 'center',
      lineGap: 2.5
    });

    const afterTextY = Math.min(innerY + innerH * 0.78, doc.y + 10);
    doc.save()
      .strokeColor('#000000')
      .lineWidth(0.6)
      .moveTo(innerX + innerW * 0.43, afterTextY)
      .lineTo(innerX + innerW * 0.57, afterTextY)
      .stroke()
      .restore();

    if (page.signature) {
      doc.font(fonts.italic).fontSize(sigSize);
      drawTextSafely(doc, page.signature, innerX, afterTextY + 10, {
        width: innerW,
        align: 'center'
      });
    }
  } else if (layoutKey === 'klimt') {
    const colGap = Math.max(8, innerW * 0.05);
    const artW = Math.min(primaryW, innerW * 0.42);
    const artH = Math.min(primaryH, innerH * 0.88);
    const textW = Math.max(40, innerW - artW - colGap);

    let textY = innerY + innerH * 0.06;
    if (page.title) {
      doc.font(fonts.bold).fontSize(titleSize);
      drawTextSafely(doc, page.title, innerX, textY, { width: textW, align: 'left' });
      textY = doc.y + 6;
    }

    doc.font(fonts.body).fontSize(bodySize);
    drawTextSafely(doc, page.text || '', innerX, textY, {
      width: textW,
      align: 'left',
      lineGap: 2
    });

    if (page.signature) {
      doc.font(fonts.italic).fontSize(sigSize);
      drawTextSafely(doc, page.signature, innerX, Math.min(innerY + innerH - sigSize * 2, doc.y + 10), {
        width: textW,
        align: 'left'
      });
    }

    const frameX = innerX + textW + colGap;
    const frameY = innerY + (innerH - artH) / 2;
    doc.save().strokeColor('#000000').lineWidth(0.9).rect(frameX, frameY, artW, artH).stroke().restore();
    drawPrimaryArt(doc, page, layoutSpec, frameX + 2, frameY + 2, artW - 4, artH - 4);
  } else if (layoutKey === 'starboy') {
    if (page.signature) {
      doc.font(fonts.body).fontSize(sigSize);
      drawTextSafely(doc, page.signature, innerX, innerY, { width: innerW, align: 'center' });
    }
    const artW = Math.min(primaryW, innerW * 0.40);
    const artH = Math.min(primaryH, innerH * 0.68);
    const textW = Math.max(40, innerW - artW - 8);
    let textY = innerY + Math.max(16, innerH * 0.10);

    if (page.title) {
      doc.font(fonts.bold).fontSize(titleSize);
      drawTextSafely(doc, page.title, innerX, textY, { width: textW, align: 'left' });
      textY = doc.y + 6;
    }
    doc.font(fonts.body).fontSize(bodySize);
    drawTextSafely(doc, page.text || '', innerX, textY, {
      width: textW,
      align: 'left',
      lineGap: 2
    });

    drawPrimaryArt(doc, page, layoutSpec, innerX + innerW - artW, innerY + innerH - artH - 6, artW, artH);
  } else if (layoutKey === 'cupid') {
    const artW = Math.min(primaryW, innerW * 0.36);
    const artH = Math.min(primaryH, innerH * 0.25);
    drawPrimaryArt(doc, page, layoutSpec, innerX + innerW - artW, innerY, artW, artH);

    let textY = innerY + Math.max(12, artH * 0.35);
    const topWidth = Math.max(40, innerW - artW - 8);
    if (page.title) {
      doc.font(fonts.bold).fontSize(titleSize);
      drawTextSafely(doc, page.title, innerX, textY, { width: topWidth, align: 'left' });
      textY = doc.y + 6;
    }

    doc.font(fonts.body).fontSize(bodySize);
    drawTextSafely(doc, page.text || '', innerX, Math.max(textY, innerY + artH * 0.55), {
      width: innerW,
      align: 'left',
      lineGap: 2
    });

    if (page.signature) {
      doc.font(fonts.italic).fontSize(sigSize);
      drawTextSafely(doc, page.signature, innerX, Math.min(innerY + innerH - sigSize * 2, doc.y + 10), {
        width: innerW,
        align: 'left'
      });
    }
  } else if (layoutKey === 'diptych_poem') {
    let textY = innerY + innerH * 0.04;
    if (page.title) {
      doc.font(fonts.bold).fontSize(titleSize);
      drawTextSafely(doc, page.title, innerX, textY, { width: innerW, align: 'left' });
      textY = doc.y + 8;
    }

    doc.font(fonts.body).fontSize(bodySize);
    drawTextSafely(doc, page.text || '', innerX, textY, {
      width: innerW,
      align: 'left',
      lineGap: 2.2
    });

    const footerY = innerY + innerH - Math.max(primaryH, 24);
    if (page.signature) {
      doc.font(fonts.italic).fontSize(sigSize);
      drawTextSafely(doc, page.signature, innerX, footerY, { width: innerW * 0.65, align: 'left' });
    }
    drawPrimaryArt(doc, page, layoutSpec, innerX + (innerW - primaryW) / 2, innerY + innerH - primaryH, primaryW, primaryH);
  } else if (layoutKey === 'backcover') {
    const artX = innerX + (innerW - primaryW) / 2;
    const artY = innerY + innerH * 0.28;
    drawPrimaryArt(doc, page, layoutSpec, artX, artY, primaryW, primaryH);

    doc.font(fonts.body).fontSize(bodySize);
    drawTextSafely(doc, page.text || '', innerX + innerW * 0.1, artY + primaryH + 12, {
      width: innerW * 0.8,
      align: 'center',
      lineGap: 2
    });

    if (page.signature) {
      doc.font(fonts.body).fontSize(metaSize);
      drawTextSafely(doc, sanitizeWinAnsi(page.signature).toUpperCase(), innerX, cell.yPt + cell.heightPt - padY - metaSize * 1.4, {
        width: innerW,
        align: 'center',
        characterSpacing: 1.1
      });
    }
  } else {
    // butterflies, baroque, sacredheart (secondary ornament top + body + primary art bottom-right)
    let textTopY = innerY;
    if (secW > 0 && secH > 0) {
      const secX = layoutKey === 'baroque'
        ? innerX
        : innerX + (innerW - secW) / 2;
      drawSecondaryArt(doc, page, layoutSpec, secX, innerY, secW, secH);
      textTopY = innerY + secH + 6;
    }

    const bottomArtW = Math.min(primaryW, innerW * 0.46);
    const bottomArtH = Math.min(primaryH, innerH * 0.34);
    drawPrimaryArt(
      doc,
      page,
      layoutSpec,
      innerX + innerW - bottomArtW,
      innerY + innerH - bottomArtH - 4,
      bottomArtW,
      bottomArtH
    );

    let cursorY = textTopY;
    if (page.title) {
      doc.font(fonts.bold).fontSize(titleSize);
      drawTextSafely(doc, page.title, innerX, cursorY, { width: innerW, align: 'left' });
      cursorY = doc.y + 6;
    }

    doc.font(fonts.body).fontSize(bodySize);
    drawTextSafely(doc, page.text || '', innerX, cursorY, {
      width: innerW,
      align: 'left',
      lineGap: 2
    });

    if (page.signature) {
      doc.font(fonts.italic).fontSize(sigSize);
      drawTextSafely(doc, page.signature, innerX, Math.min(innerY + innerH - sigSize * 2, doc.y + 8), {
        width: Math.max(40, innerW - bottomArtW - 6),
        align: 'left'
      });
    }
  }

  // Free-positioned draggable extra images
  drawExtraImages(doc, cell, page);

  // Page folio number (small, centered at bottom)
  if (page.showPageNumber) {
    doc.font(fonts.body).fontSize(metaSize).fillColor('#222222');
    drawTextSafely(
      doc,
      String(cell.pageNumber ?? page.id ?? ''),
      cell.xPt + padX,
      cell.yPt + cell.heightPt - Math.max(8, padY * 0.6),
      { width: innerW, align: 'center' }
    );
  }
}

function drawPressGuideLines(doc, cutLinesMm = [], foldLinesMm = []) {
  for (const line of cutLinesMm) {
    try {
      doc.save()
        .strokeColor('#777777')
        .lineWidth(0.25)
        .dash(4, { space: 3 })
        .moveTo(line.x1Pt, line.y1Pt)
        .lineTo(line.x2Pt, line.y2Pt)
        .stroke()
        .undash()
        .restore();
    } catch {
      // Ignore single guide line failure
    }
  }

  for (const line of foldLinesMm) {
    try {
      doc.save()
        .strokeColor('#999999')
        .lineWidth(0.25)
        .dash(2, { space: 3 })
        .moveTo(line.x1Pt, line.y1Pt)
        .lineTo(line.x2Pt, line.y2Pt)
        .stroke()
        .undash()
        .restore();
    } catch {
      // Ignore single guide line failure
    }
  }
}

/**
 * Generates a zero-configuration 1:1 press PDF with exact sheet dimensions in PostScript points
 * and margin: 0.
 */
export async function generatePressPdf(book = {}, options = {}) {
  const compress = options.compress !== undefined
    ? Boolean(options.compress)
    : (process.env.PDF_NO_COMPRESS !== '1' && process.env.PDF_NO_COMPRESS !== 'true');

  const imposition = imposeBookSpreads({
    pages: Array.isArray(book.pages) ? book.pages : [],
    paperId: book.paperId || 'A4',
    formatId: book.formatId || 'saddle_half',
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm
  });

  const { geometry, sheets, cutLinesMm, foldLinesMm } = imposition;
  const defaultSheetW = sheets[0]?.sheetWidthPt || imposition.sheetWidthPt;
  const defaultSheetH = sheets[0]?.sheetHeightPt || imposition.sheetHeightPt;

  const doc = new PDFDocument({
    size: [defaultSheetW, defaultSheetH],
    margin: 0,
    autoFirstPage: false,
    compress,
    info: {
      Title: sanitizeWinAnsi(book.title || 'Poemario Editorial Personal'),
      Author: sanitizeWinAnsi(book.author || 'Editorial Personal'),
      Creator: 'Editorial Personal'
    }
  });

  return collectPdfBuffer(doc, (pdf) => {
    for (const sheet of sheets) {
      const wPt = sheet.sheetWidthPt || defaultSheetW;
      const hPt = sheet.sheetHeightPt || defaultSheetH;

      for (const side of sheet.sides) {
        pdf.addPage({ size: [wPt, hPt], margin: 0 });

        for (const cell of side.cells) {
          if (cell.isBlankPadding || !cell.page) continue;

          pdf.save();
          pdf.rect(cell.xPt, cell.yPt, cell.widthPt, cell.heightPt).clip();

          if (cell.rotationDeg === 180) {
            const cx = cell.xPt + cell.widthPt / 2;
            const cy = cell.yPt + cell.heightPt / 2;
            pdf.rotate(180, { origin: [cx, cy] });
          }

          renderCellPage(pdf, cell, geometry, book);
          pdf.restore();
        }

        if (side.sideType === 'front') {
          drawPressGuideLines(pdf, cutLinesMm, foldLinesMm);
        }
      }
    }
  });
}

/**
 * Generates an A4 portrait printer & folding guide PDF for the imposed book.
 */
export async function generateGuidePdf(book = {}, options = {}) {
  const compress = options.compress !== undefined
    ? Boolean(options.compress)
    : (process.env.PDF_NO_COMPRESS !== '1' && process.env.PDF_NO_COMPRESS !== 'true');

  const imposition = imposeBookSpreads({
    pages: Array.isArray(book.pages) ? book.pages : [],
    paperId: book.paperId || 'A4',
    formatId: book.formatId || 'saddle_half',
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm
  });

  const { geometry, sheets, cutLinesMm, foldLinesMm, printerSummary, foldingGuide } = imposition;
  const a4W = mmToPt(210);
  const a4H = mmToPt(297);
  const margin = 36;
  const contentW = a4W - margin * 2;

  const doc = new PDFDocument({
    size: [a4W, a4H],
    margin,
    compress,
    info: {
      Title: sanitizeWinAnsi(`Guía de Armado - ${book.title || 'Poemario Editorial Personal'}`),
      Author: sanitizeWinAnsi(book.author || 'Editorial Personal'),
      Creator: 'Editorial Personal'
    }
  });

  return collectPdfBuffer(doc, (pdf) => {
    // Header
    pdf.font('Helvetica-Bold').fontSize(9).fillColor('#444444');
    drawTextSafely(pdf, 'EDITORIAL PERSONAL · GUÍA TÉCNICA DE IMPRESIÓN Y ARMADO', margin, margin, {
      width: contentW,
      characterSpacing: 0.8
    });

    pdf.moveDown(0.35);
    pdf.font('Times-Bold').fontSize(18).fillColor('#000000');
    drawTextSafely(pdf, book.title || 'Poemario sin título', margin, pdf.y, { width: contentW });

    pdf.moveDown(0.2);
    pdf.font('Helvetica').fontSize(10).fillColor('#333333');
    const orientText = geometry.sheetOrientation === 'landscape' ? 'Apaisada (Horizontal)' : 'Vertical';
    drawTextSafely(
      pdf,
      `Formato: ${geometry.formatName} | Papel: ${geometry.paperName} (${orientText})`,
      margin,
      pdf.y,
      { width: contentW }
    );

    // Printer config box
    pdf.moveDown(0.7);
    const boxTop = pdf.y;
    const duplexLabel = !geometry.duplex
      ? 'Simple faz (1 sola cara)'
      : geometry.flipEdge === 'short'
        ? 'Doble faz — Voltear por el BORDE CORTO'
        : 'Doble faz — Voltear por el BORDE LARGO';

    const boxHeight = 84;
    pdf.save()
      .rect(margin, boxTop, contentW, boxHeight)
      .lineWidth(1)
      .strokeColor('#000000')
      .stroke()
      .restore();

    pdf.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
    drawTextSafely(pdf, 'CONFIGURACIÓN DE IMPRESORA (CERO-CONFIGURACIÓN)', margin + 10, boxTop + 8, {
      width: contentW - 20
    });
    pdf.font('Helvetica').fontSize(9).fillColor('#111111');
    drawTextSafely(
      pdf,
      `• Escala: 100% / Tamaño Real (NO marcar "Ajustar a página")   • Márgenes: 0 mm\n` +
      `• Impresión: ${duplexLabel}\n` +
      `• ${printerSummary}`,
      margin + 10,
      boxTop + 24,
      { width: contentW - 20, lineGap: 2 }
    );

    pdf.y = boxTop + boxHeight + 12;

    // Summary & dimensions
    pdf.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
    drawTextSafely(pdf, 'RESUMEN Y DIMENSIONES EXACTAS', margin, pdf.y, { width: contentW });
    pdf.moveDown(0.25);
    pdf.font('Helvetica').fontSize(9).fillColor('#222222');
    drawTextSafely(
      pdf,
      `• Hojas a imprimir: ${imposition.sheetCount} (${imposition.totalSheetSides} caras en el PDF de imprenta)\n` +
      `• Páginas del poemario: ${imposition.totalPages} · Páginas en blanco de relleno: ${imposition.blankPaddingCount}\n` +
      `• Medida de hoja: ${imposition.sheetWidthMm} × ${imposition.sheetHeightMm} mm (${imposition.sheetWidthPt} × ${imposition.sheetHeightPt} pt)\n` +
      `• Medida de página cerrada: ${geometry.pageWidthMm} × ${geometry.pageHeightMm} mm (${geometry.pageWidthPt} × ${geometry.pageHeightPt} pt · ${geometry.pageWidthPx300} × ${geometry.pageHeightPx300} px @ 300 DPI)`,
      margin,
      pdf.y,
      { width: contentW, lineGap: 2 }
    );

    // Visual sheet map
    pdf.moveDown(0.7);
    pdf.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
    drawTextSafely(pdf, 'MAPA VISUAL DE PLIEGOS (FRENTE / DORSO)', margin, pdf.y, { width: contentW });
    pdf.moveDown(0.35);

    const maxMapW = (contentW - 18) / 2;
    const maxMapH = 105;

    for (const sheet of sheets) {
      const scale = Math.min(maxMapW / sheet.sheetWidthPt, maxMapH / sheet.sheetHeightPt);
      const drawW = sheet.sheetWidthPt * scale;
      const drawH = sheet.sheetHeightPt * scale;

      if (pdf.y + drawH + 34 > a4H - margin) {
        pdf.addPage({ size: [a4W, a4H], margin });
      }

      const rowStartY = pdf.y;
      pdf.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
      drawTextSafely(pdf, `Hoja ${sheet.sheetNumber}`, margin, rowStartY, { width: contentW });

      const mapTopY = rowStartY + 13;
      sheet.sides.forEach((side, sideIdx) => {
        const originX = margin + sideIdx * (drawW + 18);
        pdf.font('Helvetica').fontSize(7.5).fillColor('#333333');
        drawTextSafely(pdf, side.sideLabel, originX, mapTopY, { width: drawW });

        const boxY = mapTopY + 10;
        pdf.save().rect(originX, boxY, drawW, drawH).lineWidth(0.75).strokeColor('#000000').stroke().restore();

        for (const cell of side.cells) {
          const cx = originX + cell.xPt * scale;
          const cy = boxY + cell.yPt * scale;
          const cw = cell.widthPt * scale;
          const ch = cell.heightPt * scale;

          pdf.save();
          pdf.rect(cx, cy, cw, ch).lineWidth(0.4);
          if (cell.isBlankPadding) {
            pdf.dash(2, { space: 2 }).strokeColor('#999999').stroke().undash();
          } else {
            pdf.strokeColor('#222222').stroke();
          }
          pdf.restore();

          const label = cell.isBlankPadding
            ? 'Blanco'
            : cell.rotationDeg === 180
              ? `Pág. ${cell.pageNumber} (180° v)`
              : `Pág. ${cell.pageNumber}`;
          pdf.font('Helvetica-Bold').fontSize(7).fillColor(cell.isBlankPadding ? '#777777' : '#000000');
          drawTextSafely(pdf, label, cx + 2, cy + ch / 2 - 4, { width: cw - 4, align: 'center' });
        }

        if (side.sideType === 'front') {
          for (const line of cutLinesMm) {
            pdf.save()
              .strokeColor('#CC3333')
              .lineWidth(0.6)
              .dash(3, { space: 2 })
              .moveTo(originX + line.x1Pt * scale, boxY + line.y1Pt * scale)
              .lineTo(originX + line.x2Pt * scale, boxY + line.y2Pt * scale)
              .stroke()
              .undash()
              .restore();
          }
          for (const line of foldLinesMm) {
            pdf.save()
              .strokeColor('#666666')
              .lineWidth(0.5)
              .dash(1.5, { space: 2 })
              .moveTo(originX + line.x1Pt * scale, boxY + line.y1Pt * scale)
              .lineTo(originX + line.x2Pt * scale, boxY + line.y2Pt * scale)
              .stroke()
              .undash()
              .restore();
          }
        }
      });

      pdf.y = mapTopY + 10 + drawH + 12;
    }

    // Folding guide steps
    if (pdf.y + 80 > a4H - margin) {
      pdf.addPage({ size: [a4W, a4H], margin });
    }
    pdf.moveDown(0.3);
    pdf.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
    drawTextSafely(pdf, foldingGuide?.title || 'PASOS DE ARMADO', margin, pdf.y, { width: contentW });
    pdf.moveDown(0.35);

    const steps = Array.isArray(foldingGuide?.steps) ? foldingGuide.steps : [];
    for (const step of steps) {
      if (pdf.y + 38 > a4H - margin) {
        pdf.addPage({ size: [a4W, a4H], margin });
      }
      pdf.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
      drawTextSafely(pdf, `${step.stepNumber}. ${step.title}`, margin, pdf.y, { width: contentW });
      pdf.font('Helvetica').fontSize(8.5).fillColor('#222222');
      drawTextSafely(pdf, step.description, margin + 12, pdf.y + 1, { width: contentW - 12, lineGap: 1.5 });
      pdf.moveDown(0.45);
    }
  });
}

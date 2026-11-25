import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app.js';
import { imposeBookSpreads } from '../src/shared/impositionEngine.js';
import { mmToPt } from '../src/shared/formatSpecs.js';

function countPdfPages(pdfBuffer) {
  const text = pdfBuffer.toString('latin1');
  const matches = text.match(/\/Type\s*\/Page(?!s)\b/g);
  return matches ? matches.length : 0;
}

function extractFirstMediaBox(pdfBuffer) {
  const text = pdfBuffer.toString('latin1');
  const match = text.match(/\/MediaBox\s*\[\s*([0-9.+-]+)\s+([0-9.+-]+)\s+([0-9.+-]+)\s+([0-9.+-]+)\s*\]/);
  if (!match) return null;
  return {
    x0: Number(match[1]),
    y0: Number(match[2]),
    widthPt: Number(match[3]),
    heightPt: Number(match[4])
  };
}

describe('Auditoría Fase 5 — Exportación PDF 1:1 Cero-Configuración y Guía de Armado', () => {
  let server;
  let baseUrl = '';
  const cleanupBookIds = new Set();

  before(async () => {
    const app = createApp();
    await new Promise((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
      server.once('error', reject);
    });
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    for (const id of cleanupBookIds) {
      await fetch(`${baseUrl}/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    }
    if (server) {
      await new Promise((resolve) => server.close(() => resolve()));
    }
  });

  it('reporta phase 5 en /api/health y responde 404 JSON para libros inexistentes', async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.equal(health.phase, 5);

    const missingPress = await fetch(`${baseUrl}/api/books/libro-inexistente-404/export/press.pdf`);
    assert.equal(missingPress.status, 404);
    const missingPressJson = await missingPress.json();
    assert.ok(missingPressJson.error);

    const missingGuide = await fetch(`${baseUrl}/api/books/libro-inexistente-404/export/guide.pdf`);
    assert.equal(missingGuide.status, 404);
    const missingGuideJson = await missingGuide.json();
    assert.ok(missingGuideJson.error);
  });

  it('exporta press.pdf 1:1 y guide.pdf A4 válidos para el libro semilla (saddle_half A4)', async () => {
    const bookRes = await fetch(`${baseUrl}/api/books/seed-en-este-o-en-otro-mundo`);
    assert.equal(bookRes.status, 200);
    const { book } = await bookRes.json();

    const imposition = imposeBookSpreads({
      pages: book.pages,
      paperId: book.paperId || 'A4',
      formatId: book.formatId || 'saddle_half',
      customWidthMm: book.customWidthMm,
      customHeightMm: book.customHeightMm
    });

    const pressRes = await fetch(`${baseUrl}/api/books/${encodeURIComponent(book.id)}/export/press.pdf`);
    assert.equal(pressRes.status, 200);
    assert.ok((pressRes.headers.get('content-type') || '').includes('application/pdf'));
    assert.match(pressRes.headers.get('content-disposition') || '', /attachment;\s*filename="[^"]+-imprenta\.pdf"/);

    const pressBuf = Buffer.from(await pressRes.arrayBuffer());
    assert.equal(pressBuf.subarray(0, 5).toString('ascii'), '%PDF-');
    assert.equal(countPdfPages(pressBuf), imposition.totalSheetSides);

    const pressBox = extractFirstMediaBox(pressBuf);
    assert.ok(pressBox, 'press.pdf debe incluir MediaBox en su primera página');
    assert.ok(Math.abs(pressBox.widthPt - imposition.sheetWidthPt) < 0.05);
    assert.ok(Math.abs(pressBox.heightPt - imposition.sheetHeightPt) < 0.05);

    const guideRes = await fetch(`${baseUrl}/api/books/${encodeURIComponent(book.id)}/export/guide.pdf`);
    assert.equal(guideRes.status, 200);
    assert.ok((guideRes.headers.get('content-type') || '').includes('application/pdf'));
    assert.match(guideRes.headers.get('content-disposition') || '', /attachment;\s*filename="[^"]+-guia-armado\.pdf"/);

    const guideBuf = Buffer.from(await guideRes.arrayBuffer());
    assert.equal(guideBuf.subarray(0, 5).toString('ascii'), '%PDF-');
    assert.ok(countPdfPages(guideBuf) >= 1);

    const guideBox = extractFirstMediaBox(guideBuf);
    assert.ok(guideBox, 'guide.pdf debe incluir MediaBox A4 vertical');
    assert.ok(Math.abs(guideBox.widthPt - mmToPt(210)) < 0.05);
    assert.ok(Math.abs(guideBox.heightPt - mmToPt(297)) < 0.05);
  });

  it('exporta press.pdf exactos (< 0.05 pt) y guide.pdf para formatos pocket_quarter, single_sheet_zine y custom_nup', async () => {
    const scenarios = [
      {
        title: 'Poemario Bolsillo A6 🤍',
        paperId: 'A4',
        formatId: 'pocket_quarter',
        pageCount: 8
      },
      {
        title: 'Fanzine Carta Instantáneo',
        paperId: 'LETTER',
        formatId: 'single_sheet_zine',
        pageCount: 8
      },
      {
        title: 'Edición Medida A3',
        paperId: 'A3',
        formatId: 'custom_nup',
        customWidthMm: 90,
        customHeightMm: 130,
        pageCount: 6
      }
    ];

    for (const sc of scenarios) {
      const createRes = await fetch(`${baseUrl}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sc)
      });
      assert.equal(createRes.status, 201);
      const { book } = await createRes.json();
      cleanupBookIds.add(book.id);

      // Add extraImage + emoji text to verify sanitization and SVG layer rendering
      book.pages[0].extraImages = [
        {
          uid: 'pdf-qa-extra-1',
          kind: 'svg',
          illustrationId: 'miniMoon',
          title: 'Luna QA',
          xPct: 68,
          yPct: 72,
          widthPct: 20,
          rotationDeg: 15
        }
      ];
      book.pages[1].text = 'Versos con símbolo 🤍 y acentos áéíóúñ\nsegunda línea.';

      const putRes = await fetch(`${baseUrl}/api/books/${encodeURIComponent(book.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book)
      });
      assert.equal(putRes.status, 200);
      const { book: savedBook } = await putRes.json();

      const imposition = imposeBookSpreads({
        pages: savedBook.pages,
        paperId: savedBook.paperId,
        formatId: savedBook.formatId,
        customWidthMm: savedBook.customWidthMm,
        customHeightMm: savedBook.customHeightMm
      });

      const pressRes = await fetch(`${baseUrl}/api/books/${encodeURIComponent(savedBook.id)}/export/press.pdf`);
      assert.equal(pressRes.status, 200, `press.pdf falló en ${sc.formatId}`);
      const pressBuf = Buffer.from(await pressRes.arrayBuffer());
      assert.equal(pressBuf.subarray(0, 5).toString('ascii'), '%PDF-');
      assert.equal(
        countPdfPages(pressBuf),
        imposition.totalSheetSides,
        `Conteo de páginas debe igualar totalSheetSides en ${sc.formatId}`
      );

      const pressBox = extractFirstMediaBox(pressBuf);
      assert.ok(pressBox);
      assert.ok(
        Math.abs(pressBox.widthPt - imposition.sheetWidthPt) < 0.05,
        `Ancho MediaBox fuera de tolerancia en ${sc.formatId}`
      );
      assert.ok(
        Math.abs(pressBox.heightPt - imposition.sheetHeightPt) < 0.05,
        `Alto MediaBox fuera de tolerancia en ${sc.formatId}`
      );

      const guideRes = await fetch(`${baseUrl}/api/books/${encodeURIComponent(savedBook.id)}/export/guide.pdf`);
      assert.equal(guideRes.status, 200, `guide.pdf falló en ${sc.formatId}`);
      const guideBuf = Buffer.from(await guideRes.arrayBuffer());
      assert.equal(guideBuf.subarray(0, 5).toString('ascii'), '%PDF-');
      assert.ok(countPdfPages(guideBuf) >= 1);
    }
  });
});

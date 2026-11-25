import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app.js';
import { PAPER_SHEETS, BOOK_FORMATS, createDefaultPage } from '../src/shared/contracts.js';
import { MM_TO_PT } from '../src/shared/formatSpecs.js';
import { ILLUSTRATIONS_CATALOG, listIllustrationsByCategory } from '../src/shared/illustrationsCatalog.js';
import { imposeBookSpreads } from '../src/shared/impositionEngine.js';

function makeDummyPages(count) {
  return Array.from({ length: count }, (_, idx) =>
    createDefaultPage(idx + 1, {
      role: `Página ${idx + 1}`,
      layout: idx === 0 ? 'cover' : idx === count - 1 ? 'backcover' : 'butterflies',
      title: `Poema ${idx + 1}`,
      text: `Verso de prueba ${idx + 1}\ncon ritmo editorial.`
    })
  );
}

describe('Auditoría Fase 4 — Imposición Multi-Formato, Simulador e Imágenes Extras Minimalistas', () => {
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

  it('valida la compaginación exacta 1..N y tolerancia < 0.05 pt en los 4 formatos × 3 papeles', () => {
    const samplePages = makeDummyPages(8);

    for (const paperId of Object.keys(PAPER_SHEETS)) {
      for (const formatId of Object.keys(BOOK_FORMATS)) {
        const result = imposeBookSpreads({
          pages: samplePages,
          paperId,
          formatId,
          customWidthMm: 85,
          customHeightMm: 120
        });

        assert.ok(result && Array.isArray(result.sheets) && result.sheets.length >= 1);
        assert.ok(result.foldingGuide && Array.isArray(result.foldingGuide.steps) && result.foldingGuide.steps.length >= 2);
        assert.equal(result.totalInputPages, 8);

        // Collect all non-padding page numbers across all sides of all sheets
        const seenPages = [];
        for (const sheet of result.sheets) {
          assert.ok(
            Math.abs(sheet.sheetWidthPt - sheet.sheetWidthMm * MM_TO_PT) < 0.05,
            `Tolerancia pt excedida en ancho (${formatId}/${paperId})`
          );
          assert.ok(
            Math.abs(sheet.sheetHeightPt - sheet.sheetHeightMm * MM_TO_PT) < 0.05,
            `Tolerancia pt excedida en alto (${formatId}/${paperId})`
          );
          for (const side of sheet.sides) {
            for (const cell of side.cells) {
              assert.ok(Math.abs(cell.widthPt - cell.widthMm * MM_TO_PT) < 0.05);
              assert.ok(Math.abs(cell.heightPt - cell.heightMm * MM_TO_PT) < 0.05);
              if (cell.pageNumber !== null && !cell.isBlankPadding) {
                seenPages.push(cell.pageNumber);
              }
            }
          }
        }

        // Bijection 1..8
        seenPages.sort((a, b) => a - b);
        assert.deepEqual(
          seenPages,
          [1, 2, 3, 4, 5, 6, 7, 8],
          `Cada página 1..8 debe aparecer exactamente una vez en ${formatId}/${paperId}`
        );
      }
    }
  });

  it('verifica reglas matemáticas específicas: Saddle-Stitch A5, Bolsillo A6, Fanzine 180° y Espejo Custom N-up', () => {
    const pages8 = makeDummyPages(8);

    // 1. Saddle-Stitch A5 (8 pages -> 2 sheets front/back)
    const saddle = imposeBookSpreads({ pages: pages8, paperId: 'A4', formatId: 'saddle_half' });
    assert.equal(saddle.sheetCount, 2);
    assert.deepEqual(saddle.sheets[0].sides[0].cells.map((c) => c.displayPageNumber), [8, 1]);
    assert.deepEqual(saddle.sheets[0].sides[1].cells.map((c) => c.displayPageNumber), [2, 7]);
    assert.deepEqual(saddle.sheets[1].sides[0].cells.map((c) => c.displayPageNumber), [6, 3]);
    assert.deepEqual(saddle.sheets[1].sides[1].cells.map((c) => c.displayPageNumber), [4, 5]);
    assert.ok(saddle.foldLinesMm.length >= 1);

    // 2. Pocket A6 (8 pages -> 1 sheet 2x2 duplex nested)
    const pocket = imposeBookSpreads({ pages: pages8, paperId: 'A4', formatId: 'pocket_quarter' });
    assert.equal(pocket.sheetCount, 1);
    assert.deepEqual(pocket.sheets[0].sides[0].cells.map((c) => c.displayPageNumber), [8, 1, 6, 3]);
    assert.deepEqual(pocket.sheets[0].sides[1].cells.map((c) => c.displayPageNumber), [2, 7, 4, 5]);
    assert.ok(pocket.cutLinesMm.length >= 1);
    assert.ok(pocket.foldLinesMm.length >= 1);

    // 3. Single-Sheet Zine (8 pages on 1 side: top row 180° [5,4,3,2], bottom row 0° [6,7,8,1])
    const zine = imposeBookSpreads({ pages: pages8, paperId: 'A4', formatId: 'single_sheet_zine' });
    assert.equal(zine.sheetCount, 1);
    assert.equal(zine.sheets[0].sides.length, 1);
    const zineCells = zine.sheets[0].sides[0].cells;
    assert.deepEqual(zineCells.map((c) => c.displayPageNumber), [5, 4, 3, 2, 6, 7, 8, 1]);
    assert.deepEqual(zineCells.slice(0, 4).map((c) => c.rotationDeg), [180, 180, 180, 180]);
    assert.deepEqual(zineCells.slice(4, 8).map((c) => c.rotationDeg), [0, 0, 0, 0]);
    assert.ok(zine.cutLinesMm.length >= 1, 'Fanzine debe incluir línea de corte central');

    // 4. Custom N-up mirrored back check (colBack === cols - 1 - colFront)
    const custom = imposeBookSpreads({
      pages: pages8,
      paperId: 'A4',
      formatId: 'custom_nup',
      customWidthMm: 80,
      customHeightMm: 110
    });
    const cols = custom.geometry.cols;
    const frontCells = custom.sheets[0].sides[0].cells;
    const backCells = custom.sheets[0].sides[1].cells;
    for (const fCell of frontCells) {
      if (fCell.isBlankPadding) continue;
      const partnerBack = backCells.find((b) => b.row === fCell.row && b.col === cols - 1 - fCell.col);
      assert.ok(partnerBack, 'Cada celda frente debe alinear al trasluz con colBack = cols - 1 - colFront');
      assert.ok(
        Math.abs((fCell.xMm + fCell.widthMm) - (custom.geometry.sheetWidthMm - partnerBack.xMm)) < 0.05,
        'Coincidencia geométrica al trasluz frente/dorso'
      );
    }

    // 5. Odd page count padding check (e.g. 5 pages in saddle -> pads to 8 cleanly)
    const oddSaddle = imposeBookSpreads({ pages: makeDummyPages(5), paperId: 'A4', formatId: 'saddle_half' });
    assert.equal(oddSaddle.paddedPageCount, 8);
    assert.equal(oddSaddle.blankPaddingCount, 3);
  });

  it('expone endpoints REST de Fase 4 (/api/health phase 4, GET /imposition, POST /imposition/preview)', async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.ok(health.phase >= 4, 'GET /api/health debe reportar phase >= 4');

    const bookImpRes = await fetch(`${baseUrl}/api/books/seed-en-este-o-en-otro-mundo/imposition`);
    assert.equal(bookImpRes.status, 200);
    const bookImp = await bookImpRes.json();
    assert.equal(bookImp.ok, true);
    assert.ok(bookImp.imposition?.sheets?.length >= 1);

    const previewRes = await fetch(`${baseUrl}/api/imposition/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId: 'LETTER',
        formatId: 'single_sheet_zine',
        pageCount: 8
      })
    });
    assert.equal(previewRes.status, 200);
    const previewJson = await previewRes.json();
    assert.equal(previewJson.ok, true);
    assert.equal(previewJson.imposition.geometry.paperId, 'LETTER');
    assert.equal(previewJson.imposition.sheets[0].sides[0].cells[0].rotationDeg, 180);
  });

  it('incluye catálogo minimalista en tinta, estilo minimalista en búsqueda y persistencia atómica de extraImages arrastrables', async () => {
    assert.ok(ILLUSTRATIONS_CATALOG.length >= 40, 'Debe incluir los 32 grabados + 8 minimalistas');
    const minimalistSvgs = listIllustrationsByCategory('minimalista');
    assert.ok(minimalistSvgs.length >= 8, 'Debe haber al menos 8 grabados minimalistas de un solo trazo');

    // Online search endpoint with minimalist style (never crashes even offline)
    const searchRes = await fetch(`${baseUrl}/api/art/online-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'luna', poemText: 'luna de noche calma', style: 'minimalist', limit: 6 })
    });
    assert.equal(searchRes.status, 200);
    const searchJson = await searchRes.json();
    assert.ok(Array.isArray(searchJson.localSuggestions) && searchJson.localSuggestions.length >= 1);

    // Extra draggable images persistence in CRUD
    const createRes = await fetch(`${baseUrl}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Prueba Imágenes Arrastrables',
        paperId: 'A4',
        formatId: 'saddle_half',
        pageCount: 4
      })
    });
    assert.equal(createRes.status, 201);
    const { book } = await createRes.json();
    cleanupBookIds.add(book.id);

    book.pages[1].extraImages = [
      {
        uid: 'ext-qa-1',
        kind: 'svg',
        illustrationId: 'miniMoon',
        title: 'Luna Minimalista Fina',
        xPct: 64.5,
        yPct: 71.2,
        widthPct: 22,
        rotationDeg: -15
      }
    ];

    const putRes = await fetch(`${baseUrl}/api/books/${encodeURIComponent(book.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book)
    });
    assert.equal(putRes.status, 200);
    const { book: saved } = await putRes.json();
    assert.equal(saved.pages[1].extraImages.length, 1);
    assert.equal(saved.pages[1].extraImages[0].illustrationId, 'miniMoon');
    assert.equal(saved.pages[1].extraImages[0].xPct, 64.5);
    assert.equal(saved.pages[1].extraImages[0].yPct, 71.2);
    assert.equal(saved.pages[1].extraImages[0].rotationDeg, -15);
  });
});

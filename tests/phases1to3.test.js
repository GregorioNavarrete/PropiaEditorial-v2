import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

import { createApp, ROOT_DIR } from '../src/app.js';
import { JsonStore } from '../src/models/jsonStore.js';
import { PAPER_SHEETS, BOOK_FORMATS, PAGE_LAYOUTS } from '../src/shared/contracts.js';
import {
  mmToPx300Dpi,
  computeFormatGeometry,
  getRecommendedSlotSpecs
} from '../src/shared/formatSpecs.js';
import {
  analyzePoemAndSuggest,
  splitPoemIntoPages
} from '../src/shared/poemMatcher.js';
import { importOnlineImageAsEngraving } from '../src/services/onlineArtService.js';

const ENGRAVINGS_DIR = path.join(ROOT_DIR, 'storage/engravings');

describe('Auditoría Integral Switch-Lit Poetry Press — Fases 1, 2 y 3', () => {
  let server;
  let baseUrl = '';
  const cleanupEngravingPaths = new Set();
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
    // Clean up any leftover test books if a test failed mid-flight
    for (const id of cleanupBookIds) {
      await fetch(`${baseUrl}/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    }

    // Clean up temporary engraving files generated during upload tests
    for (const filePath of cleanupEngravingPaths) {
      await fs.unlink(filePath).catch(() => {});
    }

    if (server) {
      await new Promise((resolve) => server.close(() => resolve()));
    }
  });

  // =========================================================================
  // FASE 1: EXPRESS, HTML SWITCH-LIT Y BIBLIOTECA MULTI-LIBRO ATÓMICA
  // =========================================================================
  describe('Fase 1 — Express MVC, Interfaz Switch-Lit y Biblioteca Multi-Libro', () => {
    it('responde 200 en GET /, GET /shared/contracts.js y GET /api/health con estética Switch-Lit sin CDNs', async () => {
      const homeRes = await fetch(`${baseUrl}/`);
      assert.equal(homeRes.status, 200);
      assert.match(homeRes.headers.get('content-type') || '', /text\/html/i);

      const html = await homeRes.text();
      assert.ok(html.includes('/css/switch-lit-tokens.css'), 'Debe enlazar switch-lit-tokens.css');
      assert.ok(html.includes('/css/switch-lit-components.css'), 'Debe enlazar switch-lit-components.css');
      assert.ok(html.includes('/css/studio-editor.css'), 'Debe enlazar studio-editor.css');
      assert.ok(html.includes('sl-topbar'), 'Debe incluir estructura editorial Switch-Lit');
      assert.ok(!html.includes('cdn.tailwindcss.com'), 'No debe contener CDN de Tailwind');

      const contractsRes = await fetch(`${baseUrl}/shared/contracts.js`);
      assert.equal(contractsRes.status, 200);
      assert.match(contractsRes.headers.get('content-type') || '', /javascript/i);
      const contractsJs = await contractsRes.text();
      assert.ok(contractsJs.includes('export const PAPER_SHEETS'));
      assert.ok(contractsJs.includes('export const BOOK_FORMATS'));

      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.equal(healthRes.status, 200);
      const healthJson = await healthRes.json();
      assert.equal(healthJson.ok, true);
      assert.equal(healthJson.app, 'switch-lit-poetry-press');
    });

    it('preserva el libro semilla "En este o en otro mundo" (8 páginas) y ejecuta CRUD completo sin afectarlo', async () => {
      const initialListRes = await fetch(`${baseUrl}/api/books`);
      assert.equal(initialListRes.status, 200);
      const { books: initialBooks } = await initialListRes.json();
      assert.ok(Array.isArray(initialBooks) && initialBooks.length >= 1);

      const seedBefore = initialBooks.find((b) => b.id === 'seed-en-este-o-en-otro-mundo');
      assert.ok(seedBefore, 'Debe existir el libro semilla "seed-en-este-o-en-otro-mundo"');
      assert.equal(seedBefore.title, 'En este o en otro mundo');
      assert.equal(seedBefore.subtitle, 'Pequeño poemario para Bianca');
      assert.equal(seedBefore.author, 'Grego');
      assert.equal(seedBefore.pages.length, 8);

      // Verify original poems migrated across the 8 seed pages
      assert.match(seedBefore.pages[0].text, /Porque todo el tiempo que vivimos/);
      assert.match(seedBefore.pages[1].text, /Para Bianca,/);
      assert.match(seedBefore.pages[2].text, /Aunque hoy me sienta vencido/);
      assert.match(seedBefore.pages[3].text, /senderos\s+de tus memorias/);
      assert.match(seedBefore.pages[4].text, /Todas las noches muero pensando/);
      assert.match(seedBefore.pages[5].text, /Qué afortunado es\s+este universo/);
      assert.match(seedBefore.pages[6].text, /Perdona las faltas que tuve/);
      assert.match(seedBefore.pages[7].text, /Sos la persona que quiero ver/);

      // 1. CREATE (POST /api/books)
      const createRes = await fetch(`${baseUrl}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Antología Nocturna QA',
          subtitle: 'Edición de prueba automatizada',
          author: 'QA Verifier',
          paperId: 'LETTER',
          formatId: 'pocket_quarter',
          pageCount: 8
        })
      });
      assert.equal(createRes.status, 201);
      const { book: createdBook } = await createRes.json();
      assert.ok(createdBook?.id && createdBook.id !== seedBefore.id);
      cleanupBookIds.add(createdBook.id);
      assert.equal(createdBook.title, 'Antología Nocturna QA');
      assert.equal(createdBook.paperId, 'LETTER');
      assert.equal(createdBook.formatId, 'pocket_quarter');
      assert.equal(createdBook.pages.length, 8);

      // 2. UPDATE (PUT /api/books/:id)
      const editedPages = structuredClone(createdBook.pages);
      editedPages[2].text = 'Verso editado atómicamente\nbajo la lámpara de tinta.';
      const updateRes = await fetch(`${baseUrl}/api/books/${encodeURIComponent(createdBook.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Antología Nocturna QA — Revisada',
          paperId: 'A3',
          pages: editedPages
        })
      });
      assert.equal(updateRes.status, 200);
      const { book: updatedBook } = await updateRes.json();
      assert.equal(updatedBook.id, createdBook.id);
      assert.equal(updatedBook.title, 'Antología Nocturna QA — Revisada');
      assert.equal(updatedBook.paperId, 'A3');
      assert.equal(updatedBook.pages[2].text, 'Verso editado atómicamente\nbajo la lámpara de tinta.');

      // 3. DUPLICATE (POST /api/books/:id/duplicate)
      const dupRes = await fetch(`${baseUrl}/api/books/${encodeURIComponent(createdBook.id)}/duplicate`, {
        method: 'POST'
      });
      assert.equal(dupRes.status, 201);
      const { book: duplicatedBook } = await dupRes.json();
      assert.ok(duplicatedBook?.id && duplicatedBook.id !== createdBook.id);
      cleanupBookIds.add(duplicatedBook.id);
      assert.equal(duplicatedBook.title, 'Antología Nocturna QA — Revisada (Copia)');
      assert.equal(duplicatedBook.pages[2].text, 'Verso editado atómicamente\nbajo la lámpara de tinta.');

      // 4. DELETE both test books (DELETE /api/books/:id)
      const delCreated = await fetch(`${baseUrl}/api/books/${encodeURIComponent(createdBook.id)}`, {
        method: 'DELETE'
      });
      assert.equal(delCreated.status, 200);
      cleanupBookIds.delete(createdBook.id);

      const delDuplicated = await fetch(`${baseUrl}/api/books/${encodeURIComponent(duplicatedBook.id)}`, {
        method: 'DELETE'
      });
      assert.equal(delDuplicated.status, 200);
      cleanupBookIds.delete(duplicatedBook.id);

      // Verify 404 after deletion
      const checkDeleted = await fetch(`${baseUrl}/api/books/${encodeURIComponent(createdBook.id)}`);
      assert.equal(checkDeleted.status, 404);

      // Verify seed book remains 100% intact
      const seedAfterRes = await fetch(`${baseUrl}/api/books/seed-en-este-o-en-otro-mundo`);
      assert.equal(seedAfterRes.status, 200);
      const { book: seedAfter } = await seedAfterRes.json();
      assert.deepEqual(seedAfter, seedBefore);
    });

    it('garantiza escritura atómica serializada en JsonStore sin corrupción ni archivos temporales residuales', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'switchlit-jsonstore-'));
      try {
        const storeFile = path.join(tmpDir, 'concurrent.json');
        const store = new JsonStore(storeFile, { count: 0, items: [] });

        await Promise.all(
          Array.from({ length: 12 }, (_, idx) =>
            store.update(async (state) => {
              state.count += 1;
              state.items.push(`item-${idx}`);
              return state;
            })
          )
        );

        const finalState = await store.read();
        assert.equal(finalState.count, 12);
        assert.equal(finalState.items.length, 12);

        const dirFiles = await fs.readdir(tmpDir);
        assert.deepEqual(dirFiles, ['concurrent.json'], 'No deben quedar archivos .tmp residuales');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // =========================================================================
  // FASE 2: GEOMETRÍA 300 DPI, PLANTILLAS Y DIVISIÓN DE POEMAS EXTENSOS
  // =========================================================================
  describe('Fase 2 — Geometría Física 300 DPI, Plantillas y División de Poemas', () => {
    it('calcula con exactitud matemática mmToPx300Dpi, computeFormatGeometry y getRecommendedSlotSpecs en los 4 formatos × 3 papeles', async () => {
      // Exact 300 DPI conversion checks
      assert.equal(mmToPx300Dpi(52), 614);
      assert.equal(mmToPx300Dpi(25.4), 300);
      assert.equal(mmToPx300Dpi(148.5), 1754);
      assert.equal(mmToPx300Dpi(210), 2480);

      const formatIds = Object.keys(BOOK_FORMATS);
      const paperIds = Object.keys(PAPER_SHEETS);
      assert.deepEqual(formatIds, ['saddle_half', 'pocket_quarter', 'single_sheet_zine', 'custom_nup']);
      assert.deepEqual(paperIds, ['A4', 'LETTER', 'A3']);

      for (const paperId of paperIds) {
        for (const formatId of formatIds) {
          const geo = computeFormatGeometry({
            paperId,
            formatId,
            customWidthMm: 95,
            customHeightMm: 135
          });

          assert.equal(geo.paperId, paperId);
          assert.equal(geo.formatId, formatId);
          assert.ok(geo.pageWidthMm > 0 && geo.pageHeightMm > 0);
          assert.equal(geo.pageWidthPx300, mmToPx300Dpi(geo.pageWidthMm));
          assert.equal(geo.pageHeightPx300, mmToPx300Dpi(geo.pageHeightMm));
          assert.ok(geo.cols >= 1 && geo.rows >= 1);
          assert.equal(geo.pagesPerSide, geo.cols * geo.rows);
          assert.equal(geo.pagesPerSheet, geo.duplex ? geo.pagesPerSide * 2 : geo.pagesPerSide);

          for (const layoutId of Object.keys(PAGE_LAYOUTS)) {
            const slot = getRecommendedSlotSpecs({
              paperId,
              formatId,
              customWidthMm: 95,
              customHeightMm: 135,
              layoutId
            });
            assert.equal(slot.layoutId, layoutId);
            assert.equal(slot.dpi, 300);
            assert.ok(slot.widthMm > 0 && slot.heightMm > 0);
            assert.equal(slot.widthPx, mmToPx300Dpi(slot.widthMm));
            assert.equal(slot.heightPx, mmToPx300Dpi(slot.heightMm));
            assert.ok(typeof slot.aspectRatioLabel === 'string' && slot.aspectRatioLabel.length > 0);
            assert.ok(slot.maxLines >= 6 && slot.maxCharsPerLine >= 20);
          }
        }
      }

      // Specific A4 reference checks
      const a4Saddle = computeFormatGeometry({ paperId: 'A4', formatId: 'saddle_half' });
      assert.equal(a4Saddle.pageWidthMm, 148.5);
      assert.equal(a4Saddle.pageHeightMm, 210);
      assert.equal(a4Saddle.pagesPerSheet, 4);

      const a4Pocket = computeFormatGeometry({ paperId: 'A4', formatId: 'pocket_quarter' });
      assert.equal(a4Pocket.pageWidthMm, 105);
      assert.equal(a4Pocket.pageHeightMm, 148.5);
      assert.equal(a4Pocket.pagesPerSheet, 8);

      const a4Zine = computeFormatGeometry({ paperId: 'A4', formatId: 'single_sheet_zine' });
      assert.equal(a4Zine.pageWidthMm, 74.25);
      assert.equal(a4Zine.pageHeightMm, 105);
      assert.equal(a4Zine.duplex, false);
      assert.equal(a4Zine.pagesPerSheet, 8);

      // Klimt slot on A4 saddle_half: 52 mm × 132 mm -> 614 px × 1559 px @ 300 DPI
      const klimtRes = await fetch(
        `${baseUrl}/api/formats/specs?paperId=A4&formatId=saddle_half&layoutId=klimt`
      );
      assert.equal(klimtRes.status, 200);
      const klimtData = await klimtRes.json();
      assert.equal(klimtData.slotSpecs.widthMm, 52);
      assert.equal(klimtData.slotSpecs.widthPx, 614);
      assert.equal(klimtData.slotSpecs.heightMm, 132);
      assert.equal(klimtData.slotSpecs.heightPx, 1559);
    });

    it('detecta desborde en POST /api/poems/analyze con un poema largo de 32 líneas y lo divide limpiamente por estrofas', async () => {
      // Build an 8-stanza × 4-verse poem (32 poetic verses separated by stanza breaks)
      const stanzas = Array.from({ length: 8 }, (_, sIdx) => [
        `Estrofa ${sIdx + 1}: caminan las estrellas sobre el papel en calma,`,
        `guardando entre la noche la memoria del jardín,`,
        `donde laten las promesas escritas a pluma y tinta`,
        `y el viento nos devuelve la claridad del alba.`
      ].join('\n'));
      const poem32Verses = stanzas.join('\n\n');

      const res = await fetch(`${baseUrl}/api/poems/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: poem32Verses,
          paperId: 'A4',
          formatId: 'saddle_half',
          currentLayoutId: 'butterflies',
          fontSize: '12.5pt'
        })
      });
      assert.equal(res.status, 200);
      const analysis = await res.json();

      assert.equal(analysis.metrics.nonEmptyLineCount, 32);
      assert.equal(analysis.overflow.isOverflowing, true);
      assert.equal(analysis.overflow.hasOverflow, true);

      const splitPages = analysis.overflow.splitPages;
      assert.ok(Array.isArray(splitPages) && splitPages.length >= 2, 'Debe partir en al menos 2 páginas');
      assert.deepEqual(analysis.splitPages, splitPages);

      // Verify stanza integrity: every original 4-line stanza appears intact inside one of the pages
      for (const stanza of stanzas) {
        const preservedIntact = splitPages.some((pageChunk) => pageChunk.includes(stanza));
        assert.ok(preservedIntact, 'Ninguna estrofa debe cortarse a la mitad');
      }
      assert.equal(splitPages.join('\n\n'), poem32Verses);

      // Also verify exact 32-total-lines case without explicit layout override
      const exact32Lines = [
        ...Array.from({ length: 4 }, (_, i) =>
          [
            `Parte ${i + 1} verso uno de luna y constelación,`,
            `verso dos de silencio bajo la lluvia antigua,`,
            `verso tres de raíces que despiertan al sol,`,
            `verso cuatro de manos que abrazan el mañana,`,
            `verso cinco de faros encendidos frente al mar,`,
            `verso seis de relojes detenidos en tu voz,`,
            `verso siete cerrando la estrofa con tinta.`
          ].join('\n')
        ).join('\n\n').split('\n'),
        'Verso treinta y dos final de cierre.'
      ].join('\n');
      assert.equal(exact32Lines.split('\n').length, 32);

      const resExact32 = await fetch(`${baseUrl}/api/poems/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: exact32Lines, paperId: 'A4', formatId: 'saddle_half' })
      });
      assert.equal(resExact32.status, 200);
      const dataExact32 = await resExact32.json();
      assert.equal(dataExact32.overflow.isOverflowing, true);
      assert.ok(dataExact32.overflow.splitPages.length >= 2);

      const splitEndpointRes = await fetch(`${baseUrl}/api/poems/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: poem32Verses, paperId: 'A4', formatId: 'saddle_half', layoutId: 'butterflies' })
      });
      assert.equal(splitEndpointRes.status, 200);
      const splitData = await splitEndpointRes.json();
      assert.equal(splitData.ok, true);
      assert.ok(Array.isArray(splitData.pages) && splitData.pages.length >= 2);
    });
  });

  // =========================================================================
  // FASE 3: MOTOR POEMA→IMAGEN, OWASP MAGIC BYTES, SHARP 300 DPI Y ANTI-SSRF
  // =========================================================================
  describe('Fase 3 — Motor Semántico Poema→Imagen, Subida OWASP + Sharp 300 DPI y Anti-SSRF', () => {
    it('demuestra coherencia temática diferencial en analyzePoemAndSuggest (cosmos vs botánica vs lluvia)', () => {
      const cosmosAnalysis = analyzePoemAndSuggest(
        'Bajo la noche infinita miro las estrellas brillar en la constelación,\nmientras la luna menguante ilumina todo el universo.'
      );
      const botanyAnalysis = analyzePoemAndSuggest(
        'En el jardín de primavera brotan las flores silvestres,\nuna rosa abre sus pétalos suaves desde la raíz llena de perfume.'
      );
      const rainAnalysis = analyzePoemAndSuggest(
        'Cae la lluvia fría sobre la calle vacía en invierno,\nentre lágrimas, sombras, ausencia y honda nostalgia en soledad.'
      );

      assert.equal(cosmosAnalysis.dominantThemes[0]?.id, 'cosmos');
      assert.equal(botanyAnalysis.dominantThemes[0]?.id, 'botanica');
      assert.equal(rainAnalysis.dominantThemes[0]?.id, 'melancolia');

      assert.equal(cosmosAnalysis.recommendedLayoutId, 'starboy');
      assert.equal(botanyAnalysis.recommendedLayoutId, 'sacredheart');
      assert.equal(rainAnalysis.recommendedLayoutId, 'baroque');

      assert.equal(cosmosAnalysis.suggestedIllustrations[0]?.category, 'cosmos');
      assert.equal(botanyAnalysis.suggestedIllustrations[0]?.category, 'botanica');
      assert.equal(rainAnalysis.suggestedIllustrations[0]?.category, 'melancolia');

      const topIds = new Set([
        cosmosAnalysis.suggestedIllustrations[0]?.id,
        botanyAnalysis.suggestedIllustrations[0]?.id,
        rainAnalysis.suggestedIllustrations[0]?.id
      ]);
      assert.equal(topIds.size, 3, 'Cada eje poético debe priorizar un grabado principal distinto');
    });

    it('rechaza con 400 un archivo falso .png de texto plano (OWASP Magic Bytes) en POST /api/art/engrave-upload', async () => {
      const fakeBlob = new Blob([Buffer.from('not an image')], { type: 'image/png' });
      const form = new FormData();
      form.append('image', fakeBlob, 'fake-exploit.png');
      form.append('mode', 'ink');
      form.append('widthPx', '496');
      form.append('heightPx', '496');

      const res = await fetch(`${baseUrl}/api/art/engrave-upload`, {
        method: 'POST',
        body: form
      });

      assert.equal(res.status, 400);
      const payload = await res.json();
      assert.ok(typeof payload.error === 'string' && payload.error.length > 0);
    });

    it('procesa con 200 un PNG real en los 3 modos (ink, engraving, sketch) a 496×496 px y 300 DPI exactos', async () => {
      // Synthesize a 240x240 RGB gradient + geometric motif PNG with sharp
      const w = 240;
      const h = 240;
      const rawRgb = Buffer.alloc(w * h * 3);
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const offset = (y * w + x) * 3;
          const distCenter = Math.hypot(x - 120, y - 120);
          const tone = distCenter < 48 ? 25 : Math.min(250, Math.round((x + y) * 0.52));
          rawRgb[offset] = tone;
          rawRgb[offset + 1] = tone;
          rawRgb[offset + 2] = tone;
        }
      }
      const sourcePngBuffer = await sharp(rawRgb, {
        raw: { width: w, height: h, channels: 3 }
      })
        .png()
        .toBuffer();

      for (const mode of ['ink', 'engraving', 'sketch']) {
        const realBlob = new Blob([sourcePngBuffer], { type: 'image/png' });
        const form = new FormData();
        form.append('image', realBlob, `sample-${mode}.png`);
        form.append('mode', mode);
        form.append('widthPx', '496');
        form.append('heightPx', '496');
        form.append('fit', 'contain');

        const res = await fetch(`${baseUrl}/api/art/engrave-upload`, {
          method: 'POST',
          body: form
        });

        assert.equal(res.status, 200, `Modo ${mode} debe responder HTTP 200`);
        const body = await res.json();
        assert.equal(body.ok, true);
        assert.equal(body.asset.mode, mode);
        assert.equal(body.asset.widthPx, 496);
        assert.equal(body.asset.heightPx, 496);
        assert.equal(body.asset.dpi, 300);
        assert.match(body.asset.filename, /^[0-9a-f-]{36}\.png$/i);

        const savedFile = path.join(ENGRAVINGS_DIR, body.asset.filename);
        cleanupEngravingPaths.add(savedFile);

        const metadata = await sharp(savedFile).metadata();
        assert.equal(metadata.format, 'png');
        assert.equal(metadata.width, 496);
        assert.equal(metadata.height, 496);
        assert.equal(metadata.density, 300);

        // Verify Atkinson dithering produces pure binary black (0) & white (255) pixels
        if (mode === 'engraving') {
          const { data: pixels } = await sharp(savedFile).raw().toBuffer({ resolveWithObject: true });
          let hasBlack = false;
          let hasWhite = false;
          for (const px of pixels) {
            assert.ok(px === 0 || px === 255, `Píxel Atkinson debe ser 0 o 255, recibido: ${px}`);
            if (px === 0) hasBlack = true;
            if (px === 255) hasWhite = true;
          }
          assert.ok(hasBlack && hasWhite, 'El grabado Atkinson debe contener trazos negros y papel blanco');
        }

        // Verify hardened static serving
        const staticRes = await fetch(`${baseUrl}${body.asset.url}`);
        assert.equal(staticRes.status, 200);
        assert.equal(staticRes.headers.get('x-content-type-options'), 'nosniff');

        // Immediately remove temporary test artifact
        await fs.unlink(savedFile);
        cleanupEngravingPaths.delete(savedFile);
      }
    });

    it('bloquea URLs inseguras o internas en importOnlineImageAsEngraving y POST /api/art/online-import (Anti-SSRF)', async () => {
      const unsafeUrls = [
        'http://example.com/engraving.png',
        'https://127.0.0.1/private.png',
        'https://localhost/admin.png',
        'https://169.254.169.254/latest/meta-data/',
        'https://192.168.1.25/internal.png',
        'https://[::1]/loopback.png'
      ];

      for (const badUrl of unsafeUrls) {
        await assert.rejects(
          () => importOnlineImageAsEngraving({ imageUrl: badUrl }),
          (err) => {
            assert.equal(err.statusCode, 400, `URL insegura debe arrojar statusCode 400: ${badUrl}`);
            return true;
          }
        );

        const apiRes = await fetch(`${baseUrl}/api/art/online-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: badUrl, mode: 'engraving' })
        });
        assert.equal(apiRes.status, 400, `Endpoint /api/art/online-import debe rechazar con 400: ${badUrl}`);
      }
    });
  });
});

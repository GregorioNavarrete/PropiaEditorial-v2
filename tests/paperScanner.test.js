import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import app from '../src/app.js';
import { terminatePaperScannerWorker } from '../src/services/paperScannerService.js';

let server;
let baseUrl;
const createdEngravingFiles = [];

function trackAssetUrl(url) {
  if (typeof url === 'string' && url.startsWith('/storage/engravings/')) {
    const filePath = path.resolve(process.cwd(), 'storage/engravings', path.basename(url));
    createdEngravingFiles.push(filePath);
  }
}

describe('Editorial Personal — Logo de Marca y Escáner de Cartas en Papel (OCR + Dibujos)', () => {
  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await terminatePaperScannerWorker();
    for (const f of createdEngravingFiles) {
      await fs.unlink(f).catch(() => {});
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('sirve la marca "Editorial Personal" y el logo limpio PNG en /img/editorial-personal-logo.png', async () => {
    const htmlRes = await fetch(`${baseUrl}/`);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.ok(html.includes('Editorial Personal'), 'Debe mostrar el nombre Editorial Personal');
    assert.ok(
      html.includes('/img/editorial-personal-logo.png'),
      'Debe referenciar el logo /img/editorial-personal-logo.png'
    );
    assert.ok(html.includes('btnOpenPaperScanner'), 'Debe incluir el botón Escanear Carta');

    const imgRes = await fetch(`${baseUrl}/img/editorial-personal-logo.png`);
    assert.equal(imgRes.status, 200);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    assert.equal(buf[0], 0x89);
    assert.equal(buf[1], 0x50);
    assert.equal(buf[2], 0x4e);
    assert.equal(buf[3], 0x47);
  });

  it('rechaza con 400 archivos no válidos en POST /api/scan/letter (OWASP Magic Bytes)', async () => {
    const fd = new FormData();
    const fakeBlob = new Blob(['texto falso disfrazado de foto'], { type: 'image/png' });
    fd.append('image', fakeBlob, 'falsa-carta.png');

    const res = await fetch(`${baseUrl}/api/scan/letter`, { method: 'POST', body: fd });
    assert.equal(res.status, 400);
  });

  it('escanea una carta en papel reconociendo texto en español y extrayendo el dibujo automáticamente + recorte manual', async () => {
    const letterSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100">
      <rect width="900" height="1100" fill="#ffffff"/>
      <text x="90" y="130" font-family="serif" font-size="44" fill="#111111">Carta de Octubre</text>
      <text x="90" y="235" font-family="serif" font-size="34" fill="#111111">Bajo el arbol azul crecen las raices</text>
      <text x="90" y="295" font-family="serif" font-size="34" fill="#111111">de cada palabra escrita a mano.</text>
      <text x="90" y="390" font-family="serif" font-size="30" fill="#111111">— Con amor</text>
      <circle cx="450" cy="760" r="145" fill="none" stroke="#000000" stroke-width="9"/>
      <path d="M365 735 Q450 630 535 735 Q450 855 365 735 Z" fill="none" stroke="#000000" stroke-width="7"/>
      <path d="M450 615 L450 905 M305 760 L595 760" stroke="#000000" stroke-width="5"/>
    </svg>`;

    const pngBuf = await sharp(Buffer.from(letterSvg)).png().toBuffer();

    // 1) Full scan: Spanish OCR + automatic drawing detection
    const scanForm = new FormData();
    scanForm.append('image', new Blob([pngBuf], { type: 'image/png' }), 'carta-prueba.png');
    scanForm.append('lang', 'spa');
    scanForm.append('enhanceMode', 'standard');
    scanForm.append('detectDrawing', 'true');
    scanForm.append('drawingMode', 'ink');

    const scanRes = await fetch(`${baseUrl}/api/scan/letter`, { method: 'POST', body: scanForm });
    assert.equal(scanRes.status, 200);
    const scanData = await scanRes.json();
    assert.equal(scanData.ok, true);
    assert.ok(scanData.ocr.confidence >= 60, `Confianza OCR inesperadamente baja: ${scanData.ocr.confidence}`);
    assert.ok(
      scanData.ocr.fullText.toLowerCase().includes('octubre'),
      `Debe reconocer el título: ${scanData.ocr.fullText}`
    );
    assert.ok(
      scanData.ocr.fullText.toLowerCase().includes('palabra'),
      `Debe reconocer los versos: ${scanData.ocr.fullText}`
    );
    assert.equal(scanData.drawing.detected, true, 'Debe detectar automáticamente el dibujo inferior');
    assert.ok(scanData.drawing.asset?.url?.startsWith('/storage/engravings/'), 'Debe guardar el dibujo en /storage/engravings/');
    assert.equal(scanData.drawing.asset.dpi, 300);
    trackAssetUrl(scanData.drawing.asset.url);

    // 2) Manual crop extraction
    const cropForm = new FormData();
    cropForm.append('image', new Blob([pngBuf], { type: 'image/png' }), 'carta-prueba.png');
    cropForm.append('xPct', '30');
    cropForm.append('yPct', '54');
    cropForm.append('widthPct', '40');
    cropForm.append('heightPct', '32');
    cropForm.append('mode', 'engraving');

    const cropRes = await fetch(`${baseUrl}/api/scan/extract-drawing`, { method: 'POST', body: cropForm });
    assert.equal(cropRes.status, 200);
    const cropData = await cropRes.json();
    assert.equal(cropData.ok, true);
    assert.ok(cropData.asset?.url?.startsWith('/storage/engravings/'));
    assert.equal(cropData.asset.dpi, 300);
    trackAssetUrl(cropData.asset.url);
  });
});

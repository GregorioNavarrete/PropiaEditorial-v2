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

describe('Editorial Personal — Logo, Pestañas de Cámara No Bloqueantes y Motor Neuronal PP-OCRv5', () => {
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

  it('sirve la marca "Editorial Personal", el logo PNG y el modal desplazable con pestañas separadas Archivo/Cámara', async () => {
    const htmlRes = await fetch(`${baseUrl}/`);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.ok(html.includes('Editorial Personal'), 'Debe mostrar el nombre Editorial Personal');
    assert.ok(
      html.includes('/img/editorial-personal-logo.png'),
      'Debe referenciar el logo /img/editorial-personal-logo.png'
    );
    assert.ok(
      html.includes('sl-modal-dialog scanner-modal-card'),
      'El modal del escáner debe usar sl-modal-dialog con scroll y fondo crema'
    );
    assert.ok(html.includes('scannerTabBtnUpload') && html.includes('scannerTabBtnCamera'));

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

  it('reconoce con PP-OCRv5 una carta inclinada, con sombra y renglones en español (ñ, tildes, ¿) y separa el dibujo a 300 DPI', async () => {
    // Tough realistic letter: dark desk background, -2.5° tilted paper, diagonal shadow, ruled blue lines, italic serif + Spanish accents + hand-drawn emblem
    const shadowedLetterSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1220">
      <defs>
        <linearGradient id="paperShadow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f5f0e5"/>
          <stop offset="55%" stop-color="#d4cdb9"/>
          <stop offset="100%" stop-color="#8f8878"/>
        </linearGradient>
      </defs>
      <rect width="1000" height="1220" fill="#2c2927"/>
      <g transform="translate(55,45) rotate(-2.2, 440, 560)">
        <rect width="890" height="1120" fill="url(#paperShadow)"/>
        <line x1="45" y1="160" x2="845" y2="160" stroke="#a9bed6" stroke-width="1.5"/>
        <line x1="45" y1="255" x2="845" y2="255" stroke="#a9bed6" stroke-width="1.5"/>
        <line x1="45" y1="325" x2="845" y2="325" stroke="#a9bed6" stroke-width="1.5"/>
        <line x1="45" y1="395" x2="845" y2="395" stroke="#a9bed6" stroke-width="1.5"/>
        <line x1="45" y1="490" x2="845" y2="490" stroke="#a9bed6" stroke-width="1.5"/>
        <text x="80" y="148" font-family="serif" font-style="italic" font-size="44" fill="#232b3d">Carta de Otoño</text>
        <text x="80" y="245" font-family="serif" font-style="italic" font-size="34" fill="#232b3d">¿Cuántos sueños caben en un pequeño papel?</text>
        <text x="80" y="315" font-family="serif" font-style="italic" font-size="34" fill="#232b3d">Mañana volverán los pájaros al jardín</text>
        <text x="80" y="385" font-family="serif" font-style="italic" font-size="34" fill="#232b3d">donde escribimos nuestra canción.</text>
        <text x="80" y="480" font-family="serif" font-style="italic" font-size="30" fill="#232b3d">— Con cariño, Sofía</text>
        <circle cx="445" cy="805" r="135" fill="none" stroke="#1e222b" stroke-width="8"/>
        <path d="M365 785 Q445 680 525 785 Q445 895 365 785 Z" fill="none" stroke="#1e222b" stroke-width="6"/>
        <path d="M445 670 L445 940 M310 805 L580 805" stroke="#1e222b" stroke-width="5"/>
      </g>
    </svg>`;

    const jpegBuf = await sharp(Buffer.from(shadowedLetterSvg)).jpeg({ quality: 84 }).toBuffer();

    const scanForm = new FormData();
    scanForm.append('image', new Blob([jpegBuf], { type: 'image/jpeg' }), 'carta-sombra.jpg');
    scanForm.append('lang', 'spa');
    scanForm.append('enhanceMode', 'shadow');
    scanForm.append('detectDrawing', 'true');
    scanForm.append('drawingMode', 'ink');

    const scanRes = await fetch(`${baseUrl}/api/scan/letter`, { method: 'POST', body: scanForm });
    assert.equal(scanRes.status, 200);
    const scanData = await scanRes.json();
    assert.equal(scanData.ok, true);
    assert.equal(scanData.ocr.engine, 'pp-ocrv5-neural');
    assert.ok(scanData.ocr.confidence >= 80, `Confianza baja: ${scanData.ocr.confidence}`);

    const lower = scanData.ocr.fullText.toLowerCase();
    assert.ok(lower.includes('otoño'), `Debe reconocer "Otoño" con ñ: ${scanData.ocr.fullText}`);
    assert.ok(lower.includes('sueños') && lower.includes('pequeño'), `Debe reconocer ñ múltiples: ${scanData.ocr.fullText}`);
    assert.ok(lower.includes('canción'), `Debe reconocer tildes: ${scanData.ocr.fullText}`);
    assert.ok(!/\n[Oo0]$/m.test(scanData.ocr.fullText.trim()), `No debe alucinar "O" por el círculo dibujado: ${scanData.ocr.fullText}`);

    assert.equal(scanData.drawing.detected, true, 'Debe separar automáticamente el dibujo incluso con sombra en el papel');
    assert.ok(scanData.drawing.asset?.url?.startsWith('/storage/engravings/'));
    assert.equal(scanData.drawing.asset.dpi, 300);
    trackAssetUrl(scanData.drawing.asset.url);

    // Manual crop extraction with illumination leveling
    const cropForm = new FormData();
    cropForm.append('image', new Blob([jpegBuf], { type: 'image/jpeg' }), 'carta-sombra.jpg');
    cropForm.append('xPct', '30');
    cropForm.append('yPct', '55');
    cropForm.append('widthPct', '40');
    cropForm.append('heightPct', '32');
    cropForm.append('mode', 'ink');

    const cropRes = await fetch(`${baseUrl}/api/scan/extract-drawing`, { method: 'POST', body: cropForm });
    assert.equal(cropRes.status, 200);
    const cropData = await cropRes.json();
    assert.equal(cropData.ok, true);
    assert.ok(cropData.asset?.url?.startsWith('/storage/engravings/'));
    assert.equal(cropData.asset.dpi, 300);
    trackAssetUrl(cropData.asset.url);
  });
});

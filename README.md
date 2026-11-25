# Editorial Personal — Carpeta `/home/antigravity/libros`

El proyecto completo correspondiente a las **Fases 1 a 5 + Identidad "Editorial Personal" + Escáner de Cartas en Papel (OCR + Dibujos)** ha sido desplegado y verificado dentro de `/home/antigravity/libros`.

## Novedades recientes
- **Marca y Logo "Editorial Personal" (`public/img/editorial-personal-logo.png`, `src/views/index.ejs`, `src/services/pdfService.js`):**
  - Emblema limpio en la barra superior, título editorial y metadatos de los PDFs generados.
- **Escáner de Cartas en Papel (`src/services/paperScannerService.js`, `public/js/paperScannerModal.js`, `POST /api/scan/letter`, `POST /api/scan/extract-drawing`):**
  - Botón **Escanear Carta** en la barra superior y en el lienzo del Estudio.
  - Acepta foto/escaneo (JPG/PNG/WebP), cámara del celular (`capture="environment"`) y cámara en vivo.
  - Reconoce el texto en español con `tesseract.js` (modelo `spa.traineddata` cacheado localmente en `storage/ocr/`), separa automáticamente **Título**, **Versos/Texto** y **Firma** editables.
  - Detecta y extrae automáticamente dibujos hechos a mano en la carta a **300 DPI en tinta B&N**, e incluye recorte manual arrastrando un recuadro sobre cualquier dibujo o firma de la foto para pasarlo directo a la página actual o a una nueva página.

## Novedades de Fase 5 — Exportación PDF 1:1 Cero-Configuración
- **Exportación PDF 1:1 para Imprenta (`src/services/pdfService.js`, `GET /api/books/:id/export/press.pdf`):**
  - PDF listo para imprimir en puntos PostScript exactos (`sheetWidthPt × sheetHeightPt`, tolerancia `< 0.05 pt`, márgenes `0`) con imposición multi-formato, rotación `180°` en fanzines, SVGs, grabados PNG, imágenes extra arrastradas y guías de corte/plegado.
- **Guía Técnica de Armado (`GET /api/books/:id/export/guide.pdf`):**
  - PDF A4 con instrucciones exactas para el impresor (escala `100% / tamaño real`, sin ajustar a página, dúplex borde corto/largo o simple faz), mapa visual de pliegos y pasos de plegado/corte.

## Comandos de Prueba dentro de `/home/antigravity/libros`
```bash
cd /home/antigravity/libros

# Auditar sistema Switch-Lit + ejecutar las 19 pruebas integrales
npm run qa

# Iniciar el servidor Express en el puerto 3000
npm start
```

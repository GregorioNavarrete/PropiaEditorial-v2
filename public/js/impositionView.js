/**
 * Phase 4 Multi-Format Imposition, Reading Simulator & Folding/Cutting Guide View Controller.
 * Consumes /shared/impositionEngine.js deterministically to render:
 * 1) Assembled Book Reading Simulator
 * 2) Exact Front/Back Imposition Sheets (with foldLinesMm, cutLinesMm, 180° zine rotation, mm & pt)
 * 3) Step-by-step Switch-Lit SVG Folding, Cutting & Binding Guide
 */

import { imposeBookSpreads } from '/shared/impositionEngine.js';
import { buildPageElementMarkup } from './pageRenderer.js';
import { renderBookSimulator } from './simulator/bookSimulator.js';

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Normalizes a fold/cut line descriptor into exact { x1, y1, x2, y2, label } coordinates in mm.
 */
function resolveLineCoordsMm(line, sheetW, sheetH) {
  if (!line || typeof line !== 'object') return null;

  const x1 = line.x1Mm ?? line.x1;
  const y1 = line.y1Mm ?? line.y1;
  const x2 = line.x2Mm ?? line.x2;
  const y2 = line.y2Mm ?? line.y2;

  if ([x1, y1, x2, y2].every((n) => Number.isFinite(Number(n)))) {
    return {
      x1: Number(x1),
      y1: Number(y1),
      x2: Number(x2),
      y2: Number(y2),
      label: line.label || ''
    };
  }

  const axis = String(line.axis || line.orientation || '').toLowerCase();
  const pos = Number(line.posMm ?? line.atMm ?? line.positionMm ?? line.offsetMm ?? line.mm);
  if (!Number.isFinite(pos)) return null;

  if (axis === 'vertical' || axis === 'x' || axis === 'v') {
    return { x1: pos, y1: 0, x2: pos, y2: sheetH, label: line.label || '' };
  }
  if (axis === 'horizontal' || axis === 'y' || axis === 'h') {
    return { x1: 0, y1: pos, x2: sheetW, y2: pos, label: line.label || '' };
  }
  return null;
}

/**
 * Builds an SVG overlay for fold lines (dashed press-black) and cut lines (editorial scissors mark).
 */
function buildSheetMarksOverlaySvg(side, sheet, imposition) {
  const w = Number(side.sheetWidthMm ?? sheet?.sheetWidthMm ?? imposition?.sheetWidthMm) || 297;
  const h = Number(side.sheetHeightMm ?? sheet?.sheetHeightMm ?? imposition?.sheetHeightMm) || 210;
  const foldLines = Array.isArray(side.foldLinesMm)
    ? side.foldLinesMm
    : Array.isArray(imposition?.foldLinesMm)
      ? imposition.foldLinesMm
      : [];
  const cutLines = Array.isArray(side.cutLinesMm)
    ? side.cutLinesMm
    : Array.isArray(imposition?.cutLinesMm)
      ? imposition.cutLinesMm
      : [];

  const foldSvg = foldLines
    .map((ln) => {
      const c = resolveLineCoordsMm(ln, w, h);
      if (!c) return '';
      return `<line x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}" stroke="#000000" stroke-width="1.2" stroke-dasharray="4 3" />`;
    })
    .join('');

  const cutSvg = cutLines
    .map((ln) => {
      const c = resolveLineCoordsMm(ln, w, h);
      if (!c) return '';
      const mx = ((c.x1 + c.x2) / 2).toFixed(1);
      const my = ((c.y1 + c.y2) / 2).toFixed(1);
      return `
        <line x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}" stroke="#b91c1c" stroke-width="1.5" stroke-dasharray="2.5 2" />
        <circle cx="${mx}" cy="${my}" r="4.8" fill="#ffffff" stroke="#b91c1c" stroke-width="0.9" />
        <text x="${mx}" y="${Number(my) + 1.8}" text-anchor="middle" font-size="5.5" font-weight="700" fill="#b91c1c">✂</text>
      `;
    })
    .join('');

  if (!foldSvg && !cutSvg) return '';

  return `
    <svg
      class="imposition-marks-svg"
      viewBox="0 0 ${w} ${h}"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      ${foldSvg}
      ${cutSvg}
    </svg>
  `;
}

/**
 * Renders pure Switch-Lit B&W SVG instructional diagrams per format.
 */
function buildFormatDiagramSvg(formatId) {
  if (formatId === 'single_sheet_zine') {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 170" width="100%" height="100%" fill="none">
        <!-- Paso 1: Hoja horizontal 4x2 con corte central -->
        <g transform="translate(10,16)">
          <rect x="0" y="0" width="150" height="96" fill="#ffffff" stroke="#000000" stroke-width="1.8"/>
          <line x1="0" y1="48" x2="150" y2="48" stroke="#000000" stroke-width="1.1" stroke-dasharray="4 3"/>
          <line x1="37.5" y1="0" x2="37.5" y2="96" stroke="#000000" stroke-width="1.1" stroke-dasharray="4 3"/>
          <line x1="75" y1="0" x2="75" y2="96" stroke="#000000" stroke-width="1.1" stroke-dasharray="4 3"/>
          <line x1="112.5" y1="0" x2="112.5" y2="96" stroke="#000000" stroke-width="1.1" stroke-dasharray="4 3"/>
          <line x1="37.5" y1="48" x2="112.5" y2="48" stroke="#b91c1c" stroke-width="2.6"/>
          <text x="75" y="42" text-anchor="middle" font-size="11" font-weight="700" fill="#b91c1c">✂ CORTE CENTRAL</text>
          <text x="75" y="118" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">1. Doblar + cortar centro</text>
        </g>
        <path d="M174,64 L196,64" stroke="#000000" stroke-width="1.8"/>
        <polygon points="196,64 190,60 190,68" fill="#000000"/>
        <!-- Paso 2: Cruz / Rombo abierto -->
        <g transform="translate(208,16)">
          <path d="M15,48 L50,24 L110,24 L145,48 L110,72 L50,72 Z" fill="#edfe5e" stroke="#000000" stroke-width="1.6"/>
          <line x1="50" y1="24" x2="50" y2="72" stroke="#000000" stroke-width="1.2" stroke-dasharray="3 2"/>
          <line x1="110" y1="24" x2="110" y2="72" stroke="#000000" stroke-width="1.2" stroke-dasharray="3 2"/>
          <text x="80" y="52" text-anchor="middle" font-size="10.5" font-weight="700" fill="#000000">EMPUJAR EN CRUZ</text>
          <text x="80" y="118" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">2. Plegar en W / cruz</text>
        </g>
        <path d="M366,64 L388,64" stroke="#000000" stroke-width="1.8"/>
        <polygon points="388,64 382,60 382,68" fill="#000000"/>
        <!-- Paso 3: Librito cerrado -->
        <g transform="translate(404,16)">
          <rect x="26" y="8" width="66" height="88" fill="#ffffff" stroke="#000000" stroke-width="2"/>
          <line x1="34" y1="8" x2="34" y2="96" stroke="#000000" stroke-width="1.4"/>
          <text x="64" y="48" text-anchor="middle" font-size="10.5" font-weight="700" fill="#000000">FANZINE</text>
          <text x="64" y="63" text-anchor="middle" font-size="10" fill="#000000">8 PÁGS.</text>
          <text x="60" y="118" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">3. Sin grapas ni hilo</text>
        </g>
      </svg>
    `;
  }

  if (formatId === 'pocket_quarter') {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 170" width="100%" height="100%" fill="none">
        <g transform="translate(20,14)">
          <rect x="0" y="0" width="104" height="114" fill="#ffffff" stroke="#000000" stroke-width="1.8"/>
          <line x1="52" y1="0" x2="52" y2="114" stroke="#000000" stroke-width="1.2" stroke-dasharray="4 3"/>
          <line x1="0" y1="57" x2="104" y2="57" stroke="#b91c1c" stroke-width="2.4" stroke-dasharray="3 2"/>
          <text x="52" y="52" text-anchor="middle" font-size="10.5" font-weight="700" fill="#b91c1c">✂ 1 CORTE HORIZONTAL</text>
          <text x="52" y="136" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">1. Imprimir frente/dorso + cortar</text>
        </g>
        <path d="M148,70 L176,70" stroke="#000000" stroke-width="1.8"/>
        <polygon points="176,70 170,66 170,74" fill="#000000"/>
        <g transform="translate(194,20)">
          <rect x="0" y="0" width="120" height="44" fill="#bed4fb" stroke="#000000" stroke-width="1.6"/>
          <line x1="60" y1="0" x2="60" y2="44" stroke="#000000" stroke-width="1.4" stroke-dasharray="3 2"/>
          <rect x="0" y="54" width="120" height="44" fill="#edfe5e" stroke="#000000" stroke-width="1.6"/>
          <line x1="60" y1="54" x2="60" y2="98" stroke="#000000" stroke-width="1.4" stroke-dasharray="3 2"/>
          <text x="60" y="130" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">2. Doblar tiras e insertar</text>
        </g>
        <path d="M338,70 L366,70" stroke="#000000" stroke-width="1.8"/>
        <polygon points="366,70 360,66 360,74" fill="#000000"/>
        <g transform="translate(392,16)">
          <rect x="20" y="8" width="76" height="98" fill="#ffffff" stroke="#000000" stroke-width="2"/>
          <line x1="20" y1="36" x2="28" y2="36" stroke="#000000" stroke-width="2"/>
          <line x1="20" y1="78" x2="28" y2="78" stroke="#000000" stroke-width="2"/>
          <text x="58" y="54" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">BOLSILLO</text>
          <text x="58" y="70" text-anchor="middle" font-size="10" fill="#000000">1/4 HOJA</text>
          <text x="58" y="134" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">3. Grapar o coser lomo</text>
        </g>
      </svg>
    `;
  }

  if (formatId === 'custom_nup') {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 170" width="100%" height="100%" fill="none">
        <g transform="translate(18,16)">
          <rect x="0" y="0" width="144" height="100" fill="#ffffff" stroke="#000000" stroke-width="1.8"/>
          <rect x="14" y="12" width="52" height="76" fill="#bed4fb" stroke="#b91c1c" stroke-width="1.3" stroke-dasharray="3 2"/>
          <rect x="78" y="12" width="52" height="76" fill="#bed4fb" stroke="#b91c1c" stroke-width="1.3" stroke-dasharray="3 2"/>
          <text x="72" y="120" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">1. Imprimir frente &amp; dorso espejado</text>
        </g>
        <path d="M180,66 L208,66" stroke="#000000" stroke-width="1.8"/>
        <polygon points="208,66 202,62 202,70" fill="#000000"/>
        <g transform="translate(224,18)">
          <rect x="10" y="10" width="56" height="80" fill="#edfe5e" stroke="#b91c1c" stroke-width="1.6" stroke-dasharray="3 2"/>
          <rect x="82" y="10" width="56" height="80" fill="#edfe5e" stroke="#b91c1c" stroke-width="1.6" stroke-dasharray="3 2"/>
          <text x="74" y="54" text-anchor="middle" font-size="13" font-weight="700" fill="#b91c1c">✂</text>
          <text x="74" y="118" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">2. Cortar por marcas exactas</text>
        </g>
        <path d="M384,66 L412,66" stroke="#000000" stroke-width="1.8"/>
        <polygon points="412,66 406,62 406,70" fill="#000000"/>
        <g transform="translate(428,16)">
          <rect x="16" y="10" width="76" height="90" fill="#ffffff" stroke="#000000" stroke-width="2"/>
          <line x1="22" y1="10" x2="22" y2="100" stroke="#000000" stroke-width="1.5"/>
          <text x="56" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#000000">A MEDIDA</text>
          <text x="54" y="120" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">3. Apilar y encuadernar</text>
        </g>
      </svg>
    `;
  }

  // Default: saddle_half (Cuadernillo Clásico 1/2 hoja)
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 170" width="100%" height="100%" fill="none">
      <g transform="translate(16,18)">
        <rect x="0" y="0" width="146" height="98" fill="#ffffff" stroke="#000000" stroke-width="1.8"/>
        <line x1="73" y1="0" x2="73" y2="98" stroke="#000000" stroke-width="1.6" stroke-dasharray="4 3"/>
        <text x="36" y="54" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">DORSO</text>
        <text x="110" y="54" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">TAPA</text>
        <text x="73" y="118" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">1. Imprimir doble faz (borde corto)</text>
      </g>
      <path d="M180,67 L206,67" stroke="#000000" stroke-width="1.8"/>
      <polygon points="206,67 200,63 200,71" fill="#000000"/>
      <g transform="translate(222,22)">
        <polygon points="10,74 72,88 72,14 10,2" fill="#edfe5e" stroke="#000000" stroke-width="1.6"/>
        <polygon points="72,88 134,74 134,2 72,14" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
        <line x1="72" y1="14" x2="72" y2="88" stroke="#000000" stroke-width="2"/>
        <text x="72" y="114" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">2. Encartar y doblar al medio</text>
      </g>
      <path d="M374,67 L400,67" stroke="#000000" stroke-width="1.8"/>
      <polygon points="400,67 394,63 394,71" fill="#000000"/>
      <g transform="translate(420,16)">
        <rect x="18" y="4" width="76" height="102" fill="#ffffff" stroke="#000000" stroke-width="2"/>
        <line x1="18" y1="34" x2="26" y2="34" stroke="#000000" stroke-width="2.2"/>
        <line x1="18" y1="76" x2="26" y2="76" stroke="#000000" stroke-width="2.2"/>
        <text x="58" y="54" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">CUADERNILLO</text>
        <text x="56" y="120" text-anchor="middle" font-size="11" font-weight="700" fill="#000000">3. Grapas o costura en lomo</text>
      </g>
    </svg>
  `;
}

/**
 * Renders the Imposition Sheets tab (every physical front/back side).
 */
function renderImpositionSheetsPanel(containerEl, { book, imposition, previewMode, onTogglePreviewMode }) {
  if (!containerEl || !imposition) return;

  const geo = imposition.geometry;
  const sheets = imposition.sheets || [];
  const flipInstruction = !geo.duplex
    ? 'Impresión a 1 sola cara (simple faz)'
    : geo.flipEdge === 'short'
      ? 'Impresión Doble Faz · Voltear por Borde Corto'
      : 'Impresión Doble Faz · Voltear por Borde Largo';

  const paddingBadge = imposition.blankPaddingCount > 0
    ? `<span class="sl-pill sl-pill--lime">+${imposition.blankPaddingCount} pág(s). de cortesía en blanco</span>`
    : `<span class="sl-pill sl-pill--spring">Pliego exacto sin blancos extra</span>`;

  const sheetsHtml = sheets
    .map((sheet, sIdx) => {
      const sheetNum = sheet.sheetNumber || sIdx + 1;
      const sidesHtml = (sheet.sides || [])
        .map((side) => {
          const sheetW = Number(side.sheetWidthMm ?? sheet.sheetWidthMm ?? imposition.sheetWidthMm) || 297;
          const sheetH = Number(side.sheetHeightMm ?? sheet.sheetHeightMm ?? imposition.sheetHeightMm) || 210;
          const sheetWPt = side.sheetWidthPt ?? sheet.sheetWidthPt ?? imposition.sheetWidthPt;
          const sheetHPt = side.sheetHeightPt ?? sheet.sheetHeightPt ?? imposition.sheetHeightPt;
          const sideTitle = side.label || side.sideLabel || (side.sideType === 'back' ? 'Dorso' : 'Frente');
          const foldLines = Array.isArray(side.foldLinesMm)
            ? side.foldLinesMm
            : Array.isArray(imposition.foldLinesMm)
              ? imposition.foldLinesMm
              : [];
          const cutLines = Array.isArray(side.cutLinesMm)
            ? side.cutLinesMm
            : Array.isArray(imposition.cutLinesMm)
              ? imposition.cutLinesMm
              : [];

          const hasExplicitXY = (side.cells || []).every(
            (c) => Number.isFinite(Number(c.xMm)) && Number.isFinite(Number(c.yMm))
          );

          const cellsMarkup = (side.cells || [])
            .map((cell) => {
              const rot = Number(cell.rotationDeg) || 0;
              const isBlank = Boolean(cell.isBlankPadding || !cell.pageNumber);
              const posStyle = hasExplicitXY
                ? `position: absolute; left: ${((cell.xMm / sheetW) * 100).toFixed(3)}%; top: ${((cell.yMm / sheetH) * 100).toFixed(3)}%; width: ${((cell.widthMm / sheetW) * 100).toFixed(3)}%; height: ${((cell.heightMm / sheetH) * 100).toFixed(3)}%;`
                : '';

              let innerHtml = '';
              if (isBlank) {
                innerHtml = `
                  <div class="imposition-cell__blank">
                    <span>Blanca</span>
                    <small>${cell.widthMm} × ${cell.heightMm} mm</small>
                  </div>
                `;
              } else if (previewMode === 'real' && cell.page) {
                const pageMarkup = buildPageElementMarkup({
                  page: cell.page,
                  geometry: geo,
                  bookSubtitle: book.subtitle || '',
                  scaleMode: 'proportional',
                  interactive: false
                });
                innerHtml = `
                  <div class="imposition-cell__mini-page">
                    ${pageMarkup}
                  </div>
                  <span class="imposition-cell__folio-tag">Pág. ${escapeHtml(cell.displayPageNumber)}${rot ? ` · ${rot}°` : ''}</span>
                `;
              } else {
                const titleText = cell.page?.title || cell.page?.role || `Página ${cell.displayPageNumber}`;
                innerHtml = `
                  <div class="imposition-cell__schema">
                    <strong class="imposition-cell__num">Pág. ${escapeHtml(cell.displayPageNumber)}</strong>
                    <span class="imposition-cell__role">${escapeHtml(titleText)}</span>
                    <span class="imposition-cell__dims">${cell.widthMm} × ${cell.heightMm} mm</span>
                    <span class="imposition-cell__pts">${cell.widthPt} × ${cell.heightPt} pt</span>
                    ${rot ? `<span class="sl-pill sl-pill--cornflower" style="font-size: 9px; padding: 1px 6px;">↻ ${rot}°</span>` : ''}
                  </div>
                `;
              }

              return `
                <div
                  class="imposition-cell ${isBlank ? 'is-blank' : ''} ${rot ? 'is-rotated' : ''}"
                  style="${posStyle}"
                  title="${isBlank ? 'Página blanca de cortesía' : `Página ${cell.displayPageNumber} (${cell.widthMm} × ${cell.heightMm} mm / ${cell.widthPt} × ${cell.heightPt} pt)`}"
                >
                  <div class="imposition-cell__rotator" style="${rot ? `transform: rotate(${rot}deg);` : ''}">
                    ${innerHtml}
                  </div>
                </div>
              `;
            })
            .join('');

          const stageStyle = hasExplicitXY
            ? `aspect-ratio: ${sheetW} / ${sheetH}; position: relative;`
            : `aspect-ratio: ${sheetW} / ${sheetH}; display: grid; grid-template-columns: repeat(${side.cols}, 1fr); grid-template-rows: repeat(${side.rows}, 1fr); position: relative;`;

          const marksSvg = buildSheetMarksOverlaySvg(side, sheet, imposition);

          return `
            <article class="imposition-side-card">
              <div class="imposition-side-card__head">
                <div>
                  <span class="sl-eyebrow">Hoja ${sheetNum} · ${escapeHtml(side.sideType === 'back' ? 'Dorso (Reverso)' : 'Frente (Anverso)')}</span>
                  <h4 class="sl-card-heading" style="font-size: 15px; margin-top: 2px;">${escapeHtml(sideTitle)}</h4>
                </div>
                <div class="imposition-side-card__specs">
                  <span>${sheetW} × ${sheetH} mm</span>
                  <small>${sheetWPt} × ${sheetHPt} pt</small>
                </div>
              </div>

              <div class="imposition-sheet-stage">
                <div class="imposition-sheet-paper ${hasExplicitXY ? 'is-exact-mm' : ''}" style="${stageStyle}">
                  ${cellsMarkup}
                  ${marksSvg}
                </div>
              </div>

              <div class="imposition-side-legend">
                <span>--- Pliegue (${foldLines.length})</span>
                <span><strong style="color: #b91c1c;">✂</strong> Corte (${cutLines.length})</span>
                <span>Grilla ${side.cols}×${side.rows} (${side.cells?.length || 0} celdas)</span>
              </div>
            </article>
          `;
        })
        .join('');

      return `
        <section class="imposition-sheet-group">
          <div class="imposition-sheet-group__title">
            <span class="sl-pill sl-pill--cornflower">Hoja Física ${sheetNum} de ${sheets.length}</span>
            <span class="sl-muted">${escapeHtml(geo.paperName)}</span>
          </div>
          <div class="imposition-sides-grid">
            ${sidesHtml}
          </div>
        </section>
      `;
    })
    .join('');

  containerEl.innerHTML = `
    <div class="imposition-sheets-header">
      <div>
        <span class="sl-eyebrow">Imposición Exacta Frente / Dorso</span>
        <p style="margin: 4px 0 0; font-size: 12.5px;">
          ${escapeHtml(imposition.printerSummary || `${imposition.sheetCount} hoja(s) física(s) ${geo.paperId} · ${flipInstruction}`)}
        </p>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
          <span class="sl-pill">${escapeHtml(flipInstruction)}</span>
          <span class="sl-pill sl-pill--cornflower">${geo.pageWidthMm} × ${geo.pageHeightMm} mm (${geo.pageWidthPt} × ${geo.pageHeightPt} pt)</span>
          ${paddingBadge}
        </div>
      </div>

      <button type="button" id="btnToggleImpositionMode" class="sl-btn sl-btn--sm sl-btn--lime">
        ${previewMode === 'real' ? 'Ver Esquema Técnico (Folios & pt)' : 'Ver Miniaturas Reales de Poemas'}
      </button>
    </div>

    <div class="imposition-sheets-list">
      ${sheetsHtml}
    </div>
  `;

  containerEl.querySelector('#btnToggleImpositionMode')?.addEventListener('click', () => {
    onTogglePreviewMode?.(previewMode === 'real' ? 'schematic' : 'real');
  });
}

/**
 * Renders the Step-by-Step Folding, Cutting & Binding Guide with Switch-Lit SVG diagrams.
 */
function renderFoldingGuidePanel(containerEl, { imposition }) {
  if (!containerEl || !imposition) return;

  const geo = imposition.geometry;
  const guide = imposition.foldingGuide || {};
  const steps = Array.isArray(guide.steps) ? guide.steps : [];
  const diagramSvg = buildFormatDiagramSvg(geo.formatId);

  const stepsHtml = steps
    .map((step, idx) => {
      if (typeof step === 'string') {
        return `
          <li class="folding-step-card">
            <span class="folding-step-num">${idx + 1}</span>
            <div>
              <p style="margin: 0; font-size: 13px; line-height: 1.45;">${escapeHtml(step)}</p>
            </div>
          </li>
        `;
      }
      const num = step.stepNumber || step.step || idx + 1;
      const title = step.title || `Paso ${num}`;
      const desc = step.description || step.detail || step.instruction || '';
      const tip = step.tip || step.note || '';
      return `
        <li class="folding-step-card">
          <span class="folding-step-num">${escapeHtml(num)}</span>
          <div>
            <strong style="display: block; font-size: 13.5px; margin-bottom: 3px;">${escapeHtml(title)}</strong>
            <p style="margin: 0; font-size: 12.5px; line-height: 1.45;">${escapeHtml(desc)}</p>
            ${tip ? `<p class="sl-muted" style="margin: 5px 0 0; font-size: 11.5px;">💡 ${escapeHtml(tip)}</p>` : ''}
          </div>
        </li>
      `;
    })
    .join('');

  containerEl.innerHTML = `
    <div class="folding-guide-wrap">
      <div class="sl-accent-card sl-accent-card--cornflower" style="padding: 14px;">
        <span class="sl-eyebrow">Esquema Visual de Armado Artesanal</span>
        <h3 class="sl-card-heading" style="margin: 3px 0 6px;">${escapeHtml(guide.title || geo.formatName)}</h3>
        <p style="margin: 0 0 12px; font-size: 12.5px; line-height: 1.45;">
          ${escapeHtml(guide.summary || geo.bindingMethod)}
        </p>

        <div class="folding-diagram-stage">
          ${diagramSvg}
        </div>
      </div>

      <div>
        <span class="sl-eyebrow" style="display: block; margin-bottom: 8px;">Instrucciones Paso a Paso</span>
        <ol class="folding-steps-list">
          ${stepsHtml}
        </ol>
      </div>
    </div>
  `;
}

/**
 * Main orchestrator for View 3 (`#viewFormats`): Imposition + Book Simulator + Folding Guide.
 */
export function renderImpositionFormatsView({
  book,
  geometry,
  activeSubView = 'simulator',
  activeSpreadIndex = 0,
  previewMode = 'real',
  onChangeSubView,
  onChangeSpread,
  onTogglePreviewMode
}) {
  if (!book) return;

  const imposition = imposeBookSpreads({
    pages: book.pages || [],
    paperId: book.paperId,
    formatId: book.formatId,
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm
  });

  const exportSummaryEl = document.getElementById('exportDuplexSummary');
  if (exportSummaryEl && imposition) {
    const geo = imposition.geometry || geometry;
    const fallbackFlip = !geo?.duplex
      ? 'Impresión a 1 sola cara (simple faz)'
      : geo.flipEdge === 'short'
        ? 'Impresión Doble Faz · Voltear por Borde Corto'
        : 'Impresión Doble Faz · Voltear por Borde Largo';
    exportSummaryEl.textContent =
      imposition.printerSummary ||
      `${imposition.sheetCount} hoja(s) física(s) ${geo?.paperId || book.paperId} · ${fallbackFlip}`;
  }

  const subTabs = [
    { id: 'simulator', btnId: 'fmtSubTabSimulator', panelId: 'fmtPanelSimulator' },
    { id: 'sheets', btnId: 'fmtSubTabSheets', panelId: 'fmtPanelSheets' },
    { id: 'guide', btnId: 'fmtSubTabGuide', panelId: 'fmtPanelGuide' }
  ];

  subTabs.forEach(({ id, btnId, panelId }) => {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    const isActive = id === activeSubView;
    btn?.classList.toggle('is-active', isActive);
    btn?.setAttribute('aria-selected', isActive ? 'true' : 'false');
    panel?.classList.toggle('is-hidden', !isActive);

    if (btn && !btn.dataset.boundSubtab) {
      btn.dataset.boundSubtab = 'true';
      btn.addEventListener('click', () => onChangeSubView?.(id));
    }
  });

  const simHost = document.getElementById('bookSimulatorContainer');
  const sheetsHost = document.getElementById('impositionSheetsContainer');
  const guideHost = document.getElementById('foldingGuideContainer');

  if (activeSubView === 'simulator' && simHost) {
    renderBookSimulator(simHost, {
      book,
      geometry: imposition.geometry || geometry,
      activeSpreadIndex,
      onChangeSpread
    });
  } else if (activeSubView === 'sheets' && sheetsHost) {
    renderImpositionSheetsPanel(sheetsHost, {
      book,
      imposition,
      previewMode,
      onTogglePreviewMode
    });
  } else if (activeSubView === 'guide' && guideHost) {
    renderFoldingGuidePanel(guideHost, { imposition });
  }

  return imposition;
}

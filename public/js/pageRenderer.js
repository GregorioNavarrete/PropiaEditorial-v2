/**
 * Physical Trim Page Renderer & Direct ContentEditable Controller.
 * Renders all 10 editorial layouts with exact geometric aspect ratio (pageWidthMm / pageHeightMm),
 * crisp #ffffff simulated sheet paper, 1px #000000 border, B&W SVG illustrations or 300-DPI engravings,
 * and zero-cursor-jump inline editing.
 */

import { PAGE_LAYOUTS, normalizeExtraImage } from '/shared/contracts.js';
import { getIllustrationById } from '/shared/illustrationsCatalog.js';

/**
 * Escapes plain text safely into HTML while preserving line breaks as <br>.
 */
export function escapePoemHtml(rawText = '') {
  return String(rawText ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

/**
 * Escapes attribute or single-line text safely.
 */
function escapeAttr(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Extracts normalized plain text with '\n' line breaks from a contenteditable element
 * without losing blank stanza lines.
 */
export function extractPlainTextFromEditable(el) {
  if (!el) return '';
  let html = el.innerHTML || '';
  html = html.replace(/<div><br\s*\/?><\/div>/gi, '\n');
  html = html.replace(/<p><br\s*\/?><\/p>/gi, '\n');
  html = html.replace(/<(div|p)[^>]*>/gi, '\n');
  html = html.replace(/<\/(div|p)>/gi, '');
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<[^>]+>/g, '');

  const decoder = document.createElement('textarea');
  decoder.innerHTML = html;
  return decoder.value.replace(/\u00a0/g, ' ').replace(/^\n/, '');
}

/**
 * Resolves the HTML markup for the primary illustration slot (custom 300-DPI engraving or vector SVG).
 */
function renderPrimaryArtMarkup(page, layoutSpec) {
  const fitClass = page.imageFit === 'cover' ? 'fit-cover' : 'fit-contain';
  if (page.customImageUrl) {
    return `<img src="${escapeAttr(page.customImageUrl)}" class="${fitClass}" alt="Grabado editorial en tinta">`;
  }

  const targetId = page.illustrationId || layoutSpec?.primaryDefaultId || null;
  if (!targetId) return '';

  const art = getIllustrationById(targetId);
  return art && art.svg ? art.svg : '';
}

/**
 * Resolves the HTML markup for the secondary ornament slot on dual-ornament templates.
 */
function renderSecondaryArtMarkup(page, layoutSpec) {
  const secId = page.secondaryIllustrationId || layoutSpec?.secondaryDefaultId || null;
  if (!secId) return '';
  const art = getIllustrationById(secId);
  return art && art.svg ? art.svg : '';
}

/**
 * Renders draggable free-positioned extra image layers attached onto the page.
 */
function renderExtraImagesMarkup(page, interactive = true, selectedExtraUid = null) {
  const extras = Array.isArray(page?.extraImages) ? page.extraImages : [];
  if (extras.length === 0) return '';

  return extras
    .map((rawItem, idx) => {
      const item = normalizeExtraImage(rawItem, idx);
      let mediaHtml = '';
      if (item.kind === 'custom' && item.customImageUrl) {
        mediaHtml = `<img src="${escapeAttr(item.customImageUrl)}" alt="${escapeAttr(item.title || 'Grabado extra')}" draggable="false">`;
      } else {
        const art = getIllustrationById(item.illustrationId || 'miniMoon');
        mediaHtml = art && art.svg ? art.svg : '';
      }

      if (!mediaHtml) return '';

      const isSelected = interactive && selectedExtraUid === item.uid;
      const controlsHtml = interactive
        ? `
          <div class="extra-layer-controls" data-extra-controls="true">
            <button type="button" class="extra-ctrl-btn" data-extra-action="shrink" data-extra-uid="${escapeAttr(item.uid)}" title="Reducir tamaño">−</button>
            <button type="button" class="extra-ctrl-btn" data-extra-action="grow" data-extra-uid="${escapeAttr(item.uid)}" title="Aumentar tamaño">+</button>
            <button type="button" class="extra-ctrl-btn" data-extra-action="rotate" data-extra-uid="${escapeAttr(item.uid)}" title="Rotar 15°">↻</button>
            <button type="button" class="extra-ctrl-btn extra-ctrl-btn--danger" data-extra-action="remove" data-extra-uid="${escapeAttr(item.uid)}" title="Quitar de la hoja">✕</button>
          </div>
        `
        : '';

      return `
        <div
          class="page-extra-art-layer ${interactive ? 'is-interactive' : ''} ${isSelected ? 'is-selected' : ''}"
          data-extra-uid="${escapeAttr(item.uid)}"
          style="left: ${item.xPct}%; top: ${item.yPct}%; width: ${item.widthPct}%; transform: rotate(${item.rotationDeg}deg);"
          ${interactive ? `title="${escapeAttr((item.title || 'Grabado extra') + ' · Arrastrá para mover')}"` : ''}
        >
          <div class="page-extra-art-layer__media">${mediaHtml}</div>
          ${controlsHtml}
        </div>
      `;
    })
    .join('');
}

/**
 * Converts a point font size (e.g. '12.5pt') to proportional screen pixels inside the canvas.
 */
function computeCanvasFontSizePx(fontSizeStr, scaleMode, scaleVsA5 = 1) {
  const pt = parseFloat(fontSizeStr) || 12.5;
  const basePx = pt * 1.18;
  if (scaleMode === 'proportional') {
    const clampedScale = Math.max(0.62, Math.min(1.18, Number(scaleVsA5) || 1));
    return `${(basePx * clampedScale).toFixed(1)}px`;
  }
  return `${basePx.toFixed(1)}px`;
}

/**
 * Builds the inner HTML of a single page according to its selected editorial template.
 */
export function buildPageElementMarkup({
  page,
  geometry,
  bookSubtitle = '',
  scaleMode = 'comfortable',
  interactive = true,
  selectedExtraUid = null
}) {
  const layoutKey = PAGE_LAYOUTS[page.layout] ? page.layout : 'butterflies';
  const layoutSpec = PAGE_LAYOUTS[layoutKey];
  const fontClass = page.font || 'font-serif-italic';
  const editableAttr = interactive ? 'contenteditable="true" spellcheck="true"' : '';

  const primaryArt = renderPrimaryArtMarkup(page, layoutSpec);
  const secondaryArt = renderSecondaryArtMarkup(page, layoutSpec);
  const extraLayersMarkup = renderExtraImagesMarkup(page, interactive, selectedExtraUid);

  const poemHtml = escapePoemHtml(page.text || '');
  const titleHtml = escapePoemHtml(page.title || '');
  const sigHtml = escapePoemHtml(page.signature || '');

  const wMm = Number(geometry?.pageWidthMm) || 148.5;
  const hMm = Number(geometry?.pageHeightMm) || 210;
  const scaleVsA5 = Number(geometry?.scaleVsA5) || 1;
  const isLandscapePage = wMm > hMm;

  let canvasMaxW = isLandscapePage ? 520 : 435;
  if (scaleMode === 'proportional') {
    canvasMaxW = Math.round((isLandscapePage ? 520 : 450) * Math.max(0.56, Math.min(1.2, scaleVsA5)));
  }

  const poemSizePx = computeCanvasFontSizePx(page.fontSize, scaleMode, scaleVsA5);
  const folioHtml = page.showPageNumber
    ? `<div class="poem-folio-number" aria-hidden="true">${escapeAttr(page.id)}</div>`
    : '';

  const inlineVars = [
    `--page-w-mm: ${wMm}`,
    `--page-h-mm: ${hMm}`,
    `--canvas-max-w: ${canvasMaxW}px`,
    `--poem-size-px: ${poemSizePx}`
  ].join('; ');

  // 1. COVER
  if (layoutKey === 'cover') {
    const eyebrowText = page.subtitle || bookSubtitle || 'Edición Artesanal en Tinta';
    const fallbackCoverArt = primaryArt || (getIllustrationById('sacredHeart')?.svg ?? '');
    return `
      <article class="poem-sheet-page poem-sheet-page--cover" data-page-id="${escapeAttr(page.id)}" style="${inlineVars}">
        <div class="cover-eyebrow">${escapeAttr(eyebrowText)}</div>
        <div class="cover-center-stack">
          <div class="sheet-art-slot cover-emblem-slot">${fallbackCoverArt}</div>
          <div ${editableAttr} data-editable-field="title" class="poem-editable-title" aria-label="Título de portada">${titleHtml || 'Título del Poemario'}</div>
          <div class="cover-rule" aria-hidden="true"></div>
          <div ${editableAttr} data-editable-field="text" class="poem-editable-verses ${escapeAttr(fontClass)}" aria-label="Epígrafe o verso de portada">${poemHtml}</div>
        </div>
        <div ${editableAttr} data-editable-field="signature" class="poem-editable-signature" style="text-transform: uppercase; letter-spacing: 0.16em;" aria-label="Autor o firma de portada">${sigHtml}</div>
        ${extraLayersMarkup}
      </article>
    `;
  }

  // 2. DEDICATION
  if (layoutKey === 'dedication') {
    const optionalMini = primaryArt
      ? `<div class="sheet-art-slot dedication-mini-slot">${primaryArt}</div>`
      : '';
    return `
      <article class="poem-sheet-page poem-sheet-page--dedication" data-page-id="${escapeAttr(page.id)}" style="${inlineVars}">
        <div class="dedication-stack">
          ${optionalMini}
          <div ${editableAttr} data-editable-field="text" class="poem-editable-verses ${escapeAttr(fontClass)}" aria-label="Texto de dedicatoria">${poemHtml}</div>
          <div class="cover-rule" style="width: 28px;" aria-hidden="true"></div>
          <div ${editableAttr} data-editable-field="signature" class="poem-editable-signature poem-editable-signature--script" aria-label="Firma de dedicatoria">${sigHtml}</div>
        </div>
        ${extraLayersMarkup}
        ${folioHtml}
      </article>
    `;
  }

  // 3. BUTTERFLIES (Foto 1: Vuelo arriba + Escena abajo derecha)
  if (layoutKey === 'butterflies') {
    const titleBlock = page.title
      ? `<div ${editableAttr} data-editable-field="title" class="poem-editable-title">${titleHtml}</div>`
      : '';
    return `
      <article class="poem-sheet-page poem-sheet-page--butterflies" data-page-id="${escapeAttr(page.id)}" style="${inlineVars}">
        <div class="sheet-art-slot butterflies-top-slot" aria-hidden="true">${secondaryArt}</div>
        <div class="butterflies-body">
          ${titleBlock}
          <div ${editableAttr} data-editable-field="text" class="poem-editable-verses ${escapeAttr(fontClass)}" aria-label="Versos del poema">${poemHtml}</div>
          <div ${editableAttr} data-editable-field="signature" class="poem-editable-signature" style="margin-top: 14px;" aria-label="Firma del poema">${sigHtml}</div>
        </div>
        <div class="sheet-art-slot butterflies-bottom-slot" aria-hidden="true">${primaryArt}</div>
        ${extraLayersMarkup}
        ${folioHtml}
      </article>
    `;
  }

  // 4. KLIMT (Foto 2: Marco vertical encuadrado a la derecha)
  if (layoutKey === 'klimt') {
    const titleBlock = page.title
      ? `<div ${editableAttr} data-editable-field="title" class="poem-editable-title">${titleHtml}</div>`
      : '';
    return `
      <article class="poem-sheet-page poem-sheet-page--klimt" data-page-id="${escapeAttr(page.id)}" style="${inlineVars}">
        <div class="klimt-verses-col">
          ${titleBlock}
          <div ${editableAttr} data-editable-field="text" class="poem-editable-verses ${escapeAttr(fontClass)}" aria-label="Versos del poema">${poemHtml}</div>
          <div ${editableAttr} data-editable-field="signature" class="poem-editable-signature poem-editable-signature--script" style="margin-top: 14px;" aria-label="Firma del poema">${sigHtml}</div>
        </div>
        <div class="sheet-art-slot klimt-frame-slot" aria-hidden="true">${primaryArt}</div>
        ${extraLayersMarkup}
        ${folioHtml}
      </article>
    `;
  }

  // 5. BAROQUE (Foto 3: Esquinero floral superior + Grabado abajo derecha)
  if (layoutKey === 'baroque') {
    const titleBlock = page.title
      ? `<div ${editableAttr} data-editable-field="title" class="poem-editable-title">${titleHtml}</div>`
      : '';
    return `
      <article class="poem-sheet-page poem-sheet-page--baroque" data-page-id="${escapeAttr(page.id)}" style="${inlineVars}">
        <div class="sheet-art-slot baroque-corner-slot" aria-hidden="true">${secondaryArt}</div>
        <div class="baroque-body">
          ${titleBlock}
          <div ${editableAttr} data-editable-field="text" class="poem-editable-verses ${escapeAttr(fontClass)}" aria-label="Versos del poema">${poemHtml}</div>
          <div ${editableAttr} data-editable-field="signature" class="poem-editable-signature" style="margin-top: 16px;" aria-label="Firma del poema">${sigHtml}</div>
        </div>
        <div class="sheet-art-slot baroque-bottom-slot" aria-hidden="true">${primaryArt}</div>
        ${extraLayersMarkup}
        ${folioHtml}
      </article>
    `;
  }

  // 6. STARBOY (Foto 4: Firma superior centrada + Silueta alta derecha)
  if (layoutKey === 'starboy') {
    const titleBlock = page.title
      ? `<div ${editableAttr} data-editable-field="title" class="poem-editable-title">${titleHtml}</div>`
      : '';
    return `
      <article class="poem-sheet-page poem-sheet-page--starboy" data-page-id="${escapeAttr(page.id)}" style="${inlineVars}">
        <div class="starboy-header">
          <span ${editableAttr} data-editable-field="signature" class="poem-editable-signature" aria-label="Encabezado o firma">${sigHtml}</span>
        </div>
        <div class="starboy-body">
          ${titleBlock}
          <div ${editableAttr} data-editable-field="text" class="poem-editable-verses ${escapeAttr(fontClass)}" aria-label="Versos del poema">${poemHtml}</div>
        </div>
        <div class="sheet-art-slot starboy-right-slot" aria-hidden="true">${primaryArt}</div>
        ${extraLayersMarkup}
        ${folioHtml}
      </article>
    `;
  }

  // 7. CUPID (Foto 5: Viñeta superior derecha + Versos amplios)
  if (layoutKey === 'cupid') {
    const titleBlock = page.title
      ? `<div ${editableAttr} data-editable-field="title" class="poem-editable-title">${titleHtml}</div>`
      : '';
    return `
      <article class="poem-sheet-page poem-sheet-page--cupid" data-page-id="${escapeAttr(page.id)}" style="${inlineVars}">
        <div class="sheet-art-slot cupid-top-slot" aria-hidden="true">${primaryArt}</div>
        <div class="cupid-body">
          ${titleBlock}
          <div ${editableAttr} data-editable-field="text" class="poem-editable-verses ${escapeAttr(fontClass)}" aria-label="Versos del poema">${poemHtml}</div>
          <div ${editableAttr} data-editable-field="signature" class="poem-editable-signature" style="margin-top: 16px;" aria-label="Firma del poema">${sigHtml}</div>
        </div>
        ${extraLayersMarkup}
        ${folioHtml}
      </article>
    `;
  }

  // 8. SACREDHEART (Foto 6: Símbolo radiante arriba + Botánica abajo derecha)
  if (layoutKey === 'sacredheart') {
    const titleBlock = page.title
      ? `<div ${editableAttr} data-editable-field="title" class="poem-editable-title">${titleHtml}</div>`
      : '';
    return `
      <article class="poem-sheet-page poem-sheet-page--sacredheart" data-page-id="${escapeAttr(page.id)}" style="${inlineVars}">
        <div class="sheet-art-slot sacred-top-slot" aria-hidden="true">${secondaryArt}</div>
        <div class="sacred-body">
          ${titleBlock}
          <div ${editableAttr} data-editable-field="text" class="poem-editable-verses ${escapeAttr(fontClass)}" aria-label="Versos del poema">${poemHtml}</div>
          <div ${editableAttr} data-editable-field="signature" class="poem-editable-signature" style="margin-top: 16px;" aria-label="Firma del poema">${sigHtml}</div>
        </div>
        <div class="sheet-art-slot sacred-bottom-slot" aria-hidden="true">${primaryArt}</div>
        ${extraLayersMarkup}
        ${folioHtml}
      </article>
    `;
  }

  // 9. DIPTYCH POEM (Página literaria amplia / Continuación de poema extenso)
  if (layoutKey === 'diptych_poem') {
    return `
      <article class="poem-sheet-page poem-sheet-page--diptych" data-page-id="${escapeAttr(page.id)}" style="${inlineVars}">
        <div class="diptych-body">
          <div ${editableAttr} data-editable-field="title" class="poem-editable-title" aria-label="Título del poema">${titleHtml}</div>
          <div ${editableAttr} data-editable-field="text" class="poem-editable-verses ${escapeAttr(fontClass)}" aria-label="Versos del poema">${poemHtml}</div>
        </div>
        <div class="diptych-footer">
          <div ${editableAttr} data-editable-field="signature" class="poem-editable-signature" aria-label="Firma del poema">${sigHtml}</div>
          <div class="sheet-art-slot diptych-mini-slot" aria-hidden="true">${primaryArt}</div>
        </div>
        ${extraLayersMarkup}
        ${folioHtml}
      </article>
    `;
  }

  // 10. BACKCOVER (Contratapa & Colofón)
  return `
    <article class="poem-sheet-page poem-sheet-page--backcover" data-page-id="${escapeAttr(page.id)}" style="${inlineVars}">
      <div></div>
      <div class="backcover-center">
        <div class="sheet-art-slot backcover-emblem-slot" aria-hidden="true">${primaryArt}</div>
        <div ${editableAttr} data-editable-field="text" class="poem-editable-verses ${escapeAttr(fontClass)}" aria-label="Versos de contratapa">${poemHtml}</div>
      </div>
      <div ${editableAttr} data-editable-field="signature" class="poem-editable-signature" style="text-transform: uppercase; letter-spacing: 0.16em; font-size: 10px;" aria-label="Colofón editorial">${sigHtml}</div>
      ${extraLayersMarkup}
    </article>
  `;
}

/**
 * Mounts the interactive physical page into `hostEl` and wires direct contenteditable
 * listeners, pointer-based extra-image dragging, mini-controls, and page dropzone.
 */
export function renderInteractivePageCanvas(hostEl, {
  page,
  geometry,
  bookSubtitle = '',
  scaleMode = 'comfortable',
  selectedExtraUid = null,
  onInlineFieldChange,
  onSelectExtraImage,
  onMoveExtraImage,
  onUpdateExtraImage,
  onRemoveExtraImage,
  onDropArtOnPage
}) {
  if (!hostEl || !page) return;

  hostEl.innerHTML = buildPageElementMarkup({
    page,
    geometry,
    bookSubtitle,
    scaleMode,
    interactive: true,
    selectedExtraUid
  });

  const pageEl = hostEl.querySelector('.poem-sheet-page');

  // 1. Direct ContentEditable Listeners (zero-cursor-jump)
  const editableNodes = hostEl.querySelectorAll('[data-editable-field]');
  editableNodes.forEach((node) => {
    const fieldName = node.getAttribute('data-editable-field');

    node.addEventListener('paste', (event) => {
      event.preventDefault();
      const plain = (event.clipboardData || window.clipboardData)?.getData('text/plain') || '';
      document.execCommand('insertText', false, plain);
    });

    node.addEventListener('input', () => {
      const value = extractPlainTextFromEditable(node);
      if (typeof onInlineFieldChange === 'function') {
        onInlineFieldChange(fieldName, value);
      }
    });
  });

  if (!pageEl) return;

  // 2. Pointer Drag & Selection on Extra Draggable Layers
  const extraLayers = pageEl.querySelectorAll('.page-extra-art-layer');
  const setLayerSelection = (uid) => {
    extraLayers.forEach((el) => {
      el.classList.toggle('is-selected', Boolean(uid) && el.getAttribute('data-extra-uid') === uid);
    });
    if (typeof onSelectExtraImage === 'function') {
      onSelectExtraImage(uid || null);
    }
  };

  extraLayers.forEach((layer) => {
    const uid = layer.getAttribute('data-extra-uid');

    layer.addEventListener('pointerdown', (event) => {
      if (event.target.closest('[data-extra-controls]')) return;
      if (event.button !== undefined && event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();
      setLayerSelection(uid);

      const pageRect = pageEl.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startXPct = parseFloat(layer.style.left) || 50;
      const startYPct = parseFloat(layer.style.top) || 50;
      let currentXPct = startXPct;
      let currentYPct = startYPct;

      layer.classList.add('is-dragging');
      if (typeof layer.setPointerCapture === 'function') {
        try {
          layer.setPointerCapture(event.pointerId);
        } catch {
          // Ignore pointer capture errors on synthetic events
        }
      }

      const handlePointerMove = (moveEv) => {
        const dxPct = ((moveEv.clientX - startX) / Math.max(1, pageRect.width)) * 100;
        const dyPct = ((moveEv.clientY - startY) / Math.max(1, pageRect.height)) * 100;
        currentXPct = Math.max(2, Math.min(88, Number((startXPct + dxPct).toFixed(1))));
        currentYPct = Math.max(2, Math.min(88, Number((startYPct + dyPct).toFixed(1))));
        layer.style.left = `${currentXPct}%`;
        layer.style.top = `${currentYPct}%`;
      };

      const finishDrag = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);
        layer.classList.remove('is-dragging');

        if (currentXPct !== startXPct || currentYPct !== startYPct) {
          onMoveExtraImage?.(uid, { xPct: currentXPct, yPct: currentYPct });
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
    });
  });

  // Mini-controls (-, +, ↻ 15°, ✕)
  pageEl.querySelectorAll('[data-extra-action]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const uid = btn.getAttribute('data-extra-uid');
      const action = btn.getAttribute('data-extra-action');
      const item = (page.extraImages || []).find((ex) => ex.uid === uid);
      if (!uid || !item) return;

      if (action === 'shrink') {
        const widthPct = Math.max(8, Number(((Number(item.widthPct) || 24) - 4).toFixed(1)));
        onUpdateExtraImage?.(uid, { widthPct });
      } else if (action === 'grow') {
        const widthPct = Math.min(75, Number(((Number(item.widthPct) || 24) + 4).toFixed(1)));
        onUpdateExtraImage?.(uid, { widthPct });
      } else if (action === 'rotate') {
        let nextRot = Math.round((Number(item.rotationDeg) || 0) + 15);
        if (nextRot > 180) nextRot -= 360;
        onUpdateExtraImage?.(uid, { rotationDeg: nextRot });
      } else if (action === 'remove') {
        onRemoveExtraImage?.(uid);
      }
    });
  });

  // Deselect extra layer when clicking on page sheet outside any extra layer
  pageEl.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.page-extra-art-layer')) {
      setLayerSelection(null);
    }
  });

  // 3. Page Dropzone (Catalog SVGs, Online Images & Local Image Files)
  pageEl.addEventListener('dragenter', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    pageEl.classList.add('is-drop-active');
  });

  pageEl.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    pageEl.classList.add('is-drop-active');
  });

  pageEl.addEventListener('dragleave', (event) => {
    if (!event.relatedTarget || !pageEl.contains(event.relatedTarget)) {
      pageEl.classList.remove('is-drop-active');
    }
  });

  pageEl.addEventListener('drop', (event) => {
    event.preventDefault();
    pageEl.classList.remove('is-drop-active');

    const rect = pageEl.getBoundingClientRect();
    const xPct = Math.max(
      2,
      Math.min(88, Number((((event.clientX - rect.left) / Math.max(1, rect.width)) * 100).toFixed(1)))
    );
    const yPct = Math.max(
      2,
      Math.min(88, Number((((event.clientY - rect.top) / Math.max(1, rect.height)) * 100).toFixed(1)))
    );

    let payload = null;
    const rawArtPayload = event.dataTransfer?.getData('application/x-switchlit-art');
    if (rawArtPayload) {
      try {
        payload = JSON.parse(rawArtPayload);
      } catch {
        payload = null;
      }
    }

    const files = Array.from(event.dataTransfer?.files || []);
    if ((payload || files.length > 0) && typeof onDropArtOnPage === 'function') {
      onDropArtOnPage({ payload, files, xPct, yPct });
    }
  });
}

/**
 * Updates a specific inline field from an external sidebar input ONLY if the user is not
 * currently typing inside that exact contenteditable element.
 */
export function syncCanvasFieldIfNotFocused(hostEl, fieldName, newValue) {
  if (!hostEl) return;
  const target = hostEl.querySelector(`[data-editable-field="${fieldName}"]`);
  if (!target || document.activeElement === target) return;
  target.innerHTML = escapePoemHtml(newValue || '');
}

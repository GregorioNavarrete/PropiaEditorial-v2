/**
 * Switch-Lit Interactive Assembled Book Simulator (Phase 4).
 * Renders the physical book cover-to-cover with a 1px central spine,
 * closed front cover, facing spread pairs (2|3, 4|5...), and closed backcover.
 */

import { buildPageElementMarkup } from '../pageRenderer.js';

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Computes sequential physical reading spreads from a book's pages array.
 */
export function buildBookSpreads(pages = []) {
  const list = Array.isArray(pages) ? pages : [];
  if (list.length === 0) return [];
  if (list.length === 1) {
    return [
      {
        index: 0,
        kind: 'cover',
        label: 'Tapa Cerrada (Portada)',
        shortLabel: 'Tapa',
        leftPage: null,
        rightPage: list[0]
      }
    ];
  }

  const spreads = [
    {
      index: 0,
      kind: 'cover',
      label: 'Tapa Cerrada (Inicio del Libro)',
      shortLabel: 'Tapa',
      leftPage: null,
      rightPage: list[0]
    }
  ];

  let i = 1;
  while (i < list.length - 1) {
    const left = list[i];
    const right = i + 1 < list.length - 1 ? list[i + 1] : null;
    spreads.push({
      index: spreads.length,
      kind: 'spread',
      label: right
        ? `Libro Abierto · Páginas ${left.id} y ${right.id}`
        : `Libro Abierto · Página ${left.id} (Final Interior)`,
      shortLabel: right ? `${left.id} | ${right.id}` : `${left.id} | —`,
      leftPage: left,
      rightPage: right
    });
    i += 2;
  }

  const lastPage = list[list.length - 1];
  spreads.push({
    index: spreads.length,
    kind: 'backcover',
    label: 'Contratapa Cerrada (Cierre del Libro)',
    shortLabel: 'Contratapa',
    leftPage: lastPage,
    rightPage: null
  });

  return spreads;
}

/**
 * Renders the assembled physical book simulator inside `containerEl`.
 */
export function renderBookSimulator(containerEl, {
  book,
  geometry,
  activeSpreadIndex = 0,
  onChangeSpread
}) {
  if (!containerEl || !book) return;

  const spreads = buildBookSpreads(book.pages || []);
  if (spreads.length === 0) {
    containerEl.innerHTML = '<div class="sl-card">Este poemario aún no tiene páginas.</div>';
    return;
  }

  const safeIndex = Math.max(0, Math.min(spreads.length - 1, Number(activeSpreadIndex) || 0));
  const current = spreads[safeIndex];
  const progressPct = spreads.length > 1
    ? Math.round((safeIndex / (spreads.length - 1)) * 100)
    : 100;

  const pageRatio = (Number(geometry?.pageWidthMm) || 148.5) / (Number(geometry?.pageHeightMm) || 210);
  const isLandscapePage = pageRatio > 1;
  const leafMaxWidthPx = isLandscapePage ? 360 : 300;

  const renderLeaf = (pageObj, sideClass) => {
    if (!pageObj) {
      return `
        <div class="book-sim-leaf ${sideClass} book-sim-leaf--blank" style="--sim-leaf-w: ${leafMaxWidthPx}px; aspect-ratio: ${geometry.pageWidthMm} / ${geometry.pageHeightMm};">
          <div class="book-sim-blank-inner">
            <span>Página de cortesía en blanco</span>
          </div>
        </div>
      `;
    }
    const markup = buildPageElementMarkup({
      page: pageObj,
      geometry,
      bookSubtitle: book.subtitle || '',
      scaleMode: 'proportional',
      interactive: false
    });
    return `<div class="book-sim-leaf ${sideClass}" style="--sim-leaf-w: ${leafMaxWidthPx}px;">${markup}</div>`;
  };

  let spreadStageHtml = '';
  if (current.kind === 'cover') {
    spreadStageHtml = `
      <div class="book-sim-closed book-sim-closed--cover">
        <div class="book-sim-spine" aria-hidden="true" title="Lomo de encuadernación"></div>
        ${renderLeaf(current.rightPage, 'book-sim-leaf--right')}
      </div>
    `;
  } else if (current.kind === 'backcover') {
    spreadStageHtml = `
      <div class="book-sim-closed book-sim-closed--backcover">
        ${renderLeaf(current.leftPage, 'book-sim-leaf--left')}
        <div class="book-sim-spine" aria-hidden="true" title="Lomo de encuadernación"></div>
      </div>
    `;
  } else {
    spreadStageHtml = `
      <div class="book-sim-open">
        ${renderLeaf(current.leftPage, 'book-sim-leaf--left')}
        <div class="book-sim-spine" aria-hidden="true" title="Lomo central del pliego"></div>
        ${renderLeaf(current.rightPage, 'book-sim-leaf--right')}
      </div>
    `;
  }

  const physicalDimLabel = current.kind === 'spread'
    ? `Libro abierto: ${(Number(geometry.pageWidthMm) * 2).toFixed(1)} × ${geometry.pageHeightMm} mm`
    : `Libro cerrado: ${geometry.pageWidthMm} × ${geometry.pageHeightMm} mm`;

  containerEl.innerHTML = `
    <div class="book-sim-wrapper">
      <div class="book-sim-topbar">
        <div>
          <span class="sl-eyebrow">Vista Previa Real · Lomo Vertical 1px</span>
          <h3 class="sl-card-heading" style="margin-top: 2px;">${escapeHtml(current.label)}</h3>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
          <span class="sl-pill sl-pill--cornflower">${escapeHtml(physicalDimLabel)}</span>
          <span class="sl-pill sl-pill--lime">Pliego ${safeIndex + 1} de ${spreads.length}</span>
        </div>
      </div>

      <div class="book-sim-stage" aria-live="polite">
        <div class="book-sim-spread-frame is-entering">
          ${spreadStageHtml}
        </div>
      </div>

      <div class="book-sim-controls">
        <button
          type="button"
          id="btnSimPrevSpread"
          class="sl-btn sl-btn--sm"
          ${safeIndex <= 0 ? 'disabled' : ''}
        >
          ← Abrir / Página Anterior
        </button>

        <div class="book-sim-progress-group">
          <div id="simProgressTrack" class="book-sim-progress__track" aria-hidden="true">
            <div id="simProgressFill" class="book-sim-progress__fill" style="width: ${progressPct}%;"></div>
          </div>
          <select id="simSpreadSelect" class="sl-select book-sim-select" aria-label="Saltar a pliego de lectura">
            ${spreads
              .map(
                (sp, idx) =>
                  `<option value="${idx}" ${idx === safeIndex ? 'selected' : ''}>${escapeHtml(sp.shortLabel)} — ${escapeHtml(sp.label)}</option>`
              )
              .join('')}
          </select>
        </div>

        <button
          type="button"
          id="btnSimNextSpread"
          class="sl-btn sl-btn--sm sl-btn--primary"
          ${safeIndex >= spreads.length - 1 ? 'disabled' : ''}
        >
          Página Siguiente →
        </button>
      </div>

      <div class="book-sim-quick-pills" role="tablist" aria-label="Navegación rápida por pliegos">
        ${spreads
          .map(
            (sp, idx) => `
              <button
                type="button"
                class="sl-btn sl-btn--sm ${idx === safeIndex ? 'sl-btn--lime' : ''}"
                data-sim-jump="${idx}"
              >
                ${escapeHtml(sp.shortLabel)}
              </button>
            `
          )
          .join('')}
      </div>
    </div>
  `;

  containerEl.querySelector('#btnSimPrevSpread')?.addEventListener('click', () => {
    if (safeIndex > 0) onChangeSpread?.(safeIndex - 1);
  });

  containerEl.querySelector('#btnSimNextSpread')?.addEventListener('click', () => {
    if (safeIndex < spreads.length - 1) onChangeSpread?.(safeIndex + 1);
  });

  containerEl.querySelector('#simSpreadSelect')?.addEventListener('change', (e) => {
    const next = Number(e.target.value);
    if (Number.isFinite(next)) onChangeSpread?.(next);
  });

  containerEl.querySelectorAll('[data-sim-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = Number(btn.getAttribute('data-sim-jump'));
      if (Number.isFinite(next)) onChangeSpread?.(next);
    });
  });
}

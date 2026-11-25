/**
 * Switch-Lit Poetry Press — Main Client Orchestrator (ES Module).
 * Coordinates Multi-Project Library (Phase 1), 3-Column Studio Editor & 300-DPI Specs (Phase 2),
 * Hybrid Poem-to-Art Engine & Quick Poem Assistant (Phase 3), and Live Format Blueprint Lab.
 */

import {
  PAPER_SHEETS,
  BOOK_FORMATS,
  PAGE_LAYOUTS,
  POEM_FONTS,
  FONT_SIZES,
  API_ENDPOINTS,
  createDefaultPage,
  normalizeExtraImage
} from '/shared/contracts.js';
import {
  computeFormatGeometry,
  getRecommendedSlotSpecs
} from '/shared/formatSpecs.js';
import { getIllustrationById } from '/shared/illustrationsCatalog.js';
import {
  analyzePoemAndSuggest,
  splitPoemIntoPages
} from '/shared/poemMatcher.js';
import {
  renderInteractivePageCanvas,
  syncCanvasFieldIfNotFocused
} from './pageRenderer.js';
import { createArtStudioPanel } from './artStudioPanel.js';
import { createQuickPoemModal } from './quickPoemModal.js';
import { createPaperScannerModal } from './paperScannerModal.js';
import { renderImpositionFormatsView } from './impositionView.js';

const ACTIVE_BOOK_STORAGE_KEY = 'switch_lit_active_book_id';
const AUTOSAVE_DEBOUNCE_MS = 450;

const state = {
  books: [],
  currentBookId: null,
  currentPageIndex: 0,
  currentView: 'library', // 'library' | 'studio' | 'formats'
  canvasScaleMode: 'comfortable', // 'comfortable' | 'proportional'
  selectedExtraUid: null,
  formatsSubView: 'simulator', // 'simulator' | 'sheets' | 'guide'
  simSpreadIndex: 0,
  impositionPreviewMode: 'real', // 'real' | 'schematic'
  saveTimer: null,
  isSaving: false,
  savePromise: null
};

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCurrentBook() {
  return state.books.find((b) => b.id === state.currentBookId) || null;
}

function getCurrentPage() {
  const book = getCurrentBook();
  if (!book || !Array.isArray(book.pages) || book.pages.length === 0) return null;
  const clampedIdx = Math.max(0, Math.min(book.pages.length - 1, state.currentPageIndex));
  state.currentPageIndex = clampedIdx;
  return book.pages[clampedIdx];
}

function renumberBookPages(book) {
  if (!book || !Array.isArray(book.pages)) return;
  book.pages.forEach((p, idx) => {
    const oldNum = p.id;
    const newNum = idx + 1;
    p.id = newNum;
    if (typeof p.role === 'string' && p.role === `Página ${oldNum}`) {
      p.role = `Página ${newNum}`;
    }
  });
}

// ============================================================================
// TOAST & SAVE STATUS PILL
// ============================================================================
let toastTimeout = null;
function notify(message) {
  const toastEl = document.getElementById('slToast');
  if (!toastEl || !message) return;
  toastEl.textContent = message;
  toastEl.classList.remove('is-hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('is-hidden');
  }, 3400);
}

function setSaveStatus(mode, text) {
  const pill = document.getElementById('saveStatusPill');
  const label = document.getElementById('saveStatusText');
  if (!pill || !label) return;
  pill.classList.remove('is-saving', 'is-error');
  if (mode === 'saving') pill.classList.add('is-saving');
  if (mode === 'error') pill.classList.add('is-error');
  label.textContent = text;
}

async function persistCurrentBookNow() {
  const book = getCurrentBook();
  if (!book) return false;
  clearTimeout(state.saveTimer);
  state.saveTimer = null;

  if (state.isSaving && state.savePromise) {
    return state.savePromise;
  }

  state.isSaving = true;
  setSaveStatus('saving', 'GUARDANDO...');

  const runSave = (async () => {
    try {
      const res = await fetch(API_ENDPOINTS.BOOK_BY_ID(book.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book)
      });
      const data = await res.json();
      if (!res.ok || !data.book) {
        throw new Error(data.error || 'Error de guardado');
      }

      // Preserve local live edits if user kept typing while request was in flight
      book.updatedAt = data.book.updatedAt;
      setSaveStatus('saved', 'GUARDADO EN DISCO');
      renderTopbarBookSelector();
      if (state.currentView === 'library') {
        renderLibraryView();
      }
      return true;
    } catch (err) {
      setSaveStatus('error', 'REINTENTAR GUARDADO');
      notify(err.message || 'No se pudo guardar automáticamente en disco.');
      return false;
    } finally {
      state.isSaving = false;
      state.savePromise = null;
    }
  })();

  state.savePromise = runSave;
  return runSave;
}

function scheduleAutoSave() {
  setSaveStatus('saving', 'CAMBIOS PENDIENTES...');
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    persistCurrentBookNow();
  }, AUTOSAVE_DEBOUNCE_MS);
}

// ============================================================================
// NAVIGATION & TOPBAR
// ============================================================================
function switchView(viewName) {
  state.currentView = viewName;
  const viewMap = {
    library: document.getElementById('viewLibrary'),
    studio: document.getElementById('viewStudio'),
    formats: document.getElementById('viewFormats')
  };

  Object.entries(viewMap).forEach(([key, section]) => {
    section?.classList.toggle('is-hidden', key !== viewName);
  });

  document.querySelectorAll('.sl-nav-tab[data-view]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-view') === viewName);
  });

  if (viewName === 'library') {
    renderLibraryView();
  } else if (viewName === 'studio') {
    renderStudioFull();
  } else if (viewName === 'formats') {
    renderFormatsLabView();
  }
}

function renderTopbarBookSelector() {
  const select = document.getElementById('activeBookSelect');
  if (!select) return;

  if (state.books.length === 0) {
    select.innerHTML = '<option value="">Sin libros</option>';
    return;
  }

  select.innerHTML = state.books
    .map((book) => {
      const geo = computeFormatGeometry({
        paperId: book.paperId,
        formatId: book.formatId,
        customWidthMm: book.customWidthMm,
        customHeightMm: book.customHeightMm
      });
      const label = `${book.title} (${geo.pageWidthMm}×${geo.pageHeightMm} mm)`;
      const selected = book.id === state.currentBookId ? 'selected' : '';
      return `<option value="${escapeHtml(book.id)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function setActiveBook(bookId, preferredPageIdx = null) {
  const found = state.books.find((b) => b.id === bookId) || state.books[0] || null;
  if (!found) {
    state.currentBookId = null;
    state.currentPageIndex = 0;
    return;
  }
  state.currentBookId = found.id;
  state.selectedExtraUid = null;
  state.simSpreadIndex = 0;
  try {
    localStorage.setItem(ACTIVE_BOOK_STORAGE_KEY, found.id);
  } catch {
    // Ignore storage quota errors
  }

  if (preferredPageIdx !== null) {
    state.currentPageIndex = Math.max(0, Math.min(found.pages.length - 1, preferredPageIdx));
  } else if (found.id === 'seed-en-este-o-en-otro-mundo' && found.pages.length >= 3) {
    state.currentPageIndex = 2; // Open main poem on page 3 by default on seed book
  } else {
    state.currentPageIndex = 0;
  }

  renderTopbarBookSelector();
  syncExportLinks(found);
}

function buildExportFilename(book, suffix) {
  const base = String(book?.title || book?.id || 'poemario')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'poemario';
  return `${base}-${suffix}.pdf`;
}

function syncExportLinks(book) {
  const pressLink = document.getElementById('btnDownloadPressPdf');
  const guideLink = document.getElementById('btnDownloadGuidePdf');
  const topbarLink = document.getElementById('btnTopbarExportPressPdf');

  if (!book?.id) {
    [pressLink, guideLink, topbarLink].forEach((el) => {
      if (!el) return;
      el.setAttribute('href', '#');
      el.setAttribute('aria-disabled', 'true');
    });
    return;
  }

  const pressHref = API_ENDPOINTS.EXPORT_PRESS_PDF(book.id);
  const guideHref = API_ENDPOINTS.EXPORT_GUIDE_PDF(book.id);
  const pressFilename = buildExportFilename(book, 'imprenta-1a1');
  const guideFilename = buildExportFilename(book, 'guia-armado');

  if (pressLink) {
    pressLink.setAttribute('href', pressHref);
    pressLink.setAttribute('download', pressFilename);
    pressLink.removeAttribute('aria-disabled');
  }
  if (guideLink) {
    guideLink.setAttribute('href', guideHref);
    guideLink.setAttribute('download', guideFilename);
    guideLink.removeAttribute('aria-disabled');
  }
  if (topbarLink) {
    topbarLink.setAttribute('href', pressHref);
    topbarLink.setAttribute('download', pressFilename);
    topbarLink.removeAttribute('aria-disabled');
  }
}

// ============================================================================
// VISTA 1: BIBLIOTECA MULTI-PROYECTO
// ============================================================================
function updateNewBookGeometryPreview() {
  const paperId = document.getElementById('newBookPaper')?.value || 'A4';
  const formatId = document.getElementById('newBookFormat')?.value || 'saddle_half';
  const customWrap = document.getElementById('newBookCustomDimensionsWrap');
  const customW = Number(document.getElementById('newBookCustomWidth')?.value) || 105;
  const customH = Number(document.getElementById('newBookCustomHeight')?.value) || 148;
  const previewEl = document.getElementById('newBookGeometryPreview');

  customWrap?.classList.toggle('is-hidden', formatId !== 'custom_nup');

  const geo = computeFormatGeometry({
    paperId,
    formatId,
    customWidthMm: customW,
    customHeightMm: customH
  });

  if (previewEl) {
    previewEl.innerHTML = `
      <strong>Página cerrada resultante:</strong> ${geo.pageWidthMm} × ${geo.pageHeightMm} mm
      (${geo.pageWidthPx300} × ${geo.pageHeightPx300} px a 300 DPI)<br>
      <span>Entran <strong>${geo.pagesPerSheet} págs. por hoja ${escapeHtml(geo.paperId)}</strong> · Múltiplo recomendado: ${geo.pagesMultiple} págs.</span>
    `;
  }
}

function renderLibraryView() {
  const grid = document.getElementById('booksGridContainer');
  const countBadge = document.getElementById('libraryCountBadge');
  const summaryText = document.getElementById('librarySummaryText');

  if (countBadge) {
    countBadge.textContent = `${state.books.length} ${state.books.length === 1 ? 'poemario' : 'poemarios'}`;
  }

  const activeBook = getCurrentBook();
  if (summaryText && activeBook) {
    summaryText.innerHTML = `Libro activo: <strong>${escapeHtml(activeBook.title)}</strong> (${activeBook.pages.length} páginas). Guardado atómico en JSON listo.`;
  }

  if (!grid) return;
  if (state.books.length === 0) {
    grid.innerHTML = `
      <div class="sl-card">
        <p style="margin: 0;">No hay libros en la biblioteca. Creá uno a la derecha o restaurá el poemario de ejemplo.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.books
    .map((book) => {
      const isCurrent = book.id === state.currentBookId;
      const geo = computeFormatGeometry({
        paperId: book.paperId,
        formatId: book.formatId,
        customWidthMm: book.customWidthMm,
        customHeightMm: book.customHeightMm
      });
      const samplePoemPage =
        book.pages.find((p) => p.layout !== 'cover' && p.layout !== 'dedication' && p.text?.trim()) ||
        book.pages[0];
      const excerpt = samplePoemPage?.text || ' Poemario listo para editar...';

      return `
        <article class="book-card ${isCurrent ? 'is-current' : ''}" data-book-card="${escapeHtml(book.id)}">
          <div>
            <div class="book-card__top">
              <span class="book-card__author">${escapeHtml(book.author || 'Edición de Autor')}</span>
              ${
                isCurrent
                  ? '<span class="sl-pill sl-pill--spring">Activo</span>'
                  : `<span class="sl-pill">${escapeHtml(geo.paperId)}</span>`
              }
            </div>
            <h3 class="book-card__title">${escapeHtml(book.title)}</h3>
            <p class="sl-muted" style="font-size: 11.5px; margin-bottom: 10px;">
              ${escapeHtml(book.subtitle || geo.shortLabel)}
            </p>
            <blockquote class="book-card__excerpt">${escapeHtml(excerpt)}</blockquote>
          </div>

          <div>
            <div class="book-card__meta" style="margin-bottom: 10px;">
              <span class="sl-pill sl-pill--cornflower">${geo.pageWidthMm} × ${geo.pageHeightMm} mm</span>
              <span class="sl-pill sl-pill--mist">${book.pages.length} págs.</span>
              <span class="sl-pill">${escapeHtml(geo.shortLabel)}</span>
            </div>

            <div class="book-card__actions">
              <button type="button" class="sl-btn sl-btn--sm sl-btn--primary" data-book-action="open" data-book-id="${escapeHtml(book.id)}">
                Abrir en Estudio
              </button>
              <button type="button" class="sl-btn sl-btn--sm" data-book-action="duplicate" data-book-id="${escapeHtml(book.id)}">
                Duplicar
              </button>
              <button type="button" class="sl-btn sl-btn--sm" data-book-action="delete" data-book-id="${escapeHtml(book.id)}">
                Eliminar
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  grid.querySelectorAll('[data-book-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.getAttribute('data-book-action');
      const id = btn.getAttribute('data-book-id');
      if (!id) return;

      if (action === 'open') {
        setActiveBook(id);
        switchView('studio');
      } else if (action === 'duplicate') {
        await handleDuplicateBook(id);
      } else if (action === 'delete') {
        await handleDeleteBook(id);
      }
    });
  });
}

async function loadBooksFromApi() {
  try {
    const res = await fetch(API_ENDPOINTS.BOOKS);
    const data = await res.json();
    if (res.ok && Array.isArray(data.books)) {
      state.books = data.books;
    }
  } catch {
    // Fallback to SSR JSON if offline/booting
    const rawJson = document.getElementById('initialBooksData')?.textContent;
    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) state.books = parsed;
      } catch {
        // Ignore parse error
      }
    }
  }

  let savedBookId = null;
  try {
    savedBookId = localStorage.getItem(ACTIVE_BOOK_STORAGE_KEY);
  } catch {
    savedBookId = null;
  }
  setActiveBook(savedBookId);
}

async function handleCreateBook(event) {
  event.preventDefault();
  const title = document.getElementById('newBookTitle')?.value?.trim() || 'Nuevo Poemario';
  const author = document.getElementById('newBookAuthor')?.value?.trim() || '';
  const subtitle = document.getElementById('newBookSubtitle')?.value?.trim() || 'Edición artesanal en tinta';
  const paperId = document.getElementById('newBookPaper')?.value || 'A4';
  const formatId = document.getElementById('newBookFormat')?.value || 'saddle_half';
  const pageCount = Number(document.getElementById('newBookPageCount')?.value) || 8;
  const customWidthMm = Number(document.getElementById('newBookCustomWidth')?.value) || 105;
  const customHeightMm = Number(document.getElementById('newBookCustomHeight')?.value) || 148;

  try {
    const res = await fetch(API_ENDPOINTS.BOOKS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        author,
        subtitle,
        paperId,
        formatId,
        pageCount,
        customWidthMm,
        customHeightMm
      })
    });
    const data = await res.json();
    if (!res.ok || !data.book) {
      throw new Error(data.error || 'No se pudo crear el poemario.');
    }

    state.books.push(data.book);
    document.getElementById('createBookForm')?.reset();
    updateNewBookGeometryPreview();
    setActiveBook(data.book.id, 0);
    switchView('studio');
    notify(`Poemario «${data.book.title}» creado y abierto en el Estudio.`);
  } catch (err) {
    notify(err.message || 'Error al crear poemario.');
  }
}

async function handleDuplicateBook(bookId) {
  try {
    const res = await fetch(API_ENDPOINTS.BOOK_DUPLICATE(bookId), { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.book) {
      throw new Error(data.error || 'No se pudo duplicar el libro.');
    }
    await loadBooksFromApi();
    setActiveBook(data.book.id, 0);
    renderLibraryView();
    notify(`Copia creada: «${data.book.title}».`);
  } catch (err) {
    notify(err.message || 'Error al duplicar.');
  }
}

async function handleDeleteBook(bookId) {
  const target = state.books.find((b) => b.id === bookId);
  if (!target) return;
  if (state.books.length <= 1) {
    notify('Conservá al menos un poemario activo en la biblioteca (o creá otro antes de borrar este).');
    return;
  }

  const confirmed = window.confirm(`¿Eliminar definitivamente el poemario «${target.title}»?`);
  if (!confirmed) return;

  try {
    const res = await fetch(API_ENDPOINTS.BOOK_BY_ID(bookId), { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'No se pudo eliminar el poemario.');
    }
    state.books = state.books.filter((b) => b.id !== bookId);
    if (state.currentBookId === bookId) {
      setActiveBook(state.books[0]?.id || null);
    }
    renderTopbarBookSelector();
    renderLibraryView();
    notify('Poemario eliminado.');
  } catch (err) {
    notify(err.message || 'Error al eliminar poemario.');
  }
}

async function handleRestoreSeedBook() {
  try {
    const res = await fetch('/api/books/seed', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.book) {
      throw new Error(data.error || 'No se pudo restaurar el poemario inicial.');
    }
    await loadBooksFromApi();
    setActiveBook(data.book.id, 2);
    renderLibraryView();
    notify('Poemario de ejemplo «En este o en otro mundo» restaurado.');
  } catch (err) {
    notify(err.message || 'Error al restaurar ejemplo.');
  }
}

// ============================================================================
// VISTA 2: ESTUDIO EDITORIAL DE POEMAS + DIMENSIONES 300 DPI
// ============================================================================
let artStudioController = null;

function populateStaticStudioSelectors() {
  const layoutSelect = document.getElementById('pageLayoutSelect');
  if (layoutSelect) {
    layoutSelect.innerHTML = Object.values(PAGE_LAYOUTS)
      .map((l) => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`)
      .join('');
  }

  const fontSizeSelect = document.getElementById('pageFontSizeSelect');
  if (fontSizeSelect) {
    fontSizeSelect.innerHTML = FONT_SIZES
      .map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.label)}</option>`)
      .join('');
  }

  const fontBtnsWrap = document.getElementById('poemFontButtonsContainer');
  if (fontBtnsWrap) {
    fontBtnsWrap.innerHTML = Object.values(POEM_FONTS)
      .map(
        (f) => `
          <button type="button" class="font-choice-btn" data-poem-font="${escapeHtml(f.id)}" title="${escapeHtml(f.description)}">
            <span class="font-choice-btn__name">${escapeHtml(f.name)}</span>
            <span class="font-choice-btn__sample ${escapeHtml(f.id)}">${escapeHtml(f.sample)}</span>
          </button>
        `
      )
      .join('');

    fontBtnsWrap.querySelectorAll('[data-poem-font]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = getCurrentPage();
        if (!page) return;
        page.font = btn.getAttribute('data-poem-font') || 'font-serif-italic';
        renderStudioFull();
        scheduleAutoSave();
      });
    });
  }
}

function renderRecommendedSpecsAndOverflow() {
  const book = getCurrentBook();
  const page = getCurrentPage();
  if (!book || !page) return;

  const geo = computeFormatGeometry({
    paperId: book.paperId,
    formatId: book.formatId,
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm
  });

  const slotSpecs = getRecommendedSlotSpecs({
    paperId: book.paperId,
    formatId: book.formatId,
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm,
    layoutId: page.layout,
    fontSize: page.fontSize
  });

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('specSlotLabel', slotSpecs.slotLabel);
  setTxt('specPlacementHint', slotSpecs.placementHint);
  setTxt('specClosedPageMm', `${geo.pageWidthMm} × ${geo.pageHeightMm} mm`);
  setTxt('specSlotMm', `${slotSpecs.widthMm} × ${slotSpecs.heightMm} mm`);
  setTxt('specSlotPxDpi', `${slotSpecs.widthPx} × ${slotSpecs.heightPx} px @ 300 DPI`);
  setTxt('specAspectRatio', slotSpecs.aspectRatioLabel);
  setTxt('specVerseCapacity', `Máx. ${slotSpecs.maxLines} líneas · ${slotSpecs.maxCharsPerLine} caract./línea`);

  const secBox = document.getElementById('specSecondarySlotBox');
  const secText = document.getElementById('specSecondarySlotText');
  if (secBox && secText) {
    if (slotSpecs.secondarySlot) {
      secBox.classList.remove('is-hidden');
      secText.textContent =
        `${slotSpecs.secondarySlot.widthMm} × ${slotSpecs.secondarySlot.heightMm} mm · ` +
        `${slotSpecs.secondarySlot.widthPx} × ${slotSpecs.secondarySlot.heightPx} px @ 300 DPI`;
    } else {
      secBox.classList.add('is-hidden');
    }
  }

  // Live overflow check on current page verses
  const analysis = analyzePoemAndSuggest(page.text || '', {
    paperId: book.paperId,
    formatId: book.formatId,
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm,
    currentLayoutId: page.layout,
    fontSize: page.fontSize
  });

  const overflowAlert = document.getElementById('studioOverflowAlert');
  const overflowMsg = document.getElementById('studioOverflowMessage');
  const btnAutoShrink = document.getElementById('btnAutoShrinkFont');

  if (overflowAlert && overflowMsg) {
    if ((page.text || '').trim() && analysis.overflow?.hasOverflow) {
      overflowAlert.classList.remove('is-hidden');
      overflowMsg.textContent = analysis.overflow.message;
      if (btnAutoShrink) {
        const targetPt = analysis.overflow.suggestedFontSize || '9.5pt';
        btnAutoShrink.textContent = `Ajustar Letra (${targetPt})`;
        btnAutoShrink.dataset.targetFontSize = targetPt;
        btnAutoShrink.classList.toggle('is-hidden', page.fontSize === '9.5pt');
      }
    } else {
      overflowAlert.classList.add('is-hidden');
    }
  }
}

function renderBindingMultipleStrip(book, geo) {
  const strip = document.getElementById('bindingMultipleIndicator');
  if (!strip || !book || !geo) return;

  const total = book.pages.length;
  const multiple = geo.pagesMultiple || 4;
  const remainder = total % multiple;

  if (remainder === 0) {
    const sheetsNeeded = Math.ceil(total / geo.pagesPerSheet);
    strip.classList.remove('is-warning');
    strip.innerHTML = `
      <strong>Encuadernación óptima:</strong> ${total} páginas es múltiplo exacto de ${multiple}.
      Se imprime en <strong>${sheetsNeeded} ${sheetsNeeded === 1 ? 'hoja' : 'hojas'} ${escapeHtml(geo.paperId)}</strong>.
    `;
  } else {
    const missing = multiple - remainder;
    strip.classList.add('is-warning');
    strip.innerHTML = `
      <div>
        <strong>Aviso de pliego:</strong> Tenés ${total} págs. y este formato encuaderna en múltiplos de <strong>${multiple}</strong> (faltan ${missing} para cerrar el pliego sin páginas blancas automáticas).
      </div>
      <button type="button" id="btnPadMissingPages" class="sl-btn sl-btn--sm sl-btn--primary" style="margin-top: 6px;">
        + Completar ${missing} ${missing === 1 ? 'página' : 'páginas'} ahora
      </button>
    `;
    document.getElementById('btnPadMissingPages')?.addEventListener('click', () => {
      addInteriorPagesToBook(missing);
    });
  }
}

function renderStudioSidebarControls() {
  const book = getCurrentBook();
  const page = getCurrentPage();
  if (!book || !page) return;

  const geo = computeFormatGeometry({
    paperId: book.paperId,
    formatId: book.formatId,
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm
  });

  // Book metadata & format selectors
  const setValIfNotFocused = (id, val) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) {
      el.value = val ?? '';
    }
  };

  setValIfNotFocused('studioBookTitleInput', book.title);
  setValIfNotFocused('studioBookAuthorInput', book.author);
  setValIfNotFocused('studioPaperSelect', book.paperId);
  setValIfNotFocused('studioFormatSelect', book.formatId);
  setValIfNotFocused('studioCustomWidthInput', book.customWidthMm ?? 105);
  setValIfNotFocused('studioCustomHeightInput', book.customHeightMm ?? 148);

  document
    .getElementById('studioCustomMmWrap')
    ?.classList.toggle('is-hidden', book.formatId !== 'custom_nup');

  // Pages matrix 1..N
  const pagesBadge = document.getElementById('pagesCountBadge');
  if (pagesBadge) pagesBadge.textContent = `${book.pages.length} págs.`;

  const matrix = document.getElementById('pagesMatrixContainer');
  if (matrix) {
    matrix.innerHTML = book.pages
      .map((p, idx) => {
        const isActive = idx === state.currentPageIndex;
        const shortKind =
          p.layout === 'cover'
            ? 'Tapa'
            : p.layout === 'dedication'
              ? 'Dedic.'
              : p.layout === 'backcover'
                ? 'Cierre'
                : 'Poema';
        return `
          <button
            type="button"
            role="option"
            aria-selected="${isActive ? 'true' : 'false'}"
            class="page-chip-btn ${isActive ? 'is-active' : ''}"
            data-select-page-idx="${idx}"
          >
            <span>Pág. ${p.id}</span>
            <span class="page-chip-btn__sub">${shortKind}</span>
          </button>
        `;
      })
      .join('');

    matrix.querySelectorAll('[data-select-page-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.currentPageIndex = Number(btn.getAttribute('data-select-page-idx')) || 0;
        state.selectedExtraUid = null;
        renderStudioFull();
      });
    });
  }

  setValIfNotFocused('pageRoleInput', page.role);
  setValIfNotFocused('pageLayoutSelect', page.layout);
  setValIfNotFocused('pageFontSizeSelect', page.fontSize);
  setValIfNotFocused('pageSignatureInput', page.signature);
  setValIfNotFocused('pageTitleQuickInput', page.title);

  const showNumChk = document.getElementById('pageShowNumberCheckbox');
  if (showNumChk) showNumChk.checked = Boolean(page.showPageNumber);

  // Active font button
  document.querySelectorAll('[data-poem-font]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-poem-font') === page.font);
  });

  // Enable/disable reorder & delete buttons
  const btnUp = document.getElementById('btnMovePageUp');
  const btnDown = document.getElementById('btnMovePageDown');
  const btnDel = document.getElementById('btnDeletePage');
  if (btnUp) btnUp.disabled = state.currentPageIndex <= 0;
  if (btnDown) btnDown.disabled = state.currentPageIndex >= book.pages.length - 1;
  if (btnDel) btnDel.disabled = book.pages.length <= 2;

  renderBindingMultipleStrip(book, geo);
  renderRecommendedSpecsAndOverflow();

  // Center canvas header readout
  const pageBadge = document.getElementById('canvasPageBadge');
  const roleSub = document.getElementById('canvasRoleSubtitle');
  const rulerReadout = document.getElementById('canvasPhysicalReadout');
  const btnScale = document.getElementById('btnToggleCanvasScale');

  if (pageBadge) pageBadge.textContent = `Página ${page.id} de ${book.pages.length}`;
  if (roleSub) {
    const layoutTitle = PAGE_LAYOUTS[page.layout]?.name || page.layout;
    roleSub.textContent = `${page.role} — ${layoutTitle}`;
  }
  if (rulerReadout) {
    rulerReadout.textContent =
      `${geo.pageWidthMm} × ${geo.pageHeightMm} mm · ${geo.shortLabel} sobre ${geo.paperId}`;
  }
  if (btnScale) {
    btnScale.textContent =
      state.canvasScaleMode === 'comfortable'
        ? 'Vista: Lectura Cómoda'
        : 'Vista: Proporción Comparativa';
  }
}

function ensureExtraImages(page) {
  if (!page) return [];
  if (!Array.isArray(page.extraImages)) page.extraImages = [];
  return page.extraImages;
}

function addExtraSvgToCurrentPage(illustrationId, coords = null) {
  const page = getCurrentPage();
  if (!page) return;
  const extras = ensureExtraImages(page);
  if (extras.length >= 12) {
    notify('Alcanzaste el máximo de 12 capas extra en una misma página.');
    return;
  }
  const art = getIllustrationById(illustrationId);
  const idx = extras.length;
  const xPct = coords?.xPct ?? (58 - (idx % 3) * 11);
  const yPct = coords?.yPct ?? (62 - (idx % 3) * 9);
  const item = normalizeExtraImage(
    {
      uid: `ext-${Date.now()}-${idx}`,
      kind: 'svg',
      illustrationId,
      title: art?.name || 'Grabado extra',
      xPct,
      yPct,
      widthPct: 24,
      rotationDeg: 0
    },
    idx
  );
  extras.push(item);
  state.selectedExtraUid = item.uid;
  renderCenterCanvas();
  artStudioController?.refreshExtras?.();
  scheduleAutoSave();
  notify(`«${item.title}» agregado a la hoja. Arrastralo para ubicarlo.`);
}

function addExtraCustomToCurrentPage({ url, title }, coords = null) {
  const page = getCurrentPage();
  if (!page || !url) return;
  const extras = ensureExtraImages(page);
  if (extras.length >= 12) {
    notify('Alcanzaste el máximo de 12 capas extra en una misma página.');
    return;
  }
  const idx = extras.length;
  const xPct = coords?.xPct ?? (56 - (idx % 3) * 10);
  const yPct = coords?.yPct ?? (58 - (idx % 3) * 8);
  const item = normalizeExtraImage(
    {
      uid: `ext-${Date.now()}-${idx}`,
      kind: 'custom',
      customImageUrl: url,
      title: title || 'Grabado extra 300 DPI',
      xPct,
      yPct,
      widthPct: 28,
      rotationDeg: 0
    },
    idx
  );
  extras.push(item);
  state.selectedExtraUid = item.uid;
  renderCenterCanvas();
  artStudioController?.refreshExtras?.();
  scheduleAutoSave();
}

function updateExtraImageOnCurrentPage(uid, patch, { skipManagerRerender = false } = {}) {
  const page = getCurrentPage();
  if (!page || !Array.isArray(page.extraImages)) return;
  const idx = page.extraImages.findIndex((ex) => ex.uid === uid);
  if (idx === -1) return;

  const updated = normalizeExtraImage({ ...page.extraImages[idx], ...patch, uid }, idx);
  page.extraImages[idx] = updated;
  state.selectedExtraUid = uid;

  if (skipManagerRerender) {
    const layer = document.querySelector(`#singlePageCanvasHost .page-extra-art-layer[data-extra-uid="${uid}"]`);
    if (layer) {
      layer.style.width = `${updated.widthPct}%`;
      layer.style.transform = `rotate(${updated.rotationDeg}deg)`;
    }
    const row = document.querySelector(`#extraImagesManagerList [data-mgr-row="${uid}"]`);
    const labelSpan = row?.querySelector('.extra-mgr-ctrl span');
    if (labelSpan) labelSpan.textContent = `Tam. (${Math.round(updated.widthPct)}%)`;
  } else {
    renderCenterCanvas();
    artStudioController?.refreshExtras?.();
  }
  scheduleAutoSave();
}

function removeExtraImageOnCurrentPage(uid) {
  const page = getCurrentPage();
  if (!page || !Array.isArray(page.extraImages)) return;
  page.extraImages = page.extraImages.filter((ex) => ex.uid !== uid);
  if (state.selectedExtraUid === uid) state.selectedExtraUid = null;
  renderCenterCanvas();
  artStudioController?.refreshExtras?.();
  scheduleAutoSave();
  notify('Capa extra quitada de la página.');
}

async function handleDropArtOnPage({ payload, files, xPct, yPct }) {
  const book = getCurrentBook();
  const page = getCurrentPage();
  if (!book || !page) return;

  const placeX = Math.max(2, Math.min(88, Number((xPct - 12).toFixed(1))));
  const placeY = Math.max(2, Math.min(88, Number((yPct - 10).toFixed(1))));
  const slotSpecs = getRecommendedSlotSpecs({
    paperId: book.paperId,
    formatId: book.formatId,
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm,
    layoutId: page.layout,
    fontSize: page.fontSize
  });

  if (Array.isArray(files) && files.length > 0) {
    const file = files[0];
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      notify('Soltá una imagen válida en formato PNG, JPG o WebP.');
      return;
    }

    const mode = document.getElementById('artEngraveModeSelect')?.value || 'ink';
    const formData = new FormData();
    formData.append('image', file);
    formData.append('mode', mode);
    formData.append('fit', 'contain');
    formData.append('widthPx', String(slotSpecs?.widthPx || 600));
    formData.append('heightPx', String(slotSpecs?.heightPx || 800));

    notify('Convirtiendo imagen soltada a grabado B&N a 300 DPI...');
    try {
      const res = await fetch(API_ENDPOINTS.ENGRAVE_UPLOAD, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.asset?.url) throw new Error(data.error || 'Error al procesar imagen.');
      addExtraCustomToCurrentPage({ url: data.asset.url, title: file.name }, { xPct: placeX, yPct: placeY });
      notify('Imagen convertida a 300 DPI y colocada donde la soltaste.');
    } catch (err) {
      notify(err.message || 'No se pudo procesar la imagen soltada.');
    }
    return;
  }

  if (payload?.kind === 'svg' && payload.illustrationId) {
    addExtraSvgToCurrentPage(payload.illustrationId, { xPct: placeX, yPct: placeY });
    return;
  }

  if (payload?.kind === 'online' && payload.imageUrl) {
    notify('Descargando imagen online y convirtiendo a tinta B&N de 300 DPI...');
    try {
      const res = await fetch('/api/art/online-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: payload.imageUrl,
          mode: payload.mode || 'ink',
          fit: 'contain',
          widthPx: slotSpecs?.widthPx || 600,
          heightPx: slotSpecs?.heightPx || 800
        })
      });
      const data = await res.json();
      if (!res.ok || !data.asset?.url) throw new Error(data.error || 'Error al importar imagen online.');
      addExtraCustomToCurrentPage(
        { url: data.asset.url, title: payload.title || 'Grabado online' },
        { xPct: placeX, yPct: placeY }
      );
      notify('Imagen online importada a 300 DPI y ubicada en la hoja.');
    } catch (err) {
      notify(err.message || 'No se pudo importar la imagen arrastrada.');
    }
  }
}

function renderCenterCanvas() {
  const book = getCurrentBook();
  const page = getCurrentPage();
  const host = document.getElementById('singlePageCanvasHost');
  if (!book || !page || !host) return;

  const geo = computeFormatGeometry({
    paperId: book.paperId,
    formatId: book.formatId,
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm
  });

  renderInteractivePageCanvas(host, {
    page,
    geometry: geo,
    bookSubtitle: book.subtitle,
    scaleMode: state.canvasScaleMode,
    selectedExtraUid: state.selectedExtraUid,
    onInlineFieldChange: (fieldName, newValue) => {
      page[fieldName] = newValue;
      if (fieldName === 'title' && page.layout === 'cover' && newValue.trim()) {
        book.title = newValue.trim();
        const bookTitleEl = document.getElementById('studioBookTitleInput');
        if (bookTitleEl && document.activeElement !== bookTitleEl) {
          bookTitleEl.value = book.title;
        }
      }
      if (fieldName === 'signature') {
        const sigInput = document.getElementById('pageSignatureInput');
        if (sigInput && document.activeElement !== sigInput) {
          sigInput.value = newValue;
        }
      }
      if (fieldName === 'title') {
        const titleInput = document.getElementById('pageTitleQuickInput');
        if (titleInput && document.activeElement !== titleInput) {
          titleInput.value = newValue;
        }
      }

      // Refresh live metrics & right-column poem suggestions WITHOUT re-mounting the canvas DOM!
      renderRecommendedSpecsAndOverflow();
      artStudioController?.refresh();
      scheduleAutoSave();
    },
    onSelectExtraImage: (uid) => {
      state.selectedExtraUid = uid;
      artStudioController?.refreshExtras?.();
    },
    onMoveExtraImage: (uid, { xPct, yPct }) => {
      const idx = (page.extraImages || []).findIndex((ex) => ex.uid === uid);
      if (idx !== -1) {
        page.extraImages[idx] = normalizeExtraImage({ ...page.extraImages[idx], xPct, yPct, uid }, idx);
        artStudioController?.refreshExtras?.();
        scheduleAutoSave();
      }
    },
    onUpdateExtraImage: (uid, patch) => {
      updateExtraImageOnCurrentPage(uid, patch);
    },
    onRemoveExtraImage: (uid) => {
      removeExtraImageOnCurrentPage(uid);
    },
    onDropArtOnPage: (dropEvent) => {
      handleDropArtOnPage(dropEvent);
    }
  });
}

function renderStudioFull() {
  renderStudioSidebarControls();
  renderCenterCanvas();
  artStudioController?.refresh();
}

// ============================================================================
// PAGE STRUCTURE MUTATIONS (ADD, +4 SPREAD, MOVE, DELETE, SPLIT)
// ============================================================================
const INTERIOR_CYCLE = ['butterflies', 'klimt', 'baroque', 'starboy', 'cupid', 'sacredheart'];

function addInteriorPagesToBook(count = 1) {
  const book = getCurrentBook();
  if (!book) return;

  // If currently on the backcover, insert right before the backcover; otherwise right after current page
  const isBackcover =
    state.currentPageIndex === book.pages.length - 1 &&
    book.pages[state.currentPageIndex]?.layout === 'backcover';
  const insertAt = isBackcover ? Math.max(1, book.pages.length - 1) : state.currentPageIndex + 1;

  const newPages = [];
  for (let i = 0; i < count; i += 1) {
    const layoutId = INTERIOR_CYCLE[(book.pages.length + i) % INTERIOR_CYCLE.length];
    const spec = PAGE_LAYOUTS[layoutId];
    newPages.push(
      createDefaultPage(insertAt + i + 1, {
        role: `Página ${insertAt + i + 1} (Poema)`,
        layout: layoutId,
        font: 'font-serif-italic',
        fontSize: '12.5pt',
        text: 'Escribe aquí tus versos...',
        signature: book.author ? `- ${book.author}` : '',
        illustrationId: spec?.primaryDefaultId || 'butterfliesTop',
        secondaryIllustrationId: spec?.secondaryDefaultId || null,
        showPageNumber: true
      })
    );
  }

  book.pages.splice(insertAt, 0, ...newPages);
  renumberBookPages(book);
  state.currentPageIndex = insertAt;
  renderStudioFull();
  scheduleAutoSave();
  notify(count === 1 ? 'Nueva página agregada al poemario.' : `Se agregaron ${count} páginas al poemario.`);
}

function moveCurrentPage(delta) {
  const book = getCurrentBook();
  if (!book) return;
  const from = state.currentPageIndex;
  const to = from + delta;
  if (to < 0 || to >= book.pages.length) return;

  const [moved] = book.pages.splice(from, 1);
  book.pages.splice(to, 0, moved);
  renumberBookPages(book);
  state.currentPageIndex = to;
  renderStudioFull();
  scheduleAutoSave();
}

function deleteCurrentPage() {
  const book = getCurrentBook();
  const page = getCurrentPage();
  if (!book || !page || book.pages.length <= 2) return;

  const confirmed = window.confirm(`¿Eliminar ${page.role} de este poemario?`);
  if (!confirmed) return;

  book.pages.splice(state.currentPageIndex, 1);
  renumberBookPages(book);
  state.currentPageIndex = Math.max(0, Math.min(book.pages.length - 1, state.currentPageIndex));
  renderStudioFull();
  scheduleAutoSave();
  notify('Página eliminada.');
}

function splitCurrentPageOverflowIntoTwo() {
  const book = getCurrentBook();
  const page = getCurrentPage();
  if (!book || !page) return;

  const slotSpecs = getRecommendedSlotSpecs({
    paperId: book.paperId,
    formatId: book.formatId,
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm,
    layoutId: page.layout,
    fontSize: page.fontSize
  });

  const chunks = splitPoemIntoPages(page.text || '', slotSpecs.maxLines);
  if (chunks.length <= 1) {
    // Force half-stanza split if poem had wide lines rather than line count
    const lines = (page.text || '').split('\n');
    const mid = Math.max(1, Math.ceil(lines.length / 2));
    chunks.splice(0, chunks.length, lines.slice(0, mid).join('\n').trim(), lines.slice(mid).join('\n').trim());
  }

  const originalSignature = page.signature || '';
  page.text = chunks[0];
  page.signature = '';

  const continuationPages = chunks.slice(1).map((chunkText, idx, arr) =>
    createDefaultPage(page.id + idx + 1, {
      role: `Página ${page.id + idx + 1} (Continuación)`,
      layout: 'diptych_poem',
      font: page.font,
      fontSize: page.fontSize,
      title: page.title ? `${page.title} (II)` : '',
      text: chunkText,
      signature: idx === arr.length - 1 ? originalSignature : '',
      illustrationId: 'quillInk',
      showPageNumber: true
    })
  );

  book.pages.splice(state.currentPageIndex + 1, 0, ...continuationPages);
  renumberBookPages(book);
  renderStudioFull();
  scheduleAutoSave();
  notify(`Poema dividido limpiamente en ${chunks.length} páginas consecutivas.`);
}

// ============================================================================
// VISTA 3: FASE 4 — SIMULADOR DE LIBRO, PLIEGOS IMPUESTOS & GUÍA DE ARMADO
// ============================================================================
function renderFormatsLabView() {
  const book = getCurrentBook();
  if (!book) return;

  const paperSelect = document.getElementById('fmtViewPaperSelect');
  const formatSelect = document.getElementById('fmtViewFormatSelect');
  const customWrap = document.getElementById('fmtViewCustomWrap');
  const customW = document.getElementById('fmtViewCustomW');
  const customH = document.getElementById('fmtViewCustomH');
  const summaryBox = document.getElementById('fmtViewSummaryBox');
  const tableBody = document.getElementById('formatSpecsTableBody');

  if (paperSelect) paperSelect.value = book.paperId;
  if (formatSelect) formatSelect.value = book.formatId;
  if (customW && document.activeElement !== customW) customW.value = book.customWidthMm ?? 105;
  if (customH && document.activeElement !== customH) customH.value = book.customHeightMm ?? 148;
  customWrap?.classList.toggle('is-hidden', book.formatId !== 'custom_nup');

  const geo = computeFormatGeometry({
    paperId: book.paperId,
    formatId: book.formatId,
    customWidthMm: book.customWidthMm,
    customHeightMm: book.customHeightMm
  });

  const sheetsNeeded = Math.ceil(book.pages.length / geo.pagesPerSheet);
  const paddedPages = Math.ceil(book.pages.length / geo.pagesMultiple) * geo.pagesMultiple;

  if (summaryBox) {
    summaryBox.innerHTML = `
      <strong>${escapeHtml(geo.formatName)}</strong><br>
      <span>${escapeHtml(geo.summary)}</span><br><br>
      <strong>Encuadernación:</strong> ${escapeHtml(geo.bindingMethod)}
    `;
  }

  if (tableBody) {
    const flipLabel =
      !geo.duplex
        ? '1 sola cara (sin giro de dorso)'
        : geo.flipEdge === 'short'
          ? 'Doble faz · Giro por borde corto'
          : 'Doble faz · Giro por borde largo';

    const rows = [
      ['Medida de Página Cerrada', `${geo.pageWidthMm} × ${geo.pageHeightMm} mm`],
      ['Resolución de Página a 300 DPI', `${geo.pageWidthPx300} × ${geo.pageHeightPx300} px`],
      ['Medida Exacta PostScript (PDF 1:1)', `${geo.pageWidthPt} × ${geo.pageHeightPt} pt`],
      ['Hoja Madre de Impresión', `${geo.paperName} (${geo.sheetWidthMm} × ${geo.sheetHeightMm} mm)`],
      ['Grilla N-up por Cara', `${geo.cols} col. × ${geo.rows} fila(s) (${geo.pagesPerSide} págs. por cara)`],
      ['Páginas Totales por Hoja Física', `${geo.pagesPerSheet} páginas por hoja`],
      ['Modo de Impresión & Giro', flipLabel],
      ['Corte / Guillotina', geo.requiresCut ? 'Sí · Con marcas exteriores de corte' : 'No requiere corte (solo plegado al medio)'],
      ['Márgenes Editoriales Seguros', `${geo.safeMarginVerticalMm} mm vert. · ${geo.safeMarginHorizontalMm} mm horiz.`],
      ['Hojas para el Libro Activo', `${sheetsNeeded} hoja(s) ${geo.paperId} (pliego cerrado a ${paddedPages} págs.)`]
    ];

    tableBody.innerHTML = rows
      .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td><strong>${escapeHtml(v)}</strong></td></tr>`)
      .join('');
  }

  syncExportLinks(book);

  try {
    renderImpositionFormatsView({
      book,
      geometry: geo,
      activeSubView: state.formatsSubView,
      activeSpreadIndex: state.simSpreadIndex,
      previewMode: state.impositionPreviewMode,
      onChangeSubView: (nextSubView) => {
        state.formatsSubView = nextSubView;
        renderFormatsLabView();
      },
      onChangeSpread: (nextSpreadIdx) => {
        state.simSpreadIndex = nextSpreadIdx;
        renderFormatsLabView();
      },
      onTogglePreviewMode: (nextMode) => {
        state.impositionPreviewMode = nextMode;
        renderFormatsLabView();
      }
    });
  } catch (err) {
    const simHost = document.getElementById('bookSimulatorContainer');
    if (simHost) {
      simHost.innerHTML = `<div class="sl-card">No se pudo calcular la imposición: ${escapeHtml(err.message || 'Error interno')}</div>`;
    }
  }
}

// ============================================================================
// WIRE EVENTS & INITIALIZE APPLICATION
// ============================================================================
function bindGlobalListeners() {
  // Topbar navigation
  document.getElementById('btnBrandHome')?.addEventListener('click', () => switchView('library'));
  document.querySelectorAll('.sl-nav-tab[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-view') || 'library';
      switchView(target);
    });
  });

  document.getElementById('activeBookSelect')?.addEventListener('change', (e) => {
    const nextId = e.target.value;
    if (nextId) {
      setActiveBook(nextId);
      if (state.currentView === 'studio') renderStudioFull();
      else if (state.currentView === 'formats') renderFormatsLabView();
      else renderLibraryView();
    }
  });

  document.getElementById('saveStatusPill')?.addEventListener('click', () => {
    persistCurrentBookNow();
  });

  ['btnDownloadPressPdf', 'btnDownloadGuidePdf', 'btnTopbarExportPressPdf'].forEach((id) => {
    const linkEl = document.getElementById(id);
    if (!linkEl) return;
    linkEl.addEventListener('click', async (event) => {
      if (linkEl.dataset.bypassSaveCheck === '1') {
        delete linkEl.dataset.bypassSaveCheck;
        return;
      }

      const book = getCurrentBook();
      if (!book) {
        event.preventDefault();
        notify('Seleccioná o creá un poemario primero.');
        return;
      }

      syncExportLinks(book);
      const hasSaveError = document.getElementById('saveStatusPill')?.classList.contains('is-error');
      const hasPendingChanges = Boolean(state.saveTimer) || state.isSaving || hasSaveError;

      if (hasPendingChanges) {
        event.preventDefault();
        notify('Guardando últimos cambios antes de exportar el PDF...');
        const ok = await persistCurrentBookNow();
        if (!ok) return;
        linkEl.dataset.bypassSaveCheck = '1';
        linkEl.click();
      }
    });
  });

  // Library actions
  document.getElementById('btnOpenActiveInStudio')?.addEventListener('click', () => {
    if (getCurrentBook()) switchView('studio');
  });
  document.getElementById('btnRestoreSeedBook')?.addEventListener('click', handleRestoreSeedBook);
  document.getElementById('createBookForm')?.addEventListener('submit', handleCreateBook);

  ['newBookPaper', 'newBookFormat', 'newBookCustomWidth', 'newBookCustomHeight'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', updateNewBookGeometryPreview);
    document.getElementById(id)?.addEventListener('change', updateNewBookGeometryPreview);
  });

  // Studio Left Column: Book title, author, format & paper live changes
  document.getElementById('btnQuickJumpFormats')?.addEventListener('click', () => switchView('formats'));
  document.getElementById('btnBackToStudioFromFormats')?.addEventListener('click', () => switchView('studio'));

  document.getElementById('studioBookTitleInput')?.addEventListener('input', (e) => {
    const book = getCurrentBook();
    if (!book) return;
    book.title = e.target.value;
    const coverPage = book.pages[0];
    if (coverPage && coverPage.layout === 'cover') {
      coverPage.title = e.target.value;
      if (state.currentPageIndex === 0) {
        syncCanvasFieldIfNotFocused(document.getElementById('singlePageCanvasHost'), 'title', e.target.value);
      }
    }
    renderTopbarBookSelector();
    scheduleAutoSave();
  });

  document.getElementById('studioBookAuthorInput')?.addEventListener('input', (e) => {
    const book = getCurrentBook();
    if (!book) return;
    book.author = e.target.value;
    scheduleAutoSave();
  });

  function applyBookFormatUpdate({ paperId, formatId, customWidthMm, customHeightMm }) {
    const book = getCurrentBook();
    if (!book) return;
    if (paperId && PAPER_SHEETS[paperId]) book.paperId = paperId;
    if (formatId && BOOK_FORMATS[formatId]) book.formatId = formatId;
    if (customWidthMm !== undefined && Number.isFinite(Number(customWidthMm))) {
      book.customWidthMm = Math.max(45, Math.min(400, Number(customWidthMm)));
    }
    if (customHeightMm !== undefined && Number.isFinite(Number(customHeightMm))) {
      book.customHeightMm = Math.max(60, Math.min(410, Number(customHeightMm)));
    }
    renderTopbarBookSelector();
    if (state.currentView === 'studio') renderStudioFull();
    if (state.currentView === 'formats') renderFormatsLabView();
    scheduleAutoSave();
  }

  document.getElementById('studioPaperSelect')?.addEventListener('change', (e) => {
    applyBookFormatUpdate({ paperId: e.target.value });
  });
  document.getElementById('studioFormatSelect')?.addEventListener('change', (e) => {
    applyBookFormatUpdate({ formatId: e.target.value });
  });
  document.getElementById('studioCustomWidthInput')?.addEventListener('input', (e) => {
    applyBookFormatUpdate({ customWidthMm: e.target.value });
  });
  document.getElementById('studioCustomHeightInput')?.addEventListener('input', (e) => {
    applyBookFormatUpdate({ customHeightMm: e.target.value });
  });

  // Formats Lab view synced selectors
  document.getElementById('fmtViewPaperSelect')?.addEventListener('change', (e) => {
    applyBookFormatUpdate({ paperId: e.target.value });
  });
  document.getElementById('fmtViewFormatSelect')?.addEventListener('change', (e) => {
    applyBookFormatUpdate({ formatId: e.target.value });
  });
  document.getElementById('fmtViewCustomW')?.addEventListener('input', (e) => {
    applyBookFormatUpdate({ customWidthMm: e.target.value });
  });
  document.getElementById('fmtViewCustomH')?.addEventListener('input', (e) => {
    applyBookFormatUpdate({ customHeightMm: e.target.value });
  });

  // Studio Page structure operations
  document.getElementById('btnAddSinglePage')?.addEventListener('click', () => addInteriorPagesToBook(1));
  document.getElementById('btnAddSpreadPages')?.addEventListener('click', () => addInteriorPagesToBook(4));
  document.getElementById('btnMovePageUp')?.addEventListener('click', () => moveCurrentPage(-1));
  document.getElementById('btnMovePageDown')?.addEventListener('click', () => moveCurrentPage(1));
  document.getElementById('btnDeletePage')?.addEventListener('click', deleteCurrentPage);

  document.getElementById('pageRoleInput')?.addEventListener('input', (e) => {
    const page = getCurrentPage();
    if (!page) return;
    page.role = e.target.value;
    const roleSub = document.getElementById('canvasRoleSubtitle');
    if (roleSub) {
      roleSub.textContent = `${page.role} — ${PAGE_LAYOUTS[page.layout]?.name || page.layout}`;
    }
    scheduleAutoSave();
  });

  document.getElementById('pageLayoutSelect')?.addEventListener('change', (e) => {
    const page = getCurrentPage();
    if (!page) return;
    const nextLayout = e.target.value;
    if (!PAGE_LAYOUTS[nextLayout]) return;
    page.layout = nextLayout;
    if (!page.illustrationId && PAGE_LAYOUTS[nextLayout].primaryDefaultId) {
      page.illustrationId = PAGE_LAYOUTS[nextLayout].primaryDefaultId;
    }
    if (!page.secondaryIllustrationId && PAGE_LAYOUTS[nextLayout].secondaryDefaultId) {
      page.secondaryIllustrationId = PAGE_LAYOUTS[nextLayout].secondaryDefaultId;
    }
    renderStudioFull();
    scheduleAutoSave();
  });

  document.getElementById('pageFontSizeSelect')?.addEventListener('change', (e) => {
    const page = getCurrentPage();
    if (!page) return;
    page.fontSize = e.target.value;
    renderStudioFull();
    scheduleAutoSave();
  });

  document.getElementById('pageSignatureInput')?.addEventListener('input', (e) => {
    const page = getCurrentPage();
    if (!page) return;
    page.signature = e.target.value;
    syncCanvasFieldIfNotFocused(document.getElementById('singlePageCanvasHost'), 'signature', page.signature);
    scheduleAutoSave();
  });

  document.getElementById('pageTitleQuickInput')?.addEventListener('input', (e) => {
    const page = getCurrentPage();
    if (!page) return;
    const hadTitle = Boolean(page.title);
    page.title = e.target.value;
    const hasTitleNow = Boolean(page.title);
    // If title visibility toggled on an interior layout, re-render canvas; otherwise update text cleanly
    if (hadTitle !== hasTitleNow && page.layout !== 'cover' && page.layout !== 'diptych_poem') {
      renderCenterCanvas();
    } else {
      syncCanvasFieldIfNotFocused(document.getElementById('singlePageCanvasHost'), 'title', page.title);
    }
    scheduleAutoSave();
  });

  document.getElementById('pageShowNumberCheckbox')?.addEventListener('change', (e) => {
    const page = getCurrentPage();
    if (!page) return;
    page.showPageNumber = Boolean(e.target.checked);
    renderCenterCanvas();
    scheduleAutoSave();
  });

  // Overflow quick actions in Studio
  document.getElementById('btnAutoShrinkFont')?.addEventListener('click', (e) => {
    const page = getCurrentPage();
    if (!page) return;
    page.fontSize = e.currentTarget.dataset.targetFontSize || '9.5pt';
    renderStudioFull();
    scheduleAutoSave();
    notify(`Cuerpo de letra ajustado a ${page.fontSize} para encajar en la página.`);
  });

  document.getElementById('btnSplitOverflowPages')?.addEventListener('click', splitCurrentPageOverflowIntoTwo);

  // Canvas navigation & scale toggle
  document.getElementById('btnPrevPage')?.addEventListener('click', () => {
    const book = getCurrentBook();
    if (!book || book.pages.length === 0) return;
    state.currentPageIndex = (state.currentPageIndex - 1 + book.pages.length) % book.pages.length;
    state.selectedExtraUid = null;
    renderStudioFull();
  });

  document.getElementById('btnNextPage')?.addEventListener('click', () => {
    const book = getCurrentBook();
    if (!book || book.pages.length === 0) return;
    state.currentPageIndex = (state.currentPageIndex + 1) % book.pages.length;
    state.selectedExtraUid = null;
    renderStudioFull();
  });

  document.getElementById('btnToggleCanvasScale')?.addEventListener('click', () => {
    state.canvasScaleMode =
      state.canvasScaleMode === 'comfortable' ? 'proportional' : 'comfortable';
    renderStudioSidebarControls();
    renderCenterCanvas();
  });
}

async function initApp() {
  populateStaticStudioSelectors();
  updateNewBookGeometryPreview();
  bindGlobalListeners();

  artStudioController = createArtStudioPanel({
    getCurrentBook,
    getCurrentPage,
    getSelectedExtraUid: () => state.selectedExtraUid,
    notify,
    onSelectExtraImage: (uid) => {
      state.selectedExtraUid = uid;
      renderCenterCanvas();
      artStudioController?.refreshExtras?.();
    },
    onApplyVectorArt: (illustrationId, slotTarget) => {
      const page = getCurrentPage();
      if (!page) return;
      if (slotTarget === 'secondary') {
        page.secondaryIllustrationId = illustrationId;
      } else {
        page.illustrationId = illustrationId;
        page.customImageUrl = null;
        page.customImageMeta = null;
      }
      renderCenterCanvas();
      artStudioController.refresh();
      scheduleAutoSave();
    },
    onApplyCustomEngraving: ({ url, meta, fit }) => {
      const page = getCurrentPage();
      if (!page) return;
      page.customImageUrl = url;
      page.customImageMeta = meta || null;
      page.imageFit = fit === 'cover' ? 'cover' : 'contain';
      renderCenterCanvas();
      artStudioController.refresh();
      scheduleAutoSave();
    },
    onRestoreVectorArt: () => {
      const page = getCurrentPage();
      if (!page) return;
      page.customImageUrl = null;
      page.customImageMeta = null;
      renderCenterCanvas();
      artStudioController.refresh();
      scheduleAutoSave();
      notify('Ilustración vectorial en tinta restaurada.');
    },
    onChangeImageFit: (fit) => {
      const page = getCurrentPage();
      if (!page) return;
      page.imageFit = fit;
      renderCenterCanvas();
      scheduleAutoSave();
    },
    onApplyRecommendedLayout: (layoutId) => {
      const page = getCurrentPage();
      if (!page || !PAGE_LAYOUTS[layoutId]) return;
      page.layout = layoutId;
      renderStudioFull();
      scheduleAutoSave();
      notify(`Plantilla cambiada a «${PAGE_LAYOUTS[layoutId].name}».`);
    },
    onAddExtraSvg: (illustrationId) => {
      addExtraSvgToCurrentPage(illustrationId);
    },
    onAddExtraCustom: (customInfo) => {
      addExtraCustomToCurrentPage(customInfo);
    },
    onUpdateExtraImage: (uid, patch) => {
      const isSliderWidthOnly =
        patch &&
        Object.keys(patch).length === 1 &&
        Object.prototype.hasOwnProperty.call(patch, 'widthPct');
      updateExtraImageOnCurrentPage(uid, patch, { skipManagerRerender: isSliderWidthOnly });
    },
    onRemoveExtraImage: (uid) => {
      removeExtraImageOnCurrentPage(uid);
    }
  });

  createQuickPoemModal({
    getCurrentBook,
    notify,
    onCommitQuickPoem: ({ mode, pages }) => {
      const book = getCurrentBook();
      if (!book || !Array.isArray(pages) || pages.length === 0) return;

      if (mode === 'replace_current') {
        const current = getCurrentPage();
        if (!current) return;
        const first = pages[0];
        Object.assign(current, {
          layout: first.layout,
          font: first.font,
          fontSize: first.fontSize,
          title: first.title,
          text: first.text,
          signature: first.signature,
          illustrationId: first.illustrationId,
          secondaryIllustrationId: first.secondaryIllustrationId,
          customImageUrl: null,
          customImageMeta: null
        });

        if (pages.length > 1) {
          const extras = pages.slice(1).map((p, idx) =>
            createDefaultPage(current.id + idx + 1, {
              role: `Página ${current.id + idx + 1} (Continuación)`,
              ...p,
              showPageNumber: true
            })
          );
          book.pages.splice(state.currentPageIndex + 1, 0, ...extras);
          renumberBookPages(book);
        }

        switchView('studio');
        scheduleAutoSave();
        notify(
          pages.length > 1
            ? `Poema aplicado y dividido en ${pages.length} páginas consecutivas.`
            : 'Poema e ilustración aplicados en la página actual.'
        );
      } else {
        // Insert as new page(s) before backcover (or at end)
        const hasBackcoverEnd =
          book.pages.length > 0 && book.pages[book.pages.length - 1]?.layout === 'backcover';
        const insertIndex = hasBackcoverEnd ? book.pages.length - 1 : book.pages.length;

        const created = pages.map((p, idx) =>
          createDefaultPage(insertIndex + idx + 1, {
            role: p.title
              ? `Página ${insertIndex + idx + 1} (${p.title})`
              : `Página ${insertIndex + idx + 1} (Poema)`,
            ...p,
            showPageNumber: true
          })
        );

        book.pages.splice(insertIndex, 0, ...created);
        renumberBookPages(book);
        state.currentPageIndex = insertIndex;
        switchView('studio');
        scheduleAutoSave();
        notify(
          created.length > 1
            ? `Se insertaron ${created.length} páginas nuevas con tu poema.`
            : 'Nueva página insertada con tu poema e ilustración sugerida.'
        );
      }
    }
  });

  createPaperScannerModal({
    getCurrentBook,
    notify,
    onCommitScannedLetter: ({ mode, title, text, signature, drawingAsset, drawingPlacement }) => {
      const book = getCurrentBook();
      if (!book) return;

      const buildPagePatch = (basePage) => {
        const currentLayout = basePage?.layout || 'text-only';
        const hasDrawingPrimary = Boolean(drawingAsset && drawingPlacement === 'primary');
        const hasDrawingExtra = Boolean(drawingAsset && drawingPlacement === 'extra');

        let layout = currentLayout;
        if (hasDrawingPrimary && (layout === 'text-only' || layout === 'cover' || layout === 'backcover')) {
          layout = 'img-bottom';
        } else if (!hasDrawingPrimary && (layout === 'cover' || layout === 'backcover')) {
          layout = 'text-only';
        }

        const existingExtras = Array.isArray(basePage?.extraImages) ? [...basePage.extraImages] : [];
        if (hasDrawingExtra) {
          existingExtras.push(
            normalizeExtraImage(
              {
                kind: 'custom',
                customImageUrl: drawingAsset.url,
                label: 'Dibujo escaneado',
                xPct: 72,
                yPct: 74,
                widthPct: 32,
                rotationDeg: 0
              },
              existingExtras.length
            )
          );
        }

        return {
          layout,
          title,
          text,
          signature,
          customImageUrl: hasDrawingPrimary ? drawingAsset.url : (basePage?.customImageUrl || null),
          customImageMeta: hasDrawingPrimary
            ? {
                mode: drawingAsset.mode || 'ink',
                widthPx: drawingAsset.widthPx,
                heightPx: drawingAsset.heightPx,
                dpi: drawingAsset.dpi || 300
              }
            : (basePage?.customImageMeta || null),
          extraImages: existingExtras
        };
      };

      if (mode === 'replace_current') {
        const current = getCurrentPage();
        if (!current) return;
        Object.assign(current, buildPagePatch(current));
        switchView('studio');
        scheduleAutoSave();
        notify(
          drawingAsset && drawingPlacement !== 'none'
            ? 'Carta escaneada (texto + dibujo 300 DPI) volcada en la página actual.'
            : 'Texto de la carta escaneada aplicado en la página actual.'
        );
      } else {
        const hasBackcoverEnd =
          book.pages.length > 0 && book.pages[book.pages.length - 1]?.layout === 'backcover';
        const insertIndex = hasBackcoverEnd ? book.pages.length - 1 : book.pages.length;

        const baseNewPage = createDefaultPage(insertIndex + 1, {
          role: title ? `Página ${insertIndex + 1} (${title})` : `Página ${insertIndex + 1} (Carta escaneada)`,
          layout: drawingAsset && drawingPlacement === 'primary' ? 'img-bottom' : 'text-only',
          showPageNumber: true
        });
        Object.assign(baseNewPage, buildPagePatch(baseNewPage));

        book.pages.splice(insertIndex, 0, baseNewPage);
        renumberBookPages(book);
        state.currentPageIndex = insertIndex;
        switchView('studio');
        scheduleAutoSave();
        notify(
          drawingAsset && drawingPlacement !== 'none'
            ? 'Nueva página creada con tu carta escaneada y su dibujo en tinta.'
            : 'Nueva página creada con el texto de tu carta escaneada.'
        );
      }
    }
  });

  await loadBooksFromApi();
  renderLibraryView();
}

window.addEventListener('DOMContentLoaded', initApp);

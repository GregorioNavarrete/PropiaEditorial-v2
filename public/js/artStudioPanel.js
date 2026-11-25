/**
 * Hybrid Poem-to-Image Art Studio Panel Controller (Right Column).
 * Tab A: Instant isomorphic semantic poem matching + 6 recommended SVGs + 32-item catalog browser.
 * Tab B: Secure OWASP upload -> 300-DPI B&W ink / Atkinson dithering / sketch engraving via Sharp.
 * Tab C: Public-domain online engraving search + automatic 300-DPI B&W import (with clean offline fallback).
 */

import { PAGE_LAYOUTS, API_ENDPOINTS, normalizeExtraImage } from '/shared/contracts.js';
import { getRecommendedSlotSpecs } from '/shared/formatSpecs.js';
import {
  ILLUSTRATIONS_CATALOG,
  ILLUSTRATION_CATEGORIES,
  getIllustrationById
} from '/shared/illustrationsCatalog.js';
import { analyzePoemAndSuggest } from '/shared/poemMatcher.js';

function normalizeText(str = '') {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function createArtStudioPanel({
  getCurrentBook,
  getCurrentPage,
  getSelectedExtraUid,
  onSelectExtraImage,
  onApplyVectorArt,
  onApplyCustomEngraving,
  onRestoreVectorArt,
  onChangeImageFit,
  onApplyRecommendedLayout,
  onAddExtraSvg,
  onAddExtraCustom,
  onUpdateExtraImage,
  onRemoveExtraImage,
  notify
}) {
  let activeTab = 'suggested'; // 'suggested' | 'upload' | 'online'
  let slotTarget = 'primary'; // 'primary' | 'secondary'
  let lastAutoQueryPageKey = '';
  let latestAnalysis = null;

  // DOM References
  const tabButtons = [
    document.getElementById('artTabSuggested'),
    document.getElementById('artTabUpload'),
    document.getElementById('artTabOnline')
  ].filter(Boolean);

  const panelSuggested = document.getElementById('artPanelSuggested');
  const panelUpload = document.getElementById('artPanelUpload');
  const panelOnline = document.getElementById('artPanelOnline');

  const slotTargetWrap = document.getElementById('artSlotTargetWrap');
  const btnTargetPrimary = document.getElementById('btnTargetPrimarySlot');
  const btnTargetSecondary = document.getElementById('btnTargetSecondarySlot');

  const detectedThemesContainer = document.getElementById('detectedThemesContainer');
  const layoutSuggestionBox = document.getElementById('poemLayoutSuggestionBox');
  const layoutSuggestionText = document.getElementById('poemLayoutSuggestionText');
  const btnApplySuggestedLayout = document.getElementById('btnApplySuggestedLayout');
  const suggestedGrid = document.getElementById('suggestedIllustrationsGrid');

  const catalogCategoryFilter = document.getElementById('catalogCategoryFilter');
  const catalogSearchInput = document.getElementById('catalogSearchInput');
  const fullCatalogGrid = document.getElementById('fullCatalogGrid');

  const uploadTargetPxLabel = document.getElementById('uploadTargetPxLabel');
  const activeCustomImageBox = document.getElementById('activeCustomImageBox');
  const activeCustomImageThumb = document.getElementById('activeCustomImageThumb');
  const activeCustomImageMetaText = document.getElementById('activeCustomImageMetaText');
  const btnRestoreVectorArt = document.getElementById('btnRestoreVectorArt');
  const artUploadFileInput = document.getElementById('artUploadFileInput');
  const artEngraveModeSelect = document.getElementById('artEngraveModeSelect');
  const artImageFitSelect = document.getElementById('artImageFitSelect');
  const btnProcessEngraveUpload = document.getElementById('btnProcessEngraveUpload');
  const uploadStatusFeedback = document.getElementById('uploadStatusFeedback');

  const onlineSearchForm = document.getElementById('onlineArtSearchForm');
  const onlineQueryInput = document.getElementById('onlineArtQueryInput');
  const onlineStyleSelect = document.getElementById('onlineArtStyleSelect');
  const onlineModeSelect = document.getElementById('onlineArtModeSelect');
  const btnRunOnlineSearch = document.getElementById('btnRunOnlineSearch');
  const onlineDirectUrlInput = document.getElementById('onlineDirectUrlInput');
  const btnImportDirectUrlSlot = document.getElementById('btnImportDirectUrlSlot');
  const btnImportDirectUrlExtra = document.getElementById('btnImportDirectUrlExtra');
  const onlineSearchNotice = document.getElementById('onlineSearchNotice');
  const onlineResultsGrid = document.getElementById('onlineSearchResultsGrid');

  const extraImagesCountBadge = document.getElementById('extraImagesCountBadge');
  const extraImagesManagerList = document.getElementById('extraImagesManagerList');

  // Populate category filter once (40 grabados incl. minimalista)
  if (catalogCategoryFilter) {
    catalogCategoryFilter.innerHTML = [
      `<option value="all">Todas las categorías (${ILLUSTRATIONS_CATALOG.length})</option>`,
      ...ILLUSTRATION_CATEGORIES.map(
        (cat) => `<option value="${escapeHtml(cat.id)}">${escapeHtml(cat.label)}</option>`
      )
    ].join('');
  }

  function setActiveTab(tabName) {
    activeTab = tabName;
    tabButtons.forEach((btn) => {
      const isMatch = btn.getAttribute('data-art-tab') === tabName;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    panelSuggested?.classList.toggle('is-hidden', tabName !== 'suggested');
    panelUpload?.classList.toggle('is-hidden', tabName !== 'upload');
    panelOnline?.classList.toggle('is-hidden', tabName !== 'online');
  }

  function setSlotTarget(target) {
    slotTarget = target === 'secondary' ? 'secondary' : 'primary';
    if (btnTargetPrimary && btnTargetSecondary) {
      btnTargetPrimary.classList.toggle('sl-btn--primary', slotTarget === 'primary');
      btnTargetSecondary.classList.toggle('sl-btn--primary', slotTarget === 'secondary');
    }
    renderCatalogAndSuggestions();
  }

  function getCurrentSlotSpecs() {
    const book = getCurrentBook();
    const page = getCurrentPage();
    if (!book || !page) return null;
    return getRecommendedSlotSpecs({
      paperId: book.paperId,
      formatId: book.formatId,
      customWidthMm: book.customWidthMm,
      customHeightMm: book.customHeightMm,
      layoutId: page.layout,
      fontSize: page.fontSize
    });
  }

  function getSelectedVectorIdForTarget(page) {
    if (!page) return null;
    const layoutSpec = PAGE_LAYOUTS[page.layout] || PAGE_LAYOUTS.butterflies;
    if (slotTarget === 'secondary' && layoutSpec.hasSecondaryOrnament) {
      return page.secondaryIllustrationId || layoutSpec.secondaryDefaultId || null;
    }
    if (page.customImageUrl) return null;
    return page.illustrationId || layoutSpec.primaryDefaultId || null;
  }

  function renderIllustrationCard(item, selectedId, reasonText = '') {
    const isSelected = selectedId === item.id;
    const subtitle = reasonText || item.emotions?.slice(0, 2).join(' · ') || item.category;
    return `
      <div
        role="button"
        tabindex="0"
        draggable="true"
        class="art-thumb-card ${isSelected ? 'is-selected' : ''}"
        data-select-illustration="${escapeHtml(item.id)}"
        data-drag-title="${escapeHtml(item.name)}"
        title="Clic para aplicar en plantilla · Arrastrá a la hoja blanca para ubicar libremente"
      >
        <div class="art-thumb-card__preview">${item.svg || ''}</div>
        <div class="art-thumb-card__title">${escapeHtml(item.name)}</div>
        <div class="art-thumb-card__reason">${escapeHtml(subtitle)}</div>
        <div class="art-thumb-card__footer">
          <span class="art-thumb-card__drag-hint">Arrastrar</span>
          <button
            type="button"
            class="art-extra-add-btn"
            data-add-extra="${escapeHtml(item.id)}"
            title="Sumar como imagen extra arrastrable sin pisar la plantilla"
          >
            + Extra
          </button>
        </div>
      </div>
    `;
  }

  function bindIllustrationClicks(container) {
    if (!container) return;
    container.querySelectorAll('[data-select-illustration]').forEach((card) => {
      const illId = card.getAttribute('data-select-illustration');
      const title = card.getAttribute('data-drag-title') || 'Grabado';

      card.addEventListener('click', (event) => {
        if (event.target.closest('[data-add-extra]')) return;
        if (illId && typeof onApplyVectorArt === 'function') {
          onApplyVectorArt(illId, slotTarget);
        }
      });

      card.addEventListener('keydown', (event) => {
        if (event.target !== card) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (illId && typeof onApplyVectorArt === 'function') {
            onApplyVectorArt(illId, slotTarget);
          }
        }
      });

      card.addEventListener('dragstart', (event) => {
        if (!event.dataTransfer || !illId) return;
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData(
          'application/x-switchlit-art',
          JSON.stringify({ kind: 'svg', illustrationId: illId, title })
        );
        event.dataTransfer.setData('text/plain', title);
      });
    });

    container.querySelectorAll('[data-add-extra]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const illId = btn.getAttribute('data-add-extra');
        if (illId && typeof onAddExtraSvg === 'function') {
          onAddExtraSvg(illId);
        }
      });
    });
  }

  function renderCatalogGrid() {
    if (!fullCatalogGrid) return;
    const page = getCurrentPage();
    const selectedId = getSelectedVectorIdForTarget(page);
    const catVal = catalogCategoryFilter?.value || 'all';
    const qNorm = normalizeText(catalogSearchInput?.value || '');

    const filtered = ILLUSTRATIONS_CATALOG.filter((item) => {
      if (catVal !== 'all' && item.category !== catVal) return false;
      if (!qNorm) return true;
      const hay = normalizeText(
        `${item.name} ${item.category} ${(item.keywords || []).join(' ')} ${(item.emotions || []).join(' ')}`
      );
      return hay.includes(qNorm);
    });

    if (filtered.length === 0) {
      fullCatalogGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 14px; font-size: 12px;" class="sl-muted">
          No hay grabados con ese filtro. Probá otra palabra o categoría.
        </div>
      `;
      return;
    }

    fullCatalogGrid.innerHTML = filtered
      .map((item) => renderIllustrationCard(item, selectedId))
      .join('');
    bindIllustrationClicks(fullCatalogGrid);
  }

  function renderCatalogAndSuggestions() {
    const book = getCurrentBook();
    const page = getCurrentPage();
    if (!book || !page) return;

    const layoutSpec = PAGE_LAYOUTS[page.layout] || PAGE_LAYOUTS.butterflies;
    if (slotTargetWrap) {
      if (layoutSpec.hasSecondaryOrnament) {
        slotTargetWrap.classList.remove('is-hidden');
      } else {
        slotTargetWrap.classList.add('is-hidden');
        slotTarget = 'primary';
      }
    }
    if (btnTargetPrimary && btnTargetSecondary) {
      btnTargetPrimary.classList.toggle('sl-btn--primary', slotTarget === 'primary');
      btnTargetSecondary.classList.toggle('sl-btn--primary', slotTarget === 'secondary');
    }

    latestAnalysis = analyzePoemAndSuggest(page.text || '', {
      paperId: book.paperId,
      formatId: book.formatId,
      customWidthMm: book.customWidthMm,
      customHeightMm: book.customHeightMm,
      currentLayoutId: page.layout,
      fontSize: page.fontSize
    });

    // 1. Themes tags
    if (detectedThemesContainer) {
      const themes = latestAnalysis.dominantThemes || [];
      if (themes.length === 0) {
        detectedThemesContainer.innerHTML =
          '<span class="sl-pill sl-pill--mist">Escribí versos para detectar símbolos poéticos</span>';
      } else {
        detectedThemesContainer.innerHTML = themes
          .map((t) => {
            const words = (t.matchedWords || []).slice(0, 2).join(', ');
            const suffix = words ? ` (${words})` : '';
            return `<span class="sl-pill sl-pill--lime">${escapeHtml(t.label + suffix)}</span>`;
          })
          .join('');
      }
    }

    // 2. Layout suggestion strip
    if (layoutSuggestionBox && layoutSuggestionText && btnApplySuggestedLayout) {
      const recId = latestAnalysis.recommendedLayoutId;
      const recLayout = PAGE_LAYOUTS[recId];
      if (recLayout && page.layout !== 'cover' && page.layout !== 'backcover' && recId !== page.layout) {
        layoutSuggestionBox.classList.remove('is-hidden');
        layoutSuggestionText.innerHTML = `<strong>Sugerencia:</strong> ${escapeHtml(recLayout.name)} — ${escapeHtml(latestAnalysis.recommendedLayoutReason || '')}`;
      } else {
        layoutSuggestionBox.classList.add('is-hidden');
      }
    }

    // 3. Top 6 suggested illustrations
    if (suggestedGrid) {
      const selectedId = getSelectedVectorIdForTarget(page);
      const suggestions = latestAnalysis.suggestedIllustrations || [];
      suggestedGrid.innerHTML = suggestions
        .map((item) => {
          const reason = item.matchedWords && item.matchedWords.length > 0
            ? `Relacionado con: ${item.matchedWords.join(', ')}`
            : item.reason;
          return renderIllustrationCard(item, selectedId, reason);
        })
        .join('');
      bindIllustrationClicks(suggestedGrid);
    }

    // 4. Full 40-item catalog
    renderCatalogGrid();

    // 5. Extra draggable images manager
    renderExtraImagesManager();

    // 6. Upload 300-DPI target banner & custom image state
    const slotSpecs = getCurrentSlotSpecs();
    if (slotSpecs && uploadTargetPxLabel) {
      uploadTargetPxLabel.textContent =
        `${slotSpecs.widthPx} × ${slotSpecs.heightPx} px a 300 DPI (${slotSpecs.widthMm} × ${slotSpecs.heightMm} mm · ${slotSpecs.aspectRatioLabel})`;
    }

    if (artImageFitSelect) {
      artImageFitSelect.value = page.imageFit === 'cover' ? 'cover' : 'contain';
    }

    if (activeCustomImageBox && activeCustomImageThumb && activeCustomImageMetaText) {
      if (page.customImageUrl) {
        activeCustomImageBox.classList.remove('is-hidden');
        activeCustomImageThumb.src = page.customImageUrl;
        const meta = page.customImageMeta;
        activeCustomImageMetaText.textContent = meta && meta.widthPx
          ? `${meta.widthPx} × ${meta.heightPx} px · ${meta.dpi || 300} DPI · Modo ${meta.mode || 'grabado'}`
          : 'Grabado B&N a 300 DPI aplicado en esta página';
      } else {
        activeCustomImageBox.classList.add('is-hidden');
      }
    }

    // 7. Auto-populate online query when switching page
    const pageKey = `${book.id}:${page.id}`;
    if (onlineQueryInput && pageKey !== lastAutoQueryPageKey) {
      lastAutoQueryPageKey = pageKey;
      onlineQueryInput.value = latestAnalysis.onlineSearchQuery || 'botanical vintage engraving';
    }
  }

  function renderExtraImagesManager() {
    if (!extraImagesManagerList) return;
    const page = getCurrentPage();
    const extras = Array.isArray(page?.extraImages) ? page.extraImages : [];
    const selectedUid = typeof getSelectedExtraUid === 'function' ? getSelectedExtraUid() : null;

    if (extraImagesCountBadge) {
      extraImagesCountBadge.textContent = `${extras.length} ${extras.length === 1 ? 'extra' : 'extras'}`;
      extraImagesCountBadge.classList.toggle('sl-pill--lime', extras.length > 0);
      extraImagesCountBadge.classList.toggle('sl-pill--mist', extras.length === 0);
    }

    if (extras.length === 0) {
      extraImagesManagerList.innerHTML = `
        <div class="extra-images-empty">
          Ninguna capa extra en esta página todavía.
        </div>
      `;
      return;
    }

    extraImagesManagerList.innerHTML = extras
      .map((raw, idx) => {
        const item = normalizeExtraImage(raw, idx);
        const isSel = selectedUid === item.uid;
        let thumbHtml = '';
        if (item.kind === 'custom' && item.customImageUrl) {
          thumbHtml = `<img src="${escapeHtml(item.customImageUrl)}" alt="${escapeHtml(item.title)}">`;
        } else {
          const art = getIllustrationById(item.illustrationId || 'miniMoon');
          thumbHtml = art?.svg || '';
        }

        return `
          <div class="extra-manager-item ${isSel ? 'is-selected' : ''}" data-mgr-row="${escapeHtml(item.uid)}">
            <div class="extra-manager-item__top">
              <div class="extra-manager-item__thumb">${thumbHtml}</div>
              <div class="extra-manager-item__info">
                <strong class="extra-manager-item__title">${escapeHtml(item.title || 'Grabado extra')}</strong>
                <span class="extra-manager-item__coords">Pos: ${item.xPct}% · ${item.yPct}%</span>
              </div>
              <button
                type="button"
                class="sl-btn sl-btn--sm"
                data-mgr-action="remove"
                data-mgr-uid="${escapeHtml(item.uid)}"
                title="Quitar imagen extra"
              >
                ✕
              </button>
            </div>

            <div class="extra-manager-item__controls">
              <label class="extra-mgr-ctrl">
                <span>Tam. (${Math.round(item.widthPct)}%)</span>
                <input
                  type="range"
                  min="8"
                  max="75"
                  step="1"
                  value="${Math.round(item.widthPct)}"
                  data-mgr-width="${escapeHtml(item.uid)}"
                  aria-label="Tamaño de ${escapeHtml(item.title)}"
                >
              </label>

              <div class="extra-mgr-rot">
                <button
                  type="button"
                  class="sl-btn sl-btn--sm"
                  data-mgr-action="rot-ccw"
                  data-mgr-uid="${escapeHtml(item.uid)}"
                  title="Rotar -15°"
                >
                  ↺
                </button>
                <span class="extra-mgr-rot__val">${item.rotationDeg}°</span>
                <button
                  type="button"
                  class="sl-btn sl-btn--sm"
                  data-mgr-action="rot-cw"
                  data-mgr-uid="${escapeHtml(item.uid)}"
                  title="Rotar +15°"
                >
                  ↻
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    extraImagesManagerList.querySelectorAll('[data-mgr-row]').forEach((row) => {
      row.addEventListener('click', (event) => {
        if (event.target.closest('button, input')) return;
        const uid = row.getAttribute('data-mgr-row');
        onSelectExtraImage?.(uid);
      });
    });

    extraImagesManagerList.querySelectorAll('[data-mgr-width]').forEach((slider) => {
      slider.addEventListener('input', (event) => {
        const uid = slider.getAttribute('data-mgr-width');
        const widthPct = Number(event.target.value);
        if (uid && Number.isFinite(widthPct)) {
          onUpdateExtraImage?.(uid, { widthPct });
        }
      });
    });

    extraImagesManagerList.querySelectorAll('[data-mgr-action]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const uid = btn.getAttribute('data-mgr-uid');
        const action = btn.getAttribute('data-mgr-action');
        const item = (getCurrentPage()?.extraImages || []).find((ex) => ex.uid === uid);
        if (!uid) return;

        if (action === 'remove') {
          onRemoveExtraImage?.(uid);
        } else if (action === 'rot-cw' && item) {
          let rot = Math.round((Number(item.rotationDeg) || 0) + 15);
          if (rot > 180) rot -= 360;
          onUpdateExtraImage?.(uid, { rotationDeg: rot });
        } else if (action === 'rot-ccw' && item) {
          let rot = Math.round((Number(item.rotationDeg) || 0) - 15);
          if (rot < -180) rot += 360;
          onUpdateExtraImage?.(uid, { rotationDeg: rot });
        }
      });
    });
  }

  // Event Listeners
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.getAttribute('data-art-tab') || 'suggested');
    });
  });

  btnTargetPrimary?.addEventListener('click', () => setSlotTarget('primary'));
  btnTargetSecondary?.addEventListener('click', () => setSlotTarget('secondary'));

  catalogCategoryFilter?.addEventListener('change', renderCatalogGrid);
  catalogSearchInput?.addEventListener('input', renderCatalogGrid);

  btnApplySuggestedLayout?.addEventListener('click', () => {
    if (latestAnalysis?.recommendedLayoutId && typeof onApplyRecommendedLayout === 'function') {
      onApplyRecommendedLayout(latestAnalysis.recommendedLayoutId);
    }
  });

  artImageFitSelect?.addEventListener('change', () => {
    const fit = artImageFitSelect.value === 'cover' ? 'cover' : 'contain';
    if (typeof onChangeImageFit === 'function') {
      onChangeImageFit(fit);
    }
  });

  btnRestoreVectorArt?.addEventListener('click', () => {
    if (typeof onRestoreVectorArt === 'function') {
      onRestoreVectorArt();
    }
  });

  // Tab B: Upload & Convert to 300 DPI Engraving
  btnProcessEngraveUpload?.addEventListener('click', async () => {
    const file = artUploadFileInput?.files?.[0];
    if (!file) {
      notify?.('Seleccioná primero una imagen PNG, JPG o WebP de tu dispositivo.');
      return;
    }

    const slotSpecs = getCurrentSlotSpecs();
    const widthPx = slotSpecs?.widthPx || 600;
    const heightPx = slotSpecs?.heightPx || 800;
    const mode = artEngraveModeSelect?.value || 'engraving';
    const fit = artImageFitSelect?.value === 'cover' ? 'cover' : 'contain';

    const formData = new FormData();
    formData.append('image', file);
    formData.append('mode', mode);
    formData.append('fit', fit);
    formData.append('widthPx', String(widthPx));
    formData.append('heightPx', String(heightPx));

    btnProcessEngraveUpload.disabled = true;
    if (uploadStatusFeedback) {
      uploadStatusFeedback.textContent = `Procesando grabado B&N a ${widthPx} × ${heightPx} px (300 DPI)...`;
    }

    try {
      const res = await fetch(API_ENDPOINTS.ENGRAVE_UPLOAD, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.asset?.url) {
        throw new Error(data.error || 'No se pudo procesar la imagen.');
      }

      onApplyCustomEngraving?.({
        url: data.asset.url,
        meta: data.asset,
        fit
      });
      if (artUploadFileInput) artUploadFileInput.value = '';
      if (uploadStatusFeedback) {
        uploadStatusFeedback.textContent = `Grabado aplicado (${data.asset.widthPx} × ${data.asset.heightPx} px @ 300 DPI).`;
      }
      notify?.('Imagen convertida a grabado B&N a 300 DPI y aplicada en la página.');
    } catch (err) {
      if (uploadStatusFeedback) {
        uploadStatusFeedback.textContent = err.message || 'Error al convertir la imagen.';
      }
      notify?.(err.message || 'Error al subir la imagen.');
    } finally {
      btnProcessEngraveUpload.disabled = false;
    }
  });

  // Helper to import a remote HTTPS URL into 300-DPI B&W asset
  async function importRemoteUrlToEngraving(remoteUrl, { modeOverride } = {}) {
    const slotSpecs = getCurrentSlotSpecs();
    const page = getCurrentPage();
    const mode = modeOverride || onlineModeSelect?.value || 'ink';
    const fit = page?.imageFit === 'cover' ? 'cover' : 'contain';

    const res = await fetch('/api/art/online-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: remoteUrl,
        mode,
        fit,
        widthPx: slotSpecs?.widthPx || 600,
        heightPx: slotSpecs?.heightPx || 800
      })
    });
    const data = await res.json();
    if (!res.ok || !data.asset?.url) {
      throw new Error(data.error || 'No se pudo importar el grabado online.');
    }
    return { asset: data.asset, fit };
  }

  async function handleDirectHttpsUrlImport(asExtra) {
    const rawUrl = (onlineDirectUrlInput?.value || '').trim();
    if (!rawUrl || !/^https:\/\//i.test(rawUrl)) {
      notify?.('Pegá una URL válida que comience con https:// (PNG, JPG o WebP).');
      onlineDirectUrlInput?.focus();
      return;
    }

    if (btnImportDirectUrlSlot) btnImportDirectUrlSlot.disabled = true;
    if (btnImportDirectUrlExtra) btnImportDirectUrlExtra.disabled = true;
    if (onlineSearchNotice) {
      onlineSearchNotice.classList.remove('is-hidden');
      onlineSearchNotice.textContent = 'Importando URL directa y convirtiendo a tinta B&N de 300 DPI...';
    }

    try {
      const { asset, fit } = await importRemoteUrlToEngraving(rawUrl);
      if (asExtra) {
        onAddExtraCustom?.({
          url: asset.url,
          title: 'Imagen web B&N'
        });
        notify?.('Imagen web convertida a 300 DPI y sumada como capa extra arrastrable.');
      } else {
        onApplyCustomEngraving?.({
          url: asset.url,
          meta: asset,
          fit
        });
        notify?.('Imagen web convertida a 300 DPI y aplicada en la plantilla.');
      }
      if (onlineSearchNotice) {
        onlineSearchNotice.textContent = `Importado (${asset.widthPx} × ${asset.heightPx} px @ 300 DPI).`;
      }
      if (onlineDirectUrlInput) onlineDirectUrlInput.value = '';
    } catch (err) {
      if (onlineSearchNotice) {
        onlineSearchNotice.textContent = err.message || 'No se pudo importar esa URL.';
      }
      notify?.(err.message || 'No se pudo importar la URL.');
    } finally {
      if (btnImportDirectUrlSlot) btnImportDirectUrlSlot.disabled = false;
      if (btnImportDirectUrlExtra) btnImportDirectUrlExtra.disabled = false;
    }
  }

  btnImportDirectUrlSlot?.addEventListener('click', () => handleDirectHttpsUrlImport(false));
  btnImportDirectUrlExtra?.addEventListener('click', () => handleDirectHttpsUrlImport(true));

  // Tab C: Online Search & 300 DPI Import
  async function runOnlineSearch() {
    const page = getCurrentPage();
    const query = onlineQueryInput?.value?.trim() || latestAnalysis?.onlineSearchQuery || 'vintage engraving';
    const style = onlineStyleSelect?.value || 'minimalist';

    if (btnRunOnlineSearch) btnRunOnlineSearch.disabled = true;
    if (onlineSearchNotice) {
      onlineSearchNotice.classList.remove('is-hidden');
      onlineSearchNotice.textContent = 'Buscando ilustraciones B&N compatibles...';
    }

    try {
      const res = await fetch(API_ENDPOINTS.ONLINE_SEARCH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          poemText: page?.text || '',
          style,
          limit: 12
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al consultar grabados online.');
      }

      const remoteItems = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.items)
          ? data.items
          : [];
      const items = remoteItems.length > 0
        ? remoteItems
        : (Array.isArray(data.localSuggestions) ? data.localSuggestions : []);

      if (onlineSearchNotice) {
        onlineSearchNotice.classList.remove('is-hidden');
        if (data.onlineAvailable === false || data.offline || data.fallback || remoteItems.length === 0) {
          onlineSearchNotice.textContent =
            data.message ||
            'Modo sin conexión externa: mostrando grabados y trazos minimalistas locales listos para aplicar o arrastrar.';
        } else {
          onlineSearchNotice.textContent =
            data.message ||
            `${items.length} resultados encontrados. Arrastralos a la hoja o hacé clic para aplicar.`;
        }
      }

      renderOnlineResults(items);
    } catch (err) {
      if (onlineSearchNotice) {
        onlineSearchNotice.classList.remove('is-hidden');
        onlineSearchNotice.textContent = `${err.message} Podés usar los ${ILLUSTRATIONS_CATALOG.length} grabados locales de la pestaña Sugeridas.`;
      }
    } finally {
      if (btnRunOnlineSearch) btnRunOnlineSearch.disabled = false;
    }
  }

  onlineSearchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    runOnlineSearch();
  });

  onlineStyleSelect?.addEventListener('change', () => {
    if (activeTab === 'online') {
      runOnlineSearch();
    }
  });

  function renderOnlineResults(items) {
    if (!onlineResultsGrid) return;
    if (!items || items.length === 0) {
      onlineResultsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 12px; font-size: 12px;" class="sl-muted">
          No se encontraron resultados para esa búsqueda. Probá otra palabra clave en inglés o español.
        </div>
      `;
      return;
    }

    onlineResultsGrid.innerHTML = items
      .map((item, idx) => {
        const title = item.title || item.name || `Grabado #${idx + 1}`;
        const localIllus = item.illustrationId
          ? getIllustrationById(item.illustrationId)
          : (item.id ? getIllustrationById(item.id) : null);
        const svgMarkup = item.svg || localIllus?.svg || '';
        const thumbUrl = item.thumbnailUrl || item.thumbUrl || item.previewUrl || item.imageUrl || item.url || '';
        const previewHtml = svgMarkup
          ? svgMarkup
          : `<img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(title)}" loading="lazy" draggable="false">`;
        const sourceLabel = item.source || (svgMarkup ? 'Catálogo Local B&N' : 'Dominio Público · 300 DPI');

        return `
          <div
            role="button"
            tabindex="0"
            draggable="true"
            class="art-thumb-card"
            data-online-idx="${idx}"
            title="Clic para aplicar en plantilla · Arrastrá a la hoja blanca para ubicar libremente"
          >
            <div class="art-thumb-card__preview">${previewHtml}</div>
            <div class="art-thumb-card__title">${escapeHtml(title)}</div>
            <div class="art-thumb-card__reason">${escapeHtml(sourceLabel)}</div>
            <div class="art-thumb-card__footer">
              <span class="art-thumb-card__drag-hint">Arrastrar</span>
              <button
                type="button"
                class="art-extra-add-btn"
                data-online-extra-idx="${idx}"
                title="Importar a 300 DPI y sumar como imagen extra arrastrable"
              >
                + Extra
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    const resolveOnlineItemImport = async (chosen, asExtra) => {
      const title = chosen.title || chosen.name || 'Grabado online';
      const localId = chosen.illustrationId || (getIllustrationById(chosen.id) ? chosen.id : null);
      if (localId) {
        if (asExtra) {
          onAddExtraSvg?.(localId);
        } else {
          onApplyVectorArt?.(localId, slotTarget);
          notify?.('Grabado vectorial aplicado en la página.');
        }
        return;
      }

      const remoteUrl = chosen.imageUrl || chosen.fullUrl || chosen.url || chosen.thumbnailUrl;
      if (!remoteUrl || !/^https?:\/\//i.test(remoteUrl)) {
        notify?.('Este resultado no contiene una URL importable.');
        return;
      }

      if (onlineSearchNotice) {
        onlineSearchNotice.classList.remove('is-hidden');
        onlineSearchNotice.textContent = 'Descargando y convirtiendo a grabado B&N de 300 DPI...';
      }

      const { asset, fit } = await importRemoteUrlToEngraving(remoteUrl);
      if (asExtra) {
        onAddExtraCustom?.({ url: asset.url, title });
        notify?.('Grabado online convertido a 300 DPI y sumado como capa extra.');
      } else {
        onApplyCustomEngraving?.({ url: asset.url, meta: asset, fit });
        notify?.('Grabado online convertido a tinta B&N de 300 DPI e insertado.');
      }
      if (onlineSearchNotice) {
        onlineSearchNotice.textContent = `Grabado importado (${asset.widthPx} × ${asset.heightPx} px @ 300 DPI).`;
      }
    };

    onlineResultsGrid.querySelectorAll('[data-online-idx]').forEach((card) => {
      const idx = Number(card.getAttribute('data-online-idx'));
      const chosen = items[idx];
      if (!chosen) return;

      const title = chosen.title || chosen.name || `Grabado #${idx + 1}`;
      const localId = chosen.illustrationId || (getIllustrationById(chosen.id) ? chosen.id : null);
      const remoteUrl = chosen.imageUrl || chosen.fullUrl || chosen.url || chosen.thumbnailUrl || '';
      const thumbUrl = chosen.thumbnailUrl || chosen.thumbUrl || remoteUrl;

      card.addEventListener('dragstart', (event) => {
        if (!event.dataTransfer) return;
        event.dataTransfer.effectAllowed = 'copy';
        const payload = localId
          ? { kind: 'svg', illustrationId: localId, title }
          : {
              kind: 'online',
              imageUrl: remoteUrl,
              thumbUrl,
              title,
              mode: onlineModeSelect?.value || 'ink',
              style: onlineStyleSelect?.value || 'minimalist'
            };
        event.dataTransfer.setData('application/x-switchlit-art', JSON.stringify(payload));
        event.dataTransfer.setData('text/plain', title);
      });

      card.addEventListener('click', async (event) => {
        if (event.target.closest('[data-online-extra-idx]')) return;
        card.setAttribute('aria-busy', 'true');
        try {
          await resolveOnlineItemImport(chosen, false);
        } catch (err) {
          if (onlineSearchNotice) onlineSearchNotice.textContent = err.message || 'Error al importar.';
          notify?.(err.message || 'No se pudo importar la imagen online.');
        } finally {
          card.removeAttribute('aria-busy');
        }
      });

      card.addEventListener('keydown', (event) => {
        if (event.target !== card) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          card.click();
        }
      });
    });

    onlineResultsGrid.querySelectorAll('[data-online-extra-idx]').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const idx = Number(btn.getAttribute('data-online-extra-idx'));
        const chosen = items[idx];
        if (!chosen) return;

        btn.disabled = true;
        try {
          await resolveOnlineItemImport(chosen, true);
        } catch (err) {
          if (onlineSearchNotice) onlineSearchNotice.textContent = err.message || 'Error al importar.';
          notify?.(err.message || 'No se pudo importar la imagen online.');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  return {
    refresh: renderCatalogAndSuggestions,
    refreshExtras: renderExtraImagesManager,
    setActiveTab
  };
}

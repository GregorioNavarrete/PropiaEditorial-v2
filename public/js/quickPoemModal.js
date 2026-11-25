/**
 * "+ Ingreso Rápido de Poema" Modal / Editorial Assistant Controller.
 * Performs live semantic analysis, recommends layout + font size + top 3 ink illustrations
 * with exact mm & 300-DPI px specs, and resolves long-poem overflow (stanza split vs shrink).
 */

import { PAGE_LAYOUTS, FONT_SIZES } from '/shared/contracts.js';
import { getRecommendedSlotSpecs } from '/shared/formatSpecs.js';
import { getIllustrationById } from '/shared/illustrationsCatalog.js';
import { analyzePoemAndSuggest, splitPoemIntoPages } from '/shared/poemMatcher.js';

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function createQuickPoemModal({
  getCurrentBook,
  onCommitQuickPoem,
  notify
}) {
  const modalBackdrop = document.getElementById('quickPoemModal');
  const btnOpen = document.getElementById('btnOpenQuickPoem');
  const btnClose = document.getElementById('btnCloseQuickPoemModal');
  const btnCancel = document.getElementById('btnCancelQuickPoem');

  const titleInput = document.getElementById('quickPoemTitleInput');
  const signatureInput = document.getElementById('quickPoemSignatureInput');
  const textInput = document.getElementById('quickPoemTextInput');
  const statsStrip = document.getElementById('quickPoemStatsStrip');

  const detectedThemesEl = document.getElementById('quickDetectedThemes');
  const layoutSelect = document.getElementById('quickLayoutSelect');
  const fontSizeSelect = document.getElementById('quickFontSizeSelect');
  const slotDimensionsBadge = document.getElementById('quickSlotDimensionsBadge');
  const topIllustrationsRow = document.getElementById('quickTopIllustrationsRow');

  const overflowAlertBox = document.getElementById('quickOverflowAlertBox');
  const overflowExplanation = document.getElementById('quickOverflowExplanation');

  const btnApplyCurrent = document.getElementById('btnApplyQuickToCurrentPage');
  const btnInsertNew = document.getElementById('btnInsertQuickAsNewPages');

  let userTouchedLayout = false;
  let userTouchedFontSize = false;
  let selectedIllustrationId = null;
  let currentAnalysis = null;

  // Populate layout & fontSize selects
  if (layoutSelect) {
    layoutSelect.innerHTML = Object.values(PAGE_LAYOUTS)
      .map((l) => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`)
      .join('');
  }
  if (fontSizeSelect) {
    fontSizeSelect.innerHTML = FONT_SIZES
      .map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.label)}</option>`)
      .join('');
  }

  function getSelectedOverflowMode() {
    const checked = modalBackdrop?.querySelector('input[name="quickOverflowMode"]:checked');
    return checked?.value === 'shrink' ? 'shrink' : 'split';
  }

  function evaluateLivePoem() {
    const book = getCurrentBook();
    const rawText = textInput?.value || '';
    const paperId = book?.paperId || 'A4';
    const formatId = book?.formatId || 'saddle_half';
    const customWidthMm = book?.customWidthMm || 105;
    const customHeightMm = book?.customHeightMm || 148;

    // First run unconstrained recommendation to know ideal layout/font
    const baseAnalysis = analyzePoemAndSuggest(rawText, {
      paperId,
      formatId,
      customWidthMm,
      customHeightMm
    });

    if (!userTouchedLayout && layoutSelect) {
      layoutSelect.value = baseAnalysis.recommendedLayoutId || 'butterflies';
    }
    if (!userTouchedFontSize && fontSizeSelect) {
      fontSizeSelect.value = baseAnalysis.recommendedFontSize || '12.5pt';
    }

    const chosenLayoutId = layoutSelect?.value || baseAnalysis.recommendedLayoutId || 'butterflies';
    const chosenFontSize = fontSizeSelect?.value || baseAnalysis.recommendedFontSize || '12.5pt';

    currentAnalysis = analyzePoemAndSuggest(rawText, {
      paperId,
      formatId,
      customWidthMm,
      customHeightMm,
      currentLayoutId: chosenLayoutId,
      fontSize: chosenFontSize
    });

    const slotSpecs = getRecommendedSlotSpecs({
      paperId,
      formatId,
      customWidthMm,
      customHeightMm,
      layoutId: chosenLayoutId,
      fontSize: chosenFontSize
    });

    // Stats strip
    if (statsStrip) {
      const m = currentAnalysis.metrics || { lineCount: 0, stanzaCount: 0, maxLineChars: 0 };
      statsStrip.textContent =
        `${m.lineCount} líneas · ${m.stanzaCount} estrofa(s) · máx. ${m.maxLineChars} caract./línea (óptimo de plantilla: ≤ ${slotSpecs.maxLines} líneas)`;
    }

    // Themes
    if (detectedThemesEl) {
      const themes = currentAnalysis.dominantThemes || [];
      if (themes.length === 0) {
        detectedThemesEl.innerHTML =
          '<span class="sl-pill sl-pill--mist">Escribí tus versos para detectar emoción y atmósfera</span>';
      } else {
        detectedThemesEl.innerHTML = themes
          .map((t) => {
            const sampleWords = (t.matchedWords || []).slice(0, 2).join(', ');
            return `<span class="sl-pill sl-pill--lime">${escapeHtml(t.label)}${sampleWords ? ` · ${escapeHtml(sampleWords)}` : ''}</span>`;
          })
          .join('');
      }
    }

    // Slot badge
    if (slotDimensionsBadge) {
      slotDimensionsBadge.textContent =
        `${slotSpecs.widthMm} × ${slotSpecs.heightMm} mm · ${slotSpecs.widthPx} × ${slotSpecs.heightPx} px @ 300 DPI`;
    }

    // Top 3 thematic illustrations
    const topThree = (currentAnalysis.suggestedIllustrations || []).slice(0, 3);
    if (!selectedIllustrationId || !topThree.some((item) => item.id === selectedIllustrationId)) {
      // Keep user selection if valid in catalog and user explicitly chose it; otherwise default to #1
      if (!selectedIllustrationId) {
        selectedIllustrationId = topThree[0]?.id || 'butterfliesTop';
      }
    }

    if (topIllustrationsRow) {
      topIllustrationsRow.innerHTML = topThree
        .map((item) => {
          const isSel = item.id === selectedIllustrationId;
          const matchedText = item.matchedWords?.length
            ? `Por: ${item.matchedWords.slice(0, 2).join(', ')}`
            : item.category;
          return `
            <button
              type="button"
              class="art-thumb-card ${isSel ? 'is-selected' : ''}"
              data-quick-art-id="${escapeHtml(item.id)}"
            >
              <div class="art-thumb-card__preview" style="height: 76px;">${item.svg || ''}</div>
              <div class="art-thumb-card__title">${escapeHtml(item.name)}</div>
              <div class="art-thumb-card__reason">
                ${escapeHtml(matchedText)}<br>
                <strong>${slotSpecs.widthMm}×${slotSpecs.heightMm} mm</strong> (${slotSpecs.widthPx}×${slotSpecs.heightPx} px)
              </div>
            </button>
          `;
        })
        .join('');

      topIllustrationsRow.querySelectorAll('[data-quick-art-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedIllustrationId = btn.getAttribute('data-quick-art-id');
          evaluateLivePoem();
        });
      });
    }

    // Overflow alert box (#edfe5e)
    if (overflowAlertBox && overflowExplanation) {
      if (rawText.trim() && currentAnalysis.overflow?.hasOverflow) {
        overflowAlertBox.classList.remove('is-hidden');
        overflowExplanation.textContent = currentAnalysis.overflow.message;
      } else {
        overflowAlertBox.classList.add('is-hidden');
      }
    }
  }

  function open() {
    if (!modalBackdrop) return;
    const book = getCurrentBook();
    userTouchedLayout = false;
    userTouchedFontSize = false;
    selectedIllustrationId = null;

    if (titleInput) titleInput.value = '';
    if (textInput) textInput.value = '';
    if (signatureInput && !signatureInput.value) {
      signatureInput.value = book?.author ? `- ${book.author}` : '';
    }

    modalBackdrop.classList.remove('is-hidden');
    evaluateLivePoem();
    setTimeout(() => textInput?.focus(), 30);
  }

  function close() {
    modalBackdrop?.classList.add('is-hidden');
  }

  function buildCommitPayload(targetMode) {
    const rawText = (textInput?.value || '').trim();
    if (!rawText) {
      notify?.('Escribí o pegá un poema antes de aplicarlo al libro.');
      textInput?.focus();
      return;
    }

    const book = getCurrentBook();
    const chosenLayoutId = layoutSelect?.value || currentAnalysis?.recommendedLayoutId || 'butterflies';
    let chosenFontSize = fontSizeSelect?.value || currentAnalysis?.recommendedFontSize || '12.5pt';
    const chosenFont = currentAnalysis?.recommendedFont || 'font-serif-italic';
    const title = (titleInput?.value || '').trim();
    const signature = (signatureInput?.value || '').trim();
    const illustrationId =
      selectedIllustrationId ||
      currentAnalysis?.suggestedIllustrations?.[0]?.id ||
      PAGE_LAYOUTS[chosenLayoutId]?.primaryDefaultId ||
      'butterfliesTop';
    const secondaryIllustrationId = PAGE_LAYOUTS[chosenLayoutId]?.secondaryDefaultId || null;

    const hasOverflow = Boolean(currentAnalysis?.overflow?.hasOverflow);
    const overflowChoice = getSelectedOverflowMode();

    let pagePayloads = [];

    if (hasOverflow && overflowChoice === 'split') {
      const slotSpecs = getRecommendedSlotSpecs({
        paperId: book?.paperId || 'A4',
        formatId: book?.formatId || 'saddle_half',
        customWidthMm: book?.customWidthMm || 105,
        customHeightMm: book?.customHeightMm || 148,
        layoutId: chosenLayoutId,
        fontSize: chosenFontSize
      });
      const chunks = splitPoemIntoPages(rawText, slotSpecs.maxLines);
      pagePayloads = chunks.map((chunkText, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === chunks.length - 1;
        const contLayout = isFirst ? chosenLayoutId : 'diptych_poem';
        const contArt = isFirst
          ? illustrationId
          : (getIllustrationById('quillInk')?.id || illustrationId);
        return {
          layout: contLayout,
          font: chosenFont,
          fontSize: chosenFontSize,
          title: isFirst ? title : (title ? `${title} (cont.)` : ''),
          text: chunkText,
          signature: isLast ? signature : '',
          illustrationId: contArt,
          secondaryIllustrationId: isFirst ? secondaryIllustrationId : null
        };
      });
    } else {
      if (hasOverflow && overflowChoice === 'shrink') {
        chosenFontSize = currentAnalysis?.overflow?.suggestedFontSize || '9.5pt';
      }
      pagePayloads = [
        {
          layout: chosenLayoutId,
          font: chosenFont,
          fontSize: chosenFontSize,
          title,
          text: rawText,
          signature,
          illustrationId,
          secondaryIllustrationId
        }
      ];
    }

    onCommitQuickPoem?.({
      mode: targetMode, // 'replace_current' | 'insert_new'
      pages: pagePayloads
    });
    close();
  }

  // Wire events
  btnOpen?.addEventListener('click', open);
  btnClose?.addEventListener('click', close);
  btnCancel?.addEventListener('click', close);

  modalBackdrop?.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) {
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalBackdrop && !modalBackdrop.classList.contains('is-hidden')) {
      close();
    }
  });

  textInput?.addEventListener('input', () => {
    selectedIllustrationId = null;
    evaluateLivePoem();
  });

  layoutSelect?.addEventListener('change', () => {
    userTouchedLayout = true;
    evaluateLivePoem();
  });

  fontSizeSelect?.addEventListener('change', () => {
    userTouchedFontSize = true;
    evaluateLivePoem();
  });

  btnApplyCurrent?.addEventListener('click', () => buildCommitPayload('replace_current'));
  btnInsertNew?.addEventListener('click', () => buildCommitPayload('insert_new'));

  return {
    open,
    close
  };
}

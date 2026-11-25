/**
 * Paper Letter Scanner Modal Controller (Editorial Personal).
 * Captures photographed/scanned paper letters via file picker, mobile camera, or live webcam,
 * runs Spanish OCR + automatic drawing extraction via /api/scan/letter, supports interactive
 * drag-to-crop manual drawing extraction via /api/scan/extract-drawing, and commits the result
 * directly to the active page or a newly created book page.
 */

import { API_ENDPOINTS } from '/shared/contracts.js';

export function createPaperScannerModal({ getCurrentBook, notify, onCommitScannedLetter }) {
  const modal = document.getElementById('paperScannerModal');
  if (!modal) return { open: () => {} };

  const btnOpenTopbar = document.getElementById('btnOpenPaperScanner');
  const btnOpenStudio = document.getElementById('btnStudioScanLetter');
  const btnClose = document.getElementById('btnClosePaperScanner');
  const btnCancel = document.getElementById('btnCancelPaperScanner');

  const dropzone = document.getElementById('scannerDropzone');
  const fileInput = document.getElementById('scannerFileInput');
  const camFileInput = document.getElementById('scannerCameraFileInput');
  const btnPickFile = document.getElementById('btnScannerPickFile');
  const btnMobileCam = document.getElementById('btnScannerMobileCam');
  const btnOpenWebcam = document.getElementById('btnScannerOpenWebcam');

  const webcamWrap = document.getElementById('scannerWebcamWrap');
  const webcamVideo = document.getElementById('scannerWebcamVideo');
  const btnTakePhoto = document.getElementById('btnScannerTakePhoto');
  const btnStopWebcam = document.getElementById('btnScannerStopWebcam');

  const enhanceSelect = document.getElementById('scannerEnhanceSelect');
  const drawingModeSelect = document.getElementById('scannerDrawingModeSelect');
  const detectDrawingCheck = document.getElementById('scannerDetectDrawingCheck');
  const btnRunOcr = document.getElementById('btnScannerRunOcr');
  const statusBar = document.getElementById('scannerStatusBar');

  const previewCard = document.getElementById('scannerPreviewCard');
  const previewStage = document.getElementById('scannerPreviewStage');
  const previewImg = document.getElementById('scannerPreviewImg');
  const cropBoxEl = document.getElementById('scannerCropBox');
  const btnExtractManualCrop = document.getElementById('btnScannerExtractManualCrop');

  const confidencePill = document.getElementById('scannerConfidencePill');
  const titleInput = document.getElementById('scannerResultTitle');
  const signatureInput = document.getElementById('scannerResultSignature');
  const textInput = document.getElementById('scannerResultText');

  const drawingEmpty = document.getElementById('scannerDrawingEmpty');
  const drawingReady = document.getElementById('scannerDrawingReady');
  const drawingThumb = document.getElementById('scannerDrawingThumb');
  const drawingMeta = document.getElementById('scannerDrawingMeta');
  const drawingPlacement = document.getElementById('scannerDrawingPlacement');
  const btnClearDrawing = document.getElementById('btnScannerClearDrawing');

  const btnApplyCurrent = document.getElementById('btnApplyScanToCurrentPage');
  const btnInsertNew = document.getElementById('btnInsertScanAsNewPage');

  let selectedFile = null;
  let previewObjectUrl = null;
  let webcamStream = null;
  let extractedAsset = null;
  let cropBoxPct = null;
  let isScanning = false;

  // Interactive crop drag state
  let isDraggingCrop = false;
  let dragStartXPct = 0;
  let dragStartYPct = 0;

  function setStatus(message, tone = 'neutral') {
    if (!statusBar) return;
    statusBar.textContent = message;
    statusBar.dataset.tone = tone;
  }

  function stopWebcam() {
    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
      webcamStream = null;
    }
    if (webcamVideo) {
      webcamVideo.srcObject = null;
    }
    webcamWrap?.classList.add('is-hidden');
  }

  function renderCropBox() {
    if (!cropBoxEl) return;
    if (!cropBoxPct || cropBoxPct.widthPct < 3 || cropBoxPct.heightPct < 3) {
      cropBoxEl.classList.add('is-hidden');
      btnExtractManualCrop?.classList.add('is-hidden');
      return;
    }
    cropBoxEl.style.left = `${cropBoxPct.xPct}%`;
    cropBoxEl.style.top = `${cropBoxPct.yPct}%`;
    cropBoxEl.style.width = `${cropBoxPct.widthPct}%`;
    cropBoxEl.style.height = `${cropBoxPct.heightPct}%`;
    cropBoxEl.classList.remove('is-hidden');
    btnExtractManualCrop?.classList.remove('is-hidden');
  }

  function renderExtractedDrawing() {
    if (!extractedAsset || !extractedAsset.url) {
      drawingEmpty?.classList.remove('is-hidden');
      drawingReady?.classList.add('is-hidden');
      btnClearDrawing?.classList.add('is-hidden');
      return;
    }

    drawingEmpty?.classList.add('is-hidden');
    drawingReady?.classList.remove('is-hidden');
    btnClearDrawing?.classList.remove('is-hidden');
    if (drawingThumb) {
      drawingThumb.src = extractedAsset.url;
    }
    if (drawingMeta) {
      const dims = extractedAsset.widthPx && extractedAsset.heightPx
        ? `${extractedAsset.widthPx} × ${extractedAsset.heightPx} px`
        : '300 DPI';
      drawingMeta.textContent = `${dims} · 300 DPI · Tinta B&N listo para imprenta`;
    }
  }

  function setSelectedImageFile(file, autoAnalyze = true) {
    if (!file) return;
    selectedFile = file;
    cropBoxPct = null;
    renderCropBox();

    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
    }
    previewObjectUrl = URL.createObjectURL(file);

    if (previewImg) {
      previewImg.src = previewObjectUrl;
    }
    previewCard?.classList.remove('is-hidden');
    if (btnRunOcr) {
      btnRunOcr.disabled = false;
    }

    setStatus(`Imagen cargada (${file.name || 'foto-carta.jpg'}). Lista para analizar.`, 'ready');
    if (autoAnalyze) {
      runPaperScan();
    }
  }

  async function runPaperScan() {
    if (!selectedFile || isScanning) return;
    isScanning = true;
    if (btnRunOcr) btnRunOcr.disabled = true;
    setStatus('Reconociendo texto en español y buscando dibujos en la carta...', 'working');
    if (confidencePill) {
      confidencePill.textContent = 'Analizando...';
    }

    try {
      const formData = new FormData();
      formData.append('image', selectedFile, selectedFile.name || 'carta.jpg');
      formData.append('lang', 'spa');
      formData.append('enhanceMode', enhanceSelect?.value || 'standard');
      formData.append('detectDrawing', detectDrawingCheck?.checked ? 'true' : 'false');
      formData.append('drawingMode', drawingModeSelect?.value || 'ink');

      const res = await fetch(API_ENDPOINTS.SCAN_LETTER, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo analizar la carta.');
      }

      const ocr = data.ocr || {};
      if (titleInput) titleInput.value = ocr.suggestedTitle || '';
      if (textInput) textInput.value = ocr.suggestedText || ocr.fullText || '';
      if (signatureInput) signatureInput.value = ocr.suggestedSignature || '';

      if (confidencePill) {
        confidencePill.textContent = `Confianza OCR: ${ocr.confidence ?? 0}% · ${ocr.wordCount ?? 0} palabras`;
        confidencePill.className = `sl-pill ${(ocr.confidence ?? 0) >= 65 ? 'sl-pill--lime' : 'sl-pill--mist'}`;
      }

      if (data.drawing?.detected && data.drawing?.asset) {
        extractedAsset = data.drawing.asset;
        cropBoxPct = data.drawing.cropBoxPct || null;
        renderCropBox();
        renderExtractedDrawing();
        setStatus(
          `Lectura completada (${ocr.wordCount ?? 0} palabras) y dibujo extraído automáticamente en 300 DPI.`,
          'ok'
        );
      } else {
        extractedAsset = null;
        cropBoxPct = null;
        renderCropBox();
        renderExtractedDrawing();
        setStatus(
          `Texto reconocido (${ocr.wordCount ?? 0} palabras). Si hay un dibujo en la carta, arrastrá un recuadro sobre la foto para extraerlo.`,
          'ok'
        );
      }
    } catch (err) {
      setStatus(`Error al escanear: ${err.message}`, 'error');
      if (confidencePill) {
        confidencePill.textContent = 'Error';
        confidencePill.className = 'sl-pill sl-pill--mist';
      }
      notify?.(`Error en el escáner: ${err.message}`);
    } finally {
      isScanning = false;
      if (btnRunOcr) btnRunOcr.disabled = !selectedFile;
    }
  }

  async function extractManualCrop() {
    if (!selectedFile || !cropBoxPct || isScanning) return;
    isScanning = true;
    if (btnExtractManualCrop) btnExtractManualCrop.disabled = true;
    setStatus('Extrayendo el dibujo recortado a 300 DPI en tinta B&N...', 'working');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile, selectedFile.name || 'carta.jpg');
      formData.append('xPct', String(cropBoxPct.xPct));
      formData.append('yPct', String(cropBoxPct.yPct));
      formData.append('widthPct', String(cropBoxPct.widthPct));
      formData.append('heightPct', String(cropBoxPct.heightPct));
      formData.append('mode', drawingModeSelect?.value || 'ink');

      const res = await fetch(API_ENDPOINTS.SCAN_EXTRACT_DRAWING, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.asset) {
        throw new Error(data.error || 'No se pudo extraer el dibujo.');
      }

      extractedAsset = data.asset;
      renderExtractedDrawing();
      setStatus('Dibujo recortado y convertido a grabado 300 DPI listo para la hoja.', 'ok');
      notify?.('Dibujo extraído de la carta en tinta 300 DPI.');
    } catch (err) {
      setStatus(`Error al recortar dibujo: ${err.message}`, 'error');
      notify?.(`Error al extraer dibujo: ${err.message}`);
    } finally {
      isScanning = false;
      if (btnExtractManualCrop) btnExtractManualCrop.disabled = false;
    }
  }

  async function openWebcam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      notify?.('Este navegador no permite cámara en vivo; usá "Elegir Foto" o "Cámara del Dispositivo".');
      return;
    }
    try {
      stopWebcam();
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 } },
        audio: false
      });
      if (webcamVideo) {
        webcamVideo.srcObject = webcamStream;
      }
      webcamWrap?.classList.remove('is-hidden');
      setStatus('Enfocá la carta con buena luz y tocá "Tomar Foto de la Carta".', 'ready');
    } catch (err) {
      notify?.(`No se pudo abrir la cámara: ${err.message}`);
    }
  }

  function captureWebcamPhoto() {
    if (!webcamVideo || !webcamVideo.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = webcamVideo.videoWidth;
    canvas.height = webcamVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(webcamVideo, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `carta-camara-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopWebcam();
      setSelectedImageFile(file, true);
    }, 'image/jpeg', 0.92);
  }

  function open() {
    const book = getCurrentBook?.();
    if (!book) {
      notify?.('Primero abrí o creá un poemario para escanear una carta.');
      return;
    }
    modal.classList.remove('is-hidden');
  }

  function close() {
    stopWebcam();
    modal.classList.add('is-hidden');
  }

  function commit(mode) {
    const title = (titleInput?.value || '').trim();
    const text = (textInput?.value || '').trim();
    const signature = (signatureInput?.value || '').trim();
    const placement = drawingPlacement?.value || 'primary';
    const drawingAsset = placement !== 'none' && extractedAsset ? extractedAsset : null;

    if (!title && !text && !drawingAsset) {
      notify?.('Escaneá una carta o escribí al menos un texto o dibujo antes de pasar a la hoja.');
      return;
    }

    onCommitScannedLetter?.({
      mode,
      title,
      text,
      signature,
      drawingAsset,
      drawingPlacement: drawingAsset ? placement : 'none'
    });
    close();
  }

  // Event bindings
  btnOpenTopbar?.addEventListener('click', open);
  btnOpenStudio?.addEventListener('click', open);
  btnClose?.addEventListener('click', close);
  btnCancel?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  btnPickFile?.addEventListener('click', () => fileInput?.click());
  btnMobileCam?.addEventListener('click', () => camFileInput?.click());
  btnOpenWebcam?.addEventListener('click', openWebcam);
  btnStopWebcam?.addEventListener('click', stopWebcam);
  btnTakePhoto?.addEventListener('click', captureWebcamPhoto);

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedImageFile(file, true);
    fileInput.value = '';
  });

  camFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedImageFile(file, true);
    camFileInput.value = '';
  });

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('is-dragover');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        setSelectedImageFile(file, true);
      } else {
        notify?.('Soltá un archivo de imagen válido (JPG, PNG o WebP).');
      }
    });
  }

  btnRunOcr?.addEventListener('click', runPaperScan);
  btnExtractManualCrop?.addEventListener('click', extractManualCrop);

  btnClearDrawing?.addEventListener('click', () => {
    extractedAsset = null;
    renderExtractedDrawing();
  });

  // Pointer drag-to-crop on the preview image stage
  if (previewStage) {
    const getRelativePct = (clientX, clientY) => {
      const rect = previewStage.getBoundingClientRect();
      const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / Math.max(1, rect.width)) * 100));
      const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / Math.max(1, rect.height)) * 100));
      return { xPct, yPct };
    };

    previewStage.addEventListener('pointerdown', (e) => {
      if (!selectedFile) return;
      e.preventDefault();
      previewStage.setPointerCapture?.(e.pointerId);
      const pt = getRelativePct(e.clientX, e.clientY);
      isDraggingCrop = true;
      dragStartXPct = pt.xPct;
      dragStartYPct = pt.yPct;
      cropBoxPct = { xPct: pt.xPct, yPct: pt.yPct, widthPct: 0, heightPct: 0 };
      renderCropBox();
    });

    previewStage.addEventListener('pointermove', (e) => {
      if (!isDraggingCrop) return;
      const pt = getRelativePct(e.clientX, e.clientY);
      const xPct = Math.min(dragStartXPct, pt.xPct);
      const yPct = Math.min(dragStartYPct, pt.yPct);
      const widthPct = Math.abs(pt.xPct - dragStartXPct);
      const heightPct = Math.abs(pt.yPct - dragStartYPct);
      cropBoxPct = {
        xPct: Number(xPct.toFixed(2)),
        yPct: Number(yPct.toFixed(2)),
        widthPct: Number(widthPct.toFixed(2)),
        heightPct: Number(heightPct.toFixed(2))
      };
      renderCropBox();
    });

    const endDrag = () => {
      if (!isDraggingCrop) return;
      isDraggingCrop = false;
      renderCropBox();
    };
    previewStage.addEventListener('pointerup', endDrag);
    previewStage.addEventListener('pointercancel', endDrag);
  }

  btnApplyCurrent?.addEventListener('click', () => commit('replace_current'));
  btnInsertNew?.addEventListener('click', () => commit('insert_new'));

  return { open, close };
}

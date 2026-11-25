/**
 * Paper Letter Scanner Modal Controller — Editorial Personal (v2).
 *
 * Fixes & capabilities:
 *  - Non-blocking 2-tab source switcher ("1. Subir Foto / Archivo" | "2. Cámara en Vivo")
 *    with session-tokenized getUserMedia, 8-second hardware timeout, automatic constraint
 *    fallback, explicit video.play() + metadata readiness check, camera selector, and mirror toggle
 *    so the camera tab never hangs or traps the modal.
 *  - Supports file picker, drag-and-drop, mobile camera capture, and Ctrl+V image paste.
 *  - Connects to the upgraded PaddleOCR PP-OCRv5 Spanish neural engine (100% local offline)
 *    plus optional Gemini Vision HTR for complex cursive manuscripts.
 *  - Interactive drag-to-crop manual drawing extraction at 300 DPI B&W ink/engraving.
 */

import { API_ENDPOINTS } from '/shared/contracts.js';

const VISION_KEY_STORAGE = 'editorial_personal_gemini_vision_key';

export function createPaperScannerModal({ getCurrentBook, notify, onCommitScannedLetter }) {
  const modal = document.getElementById('paperScannerModal');
  if (!modal) return { open: () => {}, close: () => {} };

  const btnOpenTopbar = document.getElementById('btnOpenPaperScanner');
  const btnOpenStudio = document.getElementById('btnStudioScanLetter');
  const btnClose = document.getElementById('btnClosePaperScanner');
  const btnCancel = document.getElementById('btnCancelPaperScanner');

  // Non-blocking source tabs
  const tabBtnUpload = document.getElementById('scannerTabBtnUpload');
  const tabBtnCamera = document.getElementById('scannerTabBtnCamera');
  const panelUpload = document.getElementById('scannerPanelUpload');
  const panelCamera = document.getElementById('scannerPanelCamera');

  const dropzone = document.getElementById('scannerDropzone');
  const fileInput = document.getElementById('scannerFileInput');
  const camFileInput = document.getElementById('scannerCameraFileInput');
  const btnPickFile = document.getElementById('btnScannerPickFile');
  const btnMobileCam = document.getElementById('btnScannerMobileCam');

  const cameraDeviceSelect = document.getElementById('scannerCameraDeviceSelect');
  const btnMirrorToggle = document.getElementById('btnScannerMirrorToggle');
  const webcamVideo = document.getElementById('scannerWebcamVideo');
  const cameraOverlayMsg = document.getElementById('scannerCameraOverlayMsg');
  const btnTakePhoto = document.getElementById('btnScannerTakePhoto');
  const btnRetryCamera = document.getElementById('btnScannerRetryCamera');
  const btnStopWebcam = document.getElementById('btnScannerStopWebcam');

  const enhanceSelect = document.getElementById('scannerEnhanceSelect');
  const drawingModeSelect = document.getElementById('scannerDrawingModeSelect');
  const engineSelect = document.getElementById('scannerEngineSelect');
  const visionKeyField = document.getElementById('scannerVisionKeyField');
  const visionKeyInput = document.getElementById('scannerVisionKeyInput');
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

  let activeTab = 'upload'; // 'upload' | 'camera'
  let selectedFile = null;
  let previewObjectUrl = null;
  let webcamStream = null;
  let cameraSessionId = 0;
  let isMirrored = false;
  let extractedAsset = null;
  let cropBoxPct = null;
  let scanAbortController = null;

  // Interactive crop drag state
  let isDraggingCrop = false;
  let dragStartXPct = 0;
  let dragStartYPct = 0;

  // Restore saved optional Vision API key
  try {
    const savedKey = localStorage.getItem(VISION_KEY_STORAGE);
    if (savedKey && visionKeyInput) {
      visionKeyInput.value = savedKey;
    }
  } catch {
    // ignore storage restriction
  }

  function syncEngineUi() {
    const isVision = engineSelect?.value === 'vision_ai';
    if (visionKeyField) {
      visionKeyField.classList.toggle('is-hidden', !isVision);
    }
  }

  function setStatus(message, tone = 'neutral') {
    if (!statusBar) return;
    statusBar.textContent = message;
    statusBar.dataset.tone = tone;
  }

  function showCameraOverlay(message) {
    if (!cameraOverlayMsg) return;
    if (!message) {
      cameraOverlayMsg.textContent = '';
      cameraOverlayMsg.classList.add('is-hidden');
    } else {
      cameraOverlayMsg.textContent = message;
      cameraOverlayMsg.classList.remove('is-hidden');
    }
  }

  function stopStreamTracks(stream) {
    if (!stream) return;
    try {
      stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
  }

  function stopWebcam() {
    // Increment session token so any pending getUserMedia immediately aborts on resolution
    cameraSessionId++;
    if (webcamStream) {
      stopStreamTracks(webcamStream);
      webcamStream = null;
    }
    if (webcamVideo) {
      try {
        webcamVideo.pause();
      } catch {
        // ignore
      }
      webcamVideo.srcObject = null;
    }
    if (btnTakePhoto) {
      btnTakePhoto.disabled = true;
    }
    showCameraOverlay('');
  }

  function switchSourceTab(nextTab) {
    activeTab = nextTab === 'camera' ? 'camera' : 'upload';
    const isCam = activeTab === 'camera';

    tabBtnUpload?.classList.toggle('is-active', !isCam);
    tabBtnUpload?.setAttribute('aria-selected', String(!isCam));
    tabBtnCamera?.classList.toggle('is-active', isCam);
    tabBtnCamera?.setAttribute('aria-selected', String(isCam));

    panelUpload?.classList.toggle('is-hidden', isCam);
    panelCamera?.classList.toggle('is-hidden', !isCam);

    if (isCam) {
      startWebcam(cameraDeviceSelect?.value || '');
    } else {
      stopWebcam();
    }
  }

  async function populateCameraDevices() {
    if (!navigator.mediaDevices?.enumerateDevices || !cameraDeviceSelect) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      if (cams.length === 0) return;

      const currentVal = cameraDeviceSelect.value;
      cameraDeviceSelect.innerHTML = '';
      cams.forEach((cam, idx) => {
        const opt = document.createElement('option');
        opt.value = cam.deviceId;
        opt.textContent = cam.label || `Cámara ${idx + 1}`;
        cameraDeviceSelect.appendChild(opt);
      });

      const activeTrack = webcamStream?.getVideoTracks?.()?.[0];
      const activeDeviceId = activeTrack?.getSettings?.()?.deviceId;
      if (activeDeviceId && cams.some((c) => c.deviceId === activeDeviceId)) {
        cameraDeviceSelect.value = activeDeviceId;
      } else if (currentVal && cams.some((c) => c.deviceId === currentVal)) {
        cameraDeviceSelect.value = currentVal;
      }
    } catch {
      // ignore device enumeration errors
    }
  }

  function requestUserMediaWithTimeout(constraints, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Tiempo de espera agotado al abrir la cámara. Verificá que no esté en uso por otra app o subí una foto.'));
      }, timeoutMs);

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          if (settled) {
            stopStreamTracks(stream);
            return;
          }
          settled = true;
          clearTimeout(timer);
          resolve(stream);
        })
        .catch((err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  function waitForVideoFrameReady(videoEl, timeoutMs = 3000) {
    return new Promise((resolve) => {
      if (!videoEl) return resolve(false);
      if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
        return resolve(true);
      }
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        videoEl.removeEventListener('loadedmetadata', onReady);
        videoEl.removeEventListener('canplay', onReady);
        clearTimeout(timer);
        resolve(ok);
      };
      const onReady = () => {
        if (videoEl.videoWidth > 0) finish(true);
      };
      const timer = setTimeout(() => finish(videoEl.videoWidth > 0), timeoutMs);
      videoEl.addEventListener('loadedmetadata', onReady);
      videoEl.addEventListener('canplay', onReady);
    });
  }

  async function startWebcam(preferredDeviceId = '') {
    stopWebcam();
    const mySession = cameraSessionId;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCameraOverlay(
        'Este navegador o pestaña no habilita cámara directa. Usá la pestaña "1. Subir Foto / Archivo" o "Foto desde Celular".'
      );
      setStatus('Cámara en vivo no disponible en este contexto; usá Subir Foto.', 'error');
      return;
    }

    showCameraOverlay('Conectando con la cámara... (aceptá el permiso del navegador si aparece arriba)');
    setStatus('Abriendo cámara en vivo...', 'working');

    try {
      const primaryConstraints = preferredDeviceId
        ? { video: { deviceId: { exact: preferredDeviceId }, width: { ideal: 1600 }, height: { ideal: 1200 } }, audio: false }
        : { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 }, height: { ideal: 1200 } }, audio: false };

      let stream;
      try {
        stream = await requestUserMediaWithTimeout(primaryConstraints, 8000);
      } catch (firstErr) {
        if (mySession !== cameraSessionId) return;
        // Fallback to simplest universal video constraint for USB/laptop webcams
        if (
          firstErr?.name === 'OverconstrainedError' ||
          firstErr?.name === 'ConstraintNotSatisfiedError' ||
          preferredDeviceId
        ) {
          stream = await requestUserMediaWithTimeout({ video: true, audio: false }, 7000);
        } else {
          throw firstErr;
        }
      }

      if (mySession !== cameraSessionId || activeTab !== 'camera') {
        stopStreamTracks(stream);
        return;
      }

      webcamStream = stream;
      if (webcamVideo) {
        webcamVideo.srcObject = stream;
        await webcamVideo.play().catch(() => {});
      }

      const ready = await waitForVideoFrameReady(webcamVideo, 3000);
      if (mySession !== cameraSessionId || activeTab !== 'camera') {
        stopWebcam();
        return;
      }

      await populateCameraDevices();

      if (!ready || !webcamVideo?.videoWidth) {
        showCameraOverlay('La cámara abrió sin señal de video. Probá elegir otra cámara arriba o "Reiniciar Cámara".');
        setStatus('Sin señal de video en esta cámara.', 'error');
        return;
      }

      showCameraOverlay('');
      if (btnTakePhoto) {
        btnTakePhoto.disabled = false;
      }
      setStatus('Cámara activa. Enfocá bien la carta con buena luz y tocá "Capturar Foto de la Carta".', 'ready');
    } catch (err) {
      if (mySession !== cameraSessionId) return;
      const friendly =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Permiso de cámara bloqueado en el navegador. Habilitalo en el ícono del candado o usá "Volver a Subir Archivo".'
          : err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError'
          ? 'No se detectó ninguna cámara conectada en este equipo. Usá "Volver a Subir Archivo".'
          : err?.message || 'No se pudo iniciar la cámara.';
      showCameraOverlay(friendly);
      setStatus(friendly, 'error');
    }
  }

  function captureWebcamPhoto() {
    if (!webcamVideo || !webcamVideo.videoWidth || !webcamVideo.videoHeight) {
      notify?.('Esperá un instante a que aparezca la imagen de la cámara.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = webcamVideo.videoWidth;
    canvas.height = webcamVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `carta-camara-${Date.now()}.jpg`, { type: 'image/jpeg' });
        switchSourceTab('upload');
        setSelectedImageFile(file, true);
      },
      'image/jpeg',
      0.94
    );
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
      const dims =
        extractedAsset.widthPx && extractedAsset.heightPx
          ? `${extractedAsset.widthPx} × ${extractedAsset.heightPx} px`
          : '300 DPI';
      drawingMeta.textContent = `${dims} · 300 DPI · Tinta B&N listo para imprenta`;
    }
  }

  function cancelActiveScan() {
    if (scanAbortController) {
      try {
        scanAbortController.abort();
      } catch {
        // ignore
      }
      scanAbortController = null;
    }
  }

  function setSelectedImageFile(file, autoAnalyze = true) {
    if (!file) return;
    cancelActiveScan();
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

    setStatus(`Imagen cargada (${file.name || 'carta.jpg'}). Lista para analizar.`, 'ready');
    if (autoAnalyze) {
      runPaperScan();
    }
  }

  async function runPaperScan() {
    if (!selectedFile) return;

    const chosenEngine = engineSelect?.value || 'auto';
    const userVisionKey = (visionKeyInput?.value || '').trim();
    if (chosenEngine === 'vision_ai' && !userVisionKey) {
      setStatus(
        'Para usar Visión IA Manuscritos pegá tu clave gratuita de Google AI Studio, o elegí "Neuronal PP-OCRv5 Español (Local Offline)".',
        'error'
      );
      visionKeyInput?.focus();
      return;
    }

    if (userVisionKey) {
      try {
        localStorage.setItem(VISION_KEY_STORAGE, userVisionKey);
      } catch {
        // ignore
      }
    }

    cancelActiveScan();
    const controller = new AbortController();
    scanAbortController = controller;

    if (btnRunOcr) btnRunOcr.disabled = true;
    setStatus(
      chosenEngine === 'vision_ai'
        ? 'Transcribiendo manuscrito cursivo con Visión IA y separando dibujos...'
        : 'Nivelando sombras del papel y reconociendo letra con el motor neuronal PP-OCRv5...',
      'working'
    );
    if (confidencePill) {
      confidencePill.textContent = 'Analizando...';
      confidencePill.className = 'sl-pill sl-pill--lime';
    }

    try {
      const formData = new FormData();
      formData.append('image', selectedFile, selectedFile.name || 'carta.jpg');
      formData.append('lang', 'spa');
      formData.append('enhanceMode', enhanceSelect?.value || 'standard');
      formData.append('detectDrawing', detectDrawingCheck?.checked ? 'true' : 'false');
      formData.append('drawingMode', drawingModeSelect?.value || 'ink');
      formData.append('ocrEngine', chosenEngine);
      if (userVisionKey) {
        formData.append('visionApiKey', userVisionKey);
      }

      const res = await fetch(API_ENDPOINTS.SCAN_LETTER, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo analizar la carta.');
      }

      const ocr = data.ocr || {};
      if (titleInput) titleInput.value = ocr.suggestedTitle || '';
      if (textInput) textInput.value = ocr.suggestedText || ocr.fullText || '';
      if (signatureInput) signatureInput.value = ocr.suggestedSignature || '';

      const engineTag = ocr.engine === 'gemini-vision-htr' ? 'Visión IA' : 'PP-OCRv5';
      if (confidencePill) {
        confidencePill.textContent = `${engineTag} · ${ocr.confidence ?? 0}% · ${ocr.wordCount ?? 0} palabras`;
        confidencePill.className = `sl-pill ${(ocr.confidence ?? 0) >= 65 ? 'sl-pill--lime' : 'sl-pill--mist'}`;
      }

      if (data.drawing?.detected && data.drawing?.asset) {
        extractedAsset = data.drawing.asset;
        cropBoxPct = data.drawing.cropBoxPct || null;
        renderCropBox();
        renderExtractedDrawing();
        setStatus(
          `Lectura completada (${ocr.wordCount ?? 0} palabras) y dibujo separado automáticamente en 300 DPI.`,
          'ok'
        );
      } else {
        extractedAsset = null;
        cropBoxPct = null;
        renderCropBox();
        renderExtractedDrawing();
        setStatus(
          ocr.wordCount
            ? `Texto reconocido (${ocr.wordCount} palabras). Si la letra es muy tenue probá "Realzar Lápiz / Birome Fina", o arrastrá sobre la foto para recortar un dibujo.`
            : 'No se detectaron renglones claros. Probá cambiar a "Realzar Lápiz / Birome Fina" o "Sombra Fuerte" y tocar Re-analizar.',
          ocr.wordCount ? 'ok' : 'error'
        );
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setStatus(`Error al escanear: ${err.message}`, 'error');
      if (confidencePill) {
        confidencePill.textContent = 'Error';
        confidencePill.className = 'sl-pill sl-pill--mist';
      }
      notify?.(`Error en el escáner: ${err.message}`);
    } finally {
      if (scanAbortController === controller) {
        scanAbortController = null;
        if (btnRunOcr) btnRunOcr.disabled = !selectedFile;
      }
    }
  }

  async function extractManualCrop() {
    if (!selectedFile || !cropBoxPct) return;
    cancelActiveScan();
    const controller = new AbortController();
    scanAbortController = controller;

    if (btnExtractManualCrop) btnExtractManualCrop.disabled = true;
    setStatus('Recortando dibujo y nivelando fondo blanco a 300 DPI...', 'working');

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
        body: formData,
        signal: controller.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.asset) {
        throw new Error(data.error || 'No se pudo extraer el dibujo.');
      }

      extractedAsset = data.asset;
      renderExtractedDrawing();
      setStatus('Dibujo recortado y convertido a grabado 300 DPI listo para la hoja.', 'ok');
      notify?.('Dibujo extraído de la carta en tinta 300 DPI.');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setStatus(`Error al recortar dibujo: ${err.message}`, 'error');
      notify?.(`Error al extraer dibujo: ${err.message}`);
    } finally {
      if (scanAbortController === controller) {
        scanAbortController = null;
      }
      if (btnExtractManualCrop) btnExtractManualCrop.disabled = false;
    }
  }

  function isModalOpen() {
    return !modal.classList.contains('is-hidden');
  }

  function open() {
    const book = getCurrentBook?.();
    if (!book) {
      notify?.('Primero abrí o creá un poemario para escanear una carta.');
      return;
    }
    syncEngineUi();
    modal.classList.remove('is-hidden');
  }

  function close() {
    cancelActiveScan();
    stopWebcam();
    if (activeTab === 'camera') {
      activeTab = 'upload';
      tabBtnUpload?.classList.add('is-active');
      tabBtnUpload?.setAttribute('aria-selected', 'true');
      tabBtnCamera?.classList.remove('is-active');
      tabBtnCamera?.setAttribute('aria-selected', 'false');
      panelUpload?.classList.remove('is-hidden');
      panelCamera?.classList.add('is-hidden');
    }
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

  // Escape to close & Ctrl+V clipboard image paste while modal is open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen()) {
      e.preventDefault();
      close();
    }
  });

  document.addEventListener('paste', (e) => {
    if (!isModalOpen()) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find((it) => it.type.startsWith('image/'));
    if (imgItem) {
      const file = imgItem.getAsFile();
      if (file) {
        e.preventDefault();
        switchSourceTab('upload');
        setSelectedImageFile(file, true);
      }
    }
  });

  // Source tabs
  tabBtnUpload?.addEventListener('click', () => switchSourceTab('upload'));
  tabBtnCamera?.addEventListener('click', () => switchSourceTab('camera'));
  btnStopWebcam?.addEventListener('click', () => switchSourceTab('upload'));
  btnRetryCamera?.addEventListener('click', () => startWebcam(cameraDeviceSelect?.value || ''));

  cameraDeviceSelect?.addEventListener('change', () => {
    if (activeTab === 'camera') {
      startWebcam(cameraDeviceSelect.value);
    }
  });

  btnMirrorToggle?.addEventListener('click', () => {
    isMirrored = !isMirrored;
    webcamVideo?.classList.toggle('is-mirrored', isMirrored);
  });

  btnPickFile?.addEventListener('click', () => fileInput?.click());
  btnMobileCam?.addEventListener('click', () => camFileInput?.click());
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

  engineSelect?.addEventListener('change', () => {
    syncEngineUi();
    if (selectedFile && (engineSelect.value !== 'vision_ai' || visionKeyInput?.value?.trim())) {
      runPaperScan();
    }
  });

  enhanceSelect?.addEventListener('change', () => {
    if (selectedFile) runPaperScan();
  });

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

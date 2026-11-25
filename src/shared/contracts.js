/**
 * Shared contracts & constants between Node.js Express backend and Browser ES Modules.
 * Pure isomorphic JavaScript — no Node-specific imports allowed here.
 */

export const PAPER_SHEETS = {
  A4: {
    id: 'A4',
    name: 'Hoja A4 (210 × 297 mm)',
    shortName: 'A4',
    widthMm: 210,
    heightMm: 297,
    description: 'Estándar universal en hogares, librerías y gráficas de Argentina y Latinoamérica/Europa.'
  },
  LETTER: {
    id: 'LETTER',
    name: 'Hoja Carta / Letter (215.9 × 279.4 mm)',
    shortName: 'Carta',
    widthMm: 215.9,
    heightMm: 279.4,
    description: 'Formato clásico de oficina e imprentas digitales en Norteamérica y región.'
  },
  A3: {
    id: 'A3',
    name: 'Hoja A3 (297 × 420 mm)',
    shortName: 'A3',
    widthMm: 297,
    heightMm: 420,
    description: 'Doble de A4, ideal en gráficas para pliegos grandes o más páginas por hoja.'
  }
};

export const BOOK_FORMATS = {
  saddle_half: {
    id: 'saddle_half',
    name: 'Cuadernillo Clásico (1/2 Hoja doblada al medio)',
    shortLabel: 'Cuadernillo 1/2 Hoja (Tipo A5)',
    pagesMultiple: 4,
    defaultPages: 8,
    duplex: true,
    flipEdge: 'short',
    requiresCut: false,
    bindingMethod: 'Doblado central al medio + 2 grapas a caballo o costura japonesa/hilo en el lomo.',
    summary: 'El formato clásico de poemario (148.5 × 210 mm en A4). Imprimís frente y dorso, ponés una hoja dentro de otra y doblás exactamente a la mitad.'
  },
  pocket_quarter: {
    id: 'pocket_quarter',
    name: 'Mini-Libro de Bolsillo (1/4 de Hoja · Muy Chico)',
    shortLabel: 'Bolsillo 1/4 Hoja (Tipo A6)',
    pagesMultiple: 8,
    defaultPages: 8,
    duplex: true,
    flipEdge: 'long',
    requiresCut: true,
    bindingMethod: '1 corte horizontal al medio de la hoja + doblado vertical de cada tira encartada.',
    summary: 'Librito íntimo de bolsillo (105 × 148.5 mm en A4). Entran 8 páginas en 1 sola hoja impresa de ambos lados.'
  },
  single_sheet_zine: {
    id: 'single_sheet_zine',
    name: 'Fanzine de 1 Sola Hoja (8 págs con 1 corte central)',
    shortLabel: 'Fanzine 1 Hoja (Sin grapas)',
    pagesMultiple: 8,
    defaultPages: 8,
    duplex: false,
    flipEdge: 'none',
    requiresCut: true,
    bindingMethod: 'Impresión de 1 sola cara + 1 corte central de media hoja + plegado en W sin grapas ni hilo.',
    summary: 'Mini-libro instantáneo (74.25 × 105 mm en A4 o 105 × 148.5 mm en A3). Las 4 páginas superiores se rotan 180° automáticamente.'
  },
  custom_nup: {
    id: 'custom_nup',
    name: 'Formato a Medida del Usuario (Ancho × Alto en mm)',
    shortLabel: 'Medida Personalizada (mm)',
    pagesMultiple: 2,
    defaultPages: 8,
    duplex: true,
    flipEdge: 'long',
    requiresCut: true,
    bindingMethod: 'Imposición automática N-up centrada con dorso espejado al milímetro y marcas exteriores de guillotina.',
    summary: 'Elegís exactamente cuántos milímetros mide cada página cerrada y el sistema acomoda cuántas entran por hoja con registro frente/dorso.'
  }
};

export const PAGE_LAYOUTS = {
  cover: {
    id: 'cover',
    name: 'Portada Minimalista de Libro',
    inspiration: 'Portada Editorial',
    hasSecondaryOrnament: false,
    supportsTitle: true,
    slotPosition: 'center-top'
  },
  dedication: {
    id: 'dedication',
    name: 'Dedicatoria / Portadilla Interior',
    inspiration: 'Interior Íntimo',
    hasSecondaryOrnament: false,
    supportsTitle: false,
    slotPosition: 'top-mini'
  },
  butterflies: {
    id: 'butterflies',
    name: '1. Vuelo arriba + Escena abajo derecha (Foto 1)',
    inspiration: 'Referencia Foto 1',
    hasSecondaryOrnament: true,
    secondaryDefaultId: 'butterfliesTop',
    primaryDefaultId: 'fallingCouple',
    supportsTitle: false,
    slotPosition: 'bottom-right'
  },
  klimt: {
    id: 'klimt',
    name: '2. Marco Lateral Encuadrado tipo Klimt (Foto 2)',
    inspiration: 'Referencia Foto 2',
    hasSecondaryOrnament: false,
    primaryDefaultId: 'klimtKiss',
    supportsTitle: false,
    slotPosition: 'right-frame'
  },
  baroque: {
    id: 'baroque',
    name: '3. Esquinero Barroco + Grabado abajo (Foto 3)',
    inspiration: 'Referencia Foto 3',
    hasSecondaryOrnament: true,
    secondaryDefaultId: 'baroqueCorner',
    primaryDefaultId: 'weepingAngel',
    supportsTitle: false,
    slotPosition: 'bottom-right'
  },
  starboy: {
    id: 'starboy',
    name: '4. Silueta Vertical Derecha & Astro (Foto 4)',
    inspiration: 'Referencia Foto 4',
    hasSecondaryOrnament: false,
    primaryDefaultId: 'boyReachingStar',
    supportsTitle: false,
    slotPosition: 'right-tall'
  },
  cupid: {
    id: 'cupid',
    name: '5. Viñeta Superior Derecha + Versos Amplios (Foto 5)',
    inspiration: 'Referencia Foto 5',
    hasSecondaryOrnament: false,
    primaryDefaultId: 'cupidTopRight',
    supportsTitle: false,
    slotPosition: 'top-right'
  },
  sacredheart: {
    id: 'sacredheart',
    name: '6. Símbolo Radiante + Botánica al Pie (Foto 6)',
    inspiration: 'Referencia Foto 6',
    hasSecondaryOrnament: true,
    secondaryDefaultId: 'sacredHeart',
    primaryDefaultId: 'botanicalFlowers',
    supportsTitle: false,
    slotPosition: 'bottom-right-tall'
  },
  diptych_poem: {
    id: 'diptych_poem',
    name: '7. Página Literaria Limpia / Continuación',
    inspiration: 'Doble Página / Poema Largo',
    hasSecondaryOrnament: false,
    primaryDefaultId: 'quillInk',
    supportsTitle: true,
    slotPosition: 'bottom-center-mini'
  },
  backcover: {
    id: 'backcover',
    name: '8. Contratapa & Colofón Editorial',
    inspiration: 'Cierre de Libro',
    hasSecondaryOrnament: false,
    primaryDefaultId: 'butterfliesTop',
    supportsTitle: false,
    slotPosition: 'center-emblem'
  }
};

export const POEM_FONTS = {
  'font-serif-italic': {
    id: 'font-serif-italic',
    name: 'Cursiva Poética',
    sample: 'En este o en otro mundo',
    description: 'Serif itálica cálida e íntima, ideal para versos románticos y confesionales.'
  },
  'font-serif-classic': {
    id: 'font-serif-classic',
    name: 'Clásica de Libro',
    sample: 'Todas las noches pienso',
    description: 'Serif editorial de trazos finos estilo poemario impreso clásico.'
  },
  'font-sans-clean': {
    id: 'font-sans-clean',
    name: 'Limpia Contemporánea',
    sample: 'Me apago lentamente',
    description: 'Sin serifa aireada y serena, inspirada en las fotos 4 y 5.'
  },
  'font-mono-zine': {
    id: 'font-mono-zine',
    name: 'Máquina / Fanzine',
    sample: 'Versos a medianoche',
    description: 'Monoespaciada de autor para fanzines artesanales y poesía urbana.'
  }
};

export const FONT_SIZES = [
  { id: '9.5pt', label: 'Mini (9.5pt · Fanzine / Poema extenso)', pt: 9.5 },
  { id: '11pt', label: 'Chica (11pt · Poema largo)', pt: 11 },
  { id: '12.5pt', label: 'Mediana (12.5pt · Equilibrada)', pt: 12.5 },
  { id: '14pt', label: 'Grande (14pt · Poema breve)', pt: 14 }
];

export const ENGRAVING_MODES = {
  ink: {
    id: 'ink',
    name: 'Pluma & Tinta (Alto Contraste)',
    description: 'Lleva el fondo a blanco puro y los trazos a negro intenso. Ideal para dibujos, siluetas y símbolos.'
  },
  engraving: {
    id: 'engraving',
    name: 'Grabado Editorial (Trama Atkinson)',
    description: 'Convierte fotos reales (rostros, flores, paisajes) en puntos de grabado que nunca salen empastados al imprimir.'
  },
  sketch: {
    id: 'sketch',
    name: 'Boceto Lápiz Suave',
    description: 'Conserva medios tonos delicados limpiando el fondo al blanco del papel.'
  }
};

export const API_ENDPOINTS = {
  BOOKS: '/api/books',
  BOOK_BY_ID: (id) => `/api/books/${encodeURIComponent(id)}`,
  BOOK_DUPLICATE: (id) => `/api/books/${encodeURIComponent(id)}/duplicate`,
  ANALYZE_POEM: '/api/poems/analyze',
  ILLUSTRATIONS: '/api/illustrations',
  ENGRAVE_UPLOAD: '/api/art/engrave-upload',
  ONLINE_SEARCH: '/api/art/online-search',
  FORMAT_SPECS: '/api/formats/specs',
  IMPOSITION_PREVIEW: '/api/imposition/preview',
  BOOK_IMPOSITION: (id) => `/api/books/${encodeURIComponent(id)}/imposition`,
  EXPORT_PRESS_PDF: (id) => `/api/books/${encodeURIComponent(id)}/export/press.pdf`,
  EXPORT_GUIDE_PDF: (id) => `/api/books/${encodeURIComponent(id)}/export/guide.pdf`,
  SCAN_LETTER: '/api/scan/letter',
  SCAN_EXTRACT_DRAWING: '/api/scan/extract-drawing'
};

/**
 * Normalizes a draggable extra image entry attached freely onto a page.
 */
export function normalizeExtraImage(raw = {}, fallbackIndex = 0) {
  const kind = raw.kind === 'custom' && raw.customImageUrl ? 'custom' : 'svg';
  const clamp = (val, min, max, def) => {
    const n = Number(val);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def;
  };
  return {
    uid: typeof raw.uid === 'string' && raw.uid.trim()
      ? raw.uid.trim().slice(0, 64)
      : `ext-${Date.now()}-${fallbackIndex}`,
    kind,
    illustrationId: kind === 'svg' ? (raw.illustrationId || 'miniMoon') : null,
    customImageUrl: kind === 'custom' ? String(raw.customImageUrl) : null,
    title: typeof raw.title === 'string' ? raw.title.slice(0, 100) : 'Grabado extra',
    xPct: Number(clamp(raw.xPct, 2, 88, 62).toFixed(1)),
    yPct: Number(clamp(raw.yPct, 2, 88, 66).toFixed(1)),
    widthPct: Number(clamp(raw.widthPct, 8, 75, 24).toFixed(1)),
    rotationDeg: Math.round(clamp(raw.rotationDeg, -180, 180, 0))
  };
}

/**
 * Validates and normalizes a single page object.
 */
export function createDefaultPage(id, overrides = {}) {
  const extraImages = Array.isArray(overrides.extraImages)
    ? overrides.extraImages.slice(0, 12).map((item, idx) => normalizeExtraImage(item, idx))
    : [];

  return {
    id,
    role: overrides.role || `Página ${id}`,
    layout: overrides.layout || 'butterflies',
    font: overrides.font || 'font-serif-italic',
    fontSize: overrides.fontSize || '12.5pt',
    title: overrides.title || '',
    subtitle: overrides.subtitle || '',
    text: overrides.text ?? 'Escribe aquí tus versos...',
    signature: overrides.signature ?? '',
    illustrationId: overrides.illustrationId ?? null,
    secondaryIllustrationId: overrides.secondaryIllustrationId ?? null,
    customImageUrl: overrides.customImageUrl ?? null,
    customImageMeta: overrides.customImageMeta ?? null,
    imageFit: overrides.imageFit || 'contain',
    extraImages,
    showPageNumber: overrides.showPageNumber ?? (id > 2)
  };
}

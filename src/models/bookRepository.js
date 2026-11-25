import crypto from 'node:crypto';
import { JsonStore } from './jsonStore.js';
import {
  PAPER_SHEETS,
  BOOK_FORMATS,
  PAGE_LAYOUTS,
  POEM_FONTS,
  createDefaultPage
} from '../shared/contracts.js';

import path from 'node:path';

export const BOOKS_FILE_PATH = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.resolve(process.cwd(), 'data/books.json');
const SEED_BOOK_ID = 'seed-en-este-o-en-otro-mundo';

const store = new JsonStore(BOOKS_FILE_PATH, {
  version: 1,
  seeded: false,
  books: []
});

const INTERIOR_ROTATION_LAYOUTS = [
  'klimt',
  'butterflies',
  'baroque',
  'starboy',
  'cupid',
  'sacredheart',
  'diptych_poem'
];

function clampDimension(value, fallback, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Number(Math.max(min, Math.min(max, num)).toFixed(2));
}

function normalizeFontSize(fontSize, fallback = '12.5pt') {
  if (typeof fontSize === 'string' && /^\d+(\.\d+)?pt$/.test(fontSize.trim())) {
    return fontSize.trim();
  }
  return fallback;
}

function normalizePage(rawPage, index) {
  const pageNumber = index + 1;
  const src = rawPage && typeof rawPage === 'object' ? rawPage : {};
  const layout = PAGE_LAYOUTS[src.layout] ? src.layout : 'butterflies';
  const font = POEM_FONTS[src.font] ? src.font : 'font-serif-italic';
  const fontSize = normalizeFontSize(src.fontSize, '12.5pt');
  const imageFit = src.imageFit === 'cover' ? 'cover' : 'contain';

  return createDefaultPage(pageNumber, {
    role: typeof src.role === 'string' && src.role.trim() ? src.role.trim() : `Página ${pageNumber}`,
    layout,
    font,
    fontSize,
    title: typeof src.title === 'string' ? src.title : '',
    subtitle: typeof src.subtitle === 'string' ? src.subtitle : '',
    text: typeof src.text === 'string' ? src.text : '',
    signature: typeof src.signature === 'string' ? src.signature : '',
    illustrationId: src.illustrationId ?? null,
    secondaryIllustrationId: src.secondaryIllustrationId ?? null,
    customImageUrl: src.customImageUrl ?? null,
    customImageMeta: src.customImageMeta ?? null,
    imageFit,
    extraImages: Array.isArray(src.extraImages) ? src.extraImages : [],
    showPageNumber: typeof src.showPageNumber === 'boolean'
      ? src.showPageNumber
      : (layout !== 'cover' && layout !== 'dedication' && layout !== 'backcover' && pageNumber > 2)
  });
}

/**
 * Builds the exact 8-page seed poetry book migrated from the original HTML prototype.
 */
export function buildSeedBook() {
  const now = new Date().toISOString();
  const rawSeedPages = [
    {
      role: 'Página 1 (Tapa del Libro)',
      layout: 'cover',
      font: 'font-serif-italic',
      fontSize: '14pt',
      title: 'En este o en otro mundo',
      subtitle: 'Pequeño poemario para Bianca',
      text: 'Porque todo el tiempo que vivimos,\nno lo siento suficiente.',
      signature: 'De Grego para mi Cuchi',
      illustrationId: 'sacredHeart',
      secondaryIllustrationId: null,
      showPageNumber: false
    },
    {
      role: 'Página 2 (Interior de Tapa / Dedicatoria)',
      layout: 'dedication',
      font: 'font-serif-classic',
      fontSize: '12.5pt',
      title: '',
      subtitle: '',
      text: 'Para Bianca,\nla persona que quiero ver\ntodos los días de mi vida.\n\nGracias por abrazar mis miedos\ny enseñarme a quedarme.',
      signature: 'Feliz Aniversario 🤍',
      illustrationId: null,
      secondaryIllustrationId: null,
      showPageNumber: false
    },
    {
      role: 'Página 3 (Tu Poema Principal - Diseño Klimt Foto 2)',
      layout: 'klimt',
      font: 'font-serif-italic',
      fontSize: '12.5pt',
      title: '',
      subtitle: '',
      text: 'Aunque hoy me sienta vencido,\nme sienta un poco más roto y juzgado,\nsi hay un mañana\ny hay interés de tu parte,\n\nte volveré a buscar\ncuando despierte\nen este o en otro mundo,\nen este o en otro ser,\nen este o en otra piel,\ncon este o con otro corazón.\n\nLo que prometo,\nentregártelo también.\n\nPorque todo el tiempo que vivimos,\nno lo siento suficiente.',
      signature: '- Grego',
      illustrationId: 'klimtKiss',
      secondaryIllustrationId: null,
      showPageNumber: true
    },
    {
      role: 'Página 4 (Diseño Mariposas Foto 1)',
      layout: 'butterflies',
      font: 'font-serif-italic',
      fontSize: '12.5pt',
      title: '',
      subtitle: '',
      text: 'Me gusta pensar\nque a veces me dejas caminar\npor los senderos\nde tus memorias.\n\nImaginar que, de vez en cuando,\nme buscas en alguna estrella,\nen algún rincón de la noche.\n\n¿Aún te acordarás\nde que amábamos la lluvia?\n¿Que cuando estás sola\nrecordarás la forma\nen que cuidaba tu sueño?\n\nMe gusta pensar que a veces,\ntu corazón suspira\nal pensar en mi nombre.',
      signature: '- Grego',
      illustrationId: 'fallingCouple',
      secondaryIllustrationId: 'butterfliesTop',
      showPageNumber: true
    },
    {
      role: 'Página 5 (Diseño Barroco & Ángel Foto 3)',
      layout: 'baroque',
      font: 'font-serif-classic',
      fontSize: '12.5pt',
      title: '',
      subtitle: '',
      text: 'Todas las noches muero pensando,\npienso en esa persona de ensueño,\nque sus ojos embriaguen mi corazón,\nque su voz sea mi canción favorita.\n\nTodas las noches pienso en un ser,\nque su abrazo consuele mi alma,\nque sus besos\nsean el pañuelo que seque mis lágrimas.\n\nPero, sin darme cuenta,\ncada noche, sin falta,\ntermino pensando en ti.',
      signature: '- Grego',
      illustrationId: 'weepingAngel',
      secondaryIllustrationId: 'baroqueCorner',
      showPageNumber: true
    },
    {
      role: 'Página 6 (Diseño Silueta & Estrella Foto 4)',
      layout: 'starboy',
      font: 'font-sans-clean',
      fontSize: '11pt',
      title: '',
      subtitle: '',
      text: 'Qué afortunado es\neste universo\nde presenciar tan\nexclusiva belleza.\n\n¿A Dios le debería dar las gracias\npor poder vivir\nen el mismo tiempo que vos?\n\nPor poder respirar\nel mismo aire cálido que vos.\n\nQué afortunados son mis ojos\nde percibir cada detalle que hay en ti.\n\nQué suerte tiene mi corazón\nde poder latir\ngracias a ti.',
      signature: '- Grego',
      illustrationId: 'boyReachingStar',
      secondaryIllustrationId: null,
      showPageNumber: true
    },
    {
      role: 'Página 7 (Diseño Corazón Radiante & Flores Foto 6)',
      layout: 'sacredheart',
      font: 'font-serif-italic',
      fontSize: '12.5pt',
      title: '',
      subtitle: '',
      text: 'Perdona las faltas que tuve,\nlos errores que como hombre cometí,\npero es que no hay manual alguno\npara el cuidado de una estrella.\n\nEn medio del ruido te veo,\nahí estás,\nbrillante y única.\n\nY aunque a veces tenga miedo,\nsiempre elijo quedarme\na tu lado.',
      signature: '- Grego',
      illustrationId: 'botanicalFlowers',
      secondaryIllustrationId: 'sacredHeart',
      showPageNumber: true
    },
    {
      role: 'Página 8 (Contratapa del Libro)',
      layout: 'backcover',
      font: 'font-serif-italic',
      fontSize: '11pt',
      title: '',
      subtitle: '',
      text: 'Sos la persona que quiero ver\ntodos los días de mi vida.',
      signature: 'Bianca & Grego • 2026',
      illustrationId: 'butterfliesTop',
      secondaryIllustrationId: null,
      showPageNumber: false
    }
  ];

  return {
    id: SEED_BOOK_ID,
    title: 'En este o en otro mundo',
    subtitle: 'Pequeño poemario para Bianca',
    author: 'Grego',
    paperId: 'A4',
    formatId: 'saddle_half',
    customWidthMm: 105,
    customHeightMm: 148,
    pages: rawSeedPages.map((page, idx) => normalizePage(page, idx)),
    createdAt: now,
    updatedAt: now
  };
}

function normalizeStoreShape(raw) {
  if (Array.isArray(raw)) {
    return {
      version: 1,
      seeded: raw.length > 0,
      books: raw
    };
  }
  if (raw && typeof raw === 'object') {
    return {
      version: 1,
      seeded: Boolean(raw.seeded),
      books: Array.isArray(raw.books) ? raw.books : []
    };
  }
  return { version: 1, seeded: false, books: [] };
}

async function ensureInitialized() {
  const current = normalizeStoreShape(await store.read());
  if (!current.seeded && current.books.length === 0) {
    return store.update((raw) => {
      const state = normalizeStoreShape(raw);
      if (!state.seeded && state.books.length === 0) {
        state.books = [buildSeedBook()];
        state.seeded = true;
      }
      return state;
    });
  }
  return current;
}

function generateInitialPages({
  title,
  subtitle,
  author,
  formatId,
  pageCount
}) {
  const format = BOOK_FORMATS[formatId] || BOOK_FORMATS.saddle_half;
  const multiple = format.id === 'custom_nup' ? 2 : (format.pagesMultiple || 4);
  const requested = Number(pageCount) || format.defaultPages || 8;
  const clamped = Math.max(Math.max(4, multiple), Math.min(64, Math.ceil(requested / multiple) * multiple));

  const pages = [];
  for (let i = 0; i < clamped; i += 1) {
    const pageNum = i + 1;
    if (pageNum === 1) {
      pages.push(createDefaultPage(1, {
        role: 'Página 1 (Tapa del Libro)',
        layout: 'cover',
        font: 'font-serif-italic',
        fontSize: '14pt',
        title,
        subtitle,
        text: 'Escribe aquí el epígrafe o verso de apertura...',
        signature: author || '',
        illustrationId: 'sacredHeart',
        secondaryIllustrationId: null,
        showPageNumber: false
      }));
    } else if (pageNum === 2) {
      pages.push(createDefaultPage(2, {
        role: 'Página 2 (Dedicatoria)',
        layout: 'dedication',
        font: 'font-serif-classic',
        fontSize: '12.5pt',
        title: '',
        subtitle: '',
        text: 'Dedicatoria íntima para abrir el poemario...',
        signature: author ? `— ${author}` : '',
        illustrationId: null,
        secondaryIllustrationId: null,
        showPageNumber: false
      }));
    } else if (pageNum === clamped) {
      pages.push(createDefaultPage(clamped, {
        role: `Página ${clamped} (Contratapa del Libro)`,
        layout: 'backcover',
        font: 'font-serif-italic',
        fontSize: '11pt',
        title: '',
        subtitle: '',
        text: 'Verso final o colofón de esta edición artesanal.',
        signature: `${author || 'Edición de Autor'} • ${new Date().getFullYear()}`,
        illustrationId: PAGE_LAYOUTS.backcover.primaryDefaultId || 'butterfliesTop',
        secondaryIllustrationId: null,
        showPageNumber: false
      }));
    } else {
      const layoutId = INTERIOR_ROTATION_LAYOUTS[(pageNum - 3) % INTERIOR_ROTATION_LAYOUTS.length];
      const layoutSpec = PAGE_LAYOUTS[layoutId] || PAGE_LAYOUTS.butterflies;
      pages.push(createDefaultPage(pageNum, {
        role: `Página ${pageNum} (Poema ${pageNum - 2})`,
        layout: layoutSpec.id,
        font: pageNum % 2 === 0 ? 'font-serif-classic' : 'font-serif-italic',
        fontSize: '12.5pt',
        title: '',
        subtitle: '',
        text: 'Escribe aquí tus versos...',
        signature: author ? `- ${author}` : '',
        illustrationId: layoutSpec.primaryDefaultId ?? null,
        secondaryIllustrationId: layoutSpec.secondaryDefaultId ?? null,
        showPageNumber: true
      }));
    }
  }
  return pages;
}

export async function listBooks() {
  const state = await ensureInitialized();
  return state.books;
}

export async function getBookById(id) {
  if (!id) return null;
  const state = await ensureInitialized();
  return state.books.find((b) => b.id === String(id)) || null;
}

export async function createBook(payload = {}) {
  await ensureInitialized();
  const now = new Date().toISOString();

  const paperId = PAPER_SHEETS[payload.paperId] ? payload.paperId : 'A4';
  const formatId = BOOK_FORMATS[payload.formatId] ? payload.formatId : 'saddle_half';
  const title = typeof payload.title === 'string' && payload.title.trim()
    ? payload.title.trim()
    : 'Nuevo Poemario';
  const subtitle = typeof payload.subtitle === 'string'
    ? payload.subtitle.trim()
    : 'Edición artesanal en tinta';
  const author = typeof payload.author === 'string'
    ? payload.author.trim()
    : '';
  const customWidthMm = clampDimension(payload.customWidthMm, 105, 45, 400);
  const customHeightMm = clampDimension(payload.customHeightMm, 148, 60, 410);

  const pages = Array.isArray(payload.pages) && payload.pages.length > 0
    ? payload.pages.map((p, idx) => normalizePage(p, idx))
    : generateInitialPages({
        title,
        subtitle,
        author,
        formatId,
        pageCount: payload.pageCount
      });

  const newBook = {
    id: crypto.randomUUID(),
    title,
    subtitle,
    author,
    paperId,
    formatId,
    customWidthMm,
    customHeightMm,
    pages,
    createdAt: now,
    updatedAt: now
  };

  await store.update((raw) => {
    const state = normalizeStoreShape(raw);
    state.seeded = true;
    state.books.push(newBook);
    return state;
  });

  return structuredClone(newBook);
}

export async function updateBook(id, payload = {}) {
  if (!id) return null;
  await ensureInitialized();

  let updatedBook = null;

  await store.update((raw) => {
    const state = normalizeStoreShape(raw);
    const idx = state.books.findIndex((b) => b.id === String(id));
    if (idx === -1) {
      return state;
    }

    const existing = state.books[idx];
    const paperId = payload.paperId !== undefined
      ? (PAPER_SHEETS[payload.paperId] ? payload.paperId : existing.paperId)
      : existing.paperId;
    const formatId = payload.formatId !== undefined
      ? (BOOK_FORMATS[payload.formatId] ? payload.formatId : existing.formatId)
      : existing.formatId;

    const pages = Array.isArray(payload.pages) && payload.pages.length > 0
      ? payload.pages.map((p, pageIdx) => normalizePage(p, pageIdx))
      : existing.pages.map((p, pageIdx) => normalizePage(p, pageIdx));

    updatedBook = {
      ...existing,
      id: existing.id,
      title: typeof payload.title === 'string' && payload.title.trim()
        ? payload.title.trim()
        : existing.title,
      subtitle: typeof payload.subtitle === 'string'
        ? payload.subtitle
        : existing.subtitle,
      author: typeof payload.author === 'string'
        ? payload.author
        : existing.author,
      paperId,
      formatId,
      customWidthMm: payload.customWidthMm !== undefined
        ? clampDimension(payload.customWidthMm, existing.customWidthMm ?? 105, 45, 400)
        : (existing.customWidthMm ?? 105),
      customHeightMm: payload.customHeightMm !== undefined
        ? clampDimension(payload.customHeightMm, existing.customHeightMm ?? 148, 60, 410)
        : (existing.customHeightMm ?? 148),
      pages,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    state.books[idx] = updatedBook;
    return state;
  });

  return updatedBook ? structuredClone(updatedBook) : null;
}

export async function duplicateBook(id) {
  if (!id) return null;
  await ensureInitialized();

  let duplicated = null;

  await store.update((raw) => {
    const state = normalizeStoreShape(raw);
    const idx = state.books.findIndex((b) => b.id === String(id));
    if (idx === -1) {
      return state;
    }

    const source = state.books[idx];
    const now = new Date().toISOString();
    duplicated = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      title: `${source.title} (Copia)`,
      pages: source.pages.map((p, pageIdx) => normalizePage(p, pageIdx)),
      createdAt: now,
      updatedAt: now
    };

    state.books.splice(idx + 1, 0, duplicated);
    return state;
  });

  return duplicated ? structuredClone(duplicated) : null;
}

export async function deleteBook(id) {
  if (!id) return false;
  await ensureInitialized();

  let removed = false;

  await store.update((raw) => {
    const state = normalizeStoreShape(raw);
    const prevLen = state.books.length;
    state.books = state.books.filter((b) => b.id !== String(id));
    removed = state.books.length < prevLen;
    state.seeded = true;
    return state;
  });

  return removed;
}

export async function resetSeedBook() {
  await ensureInitialized();
  const freshSeed = buildSeedBook();

  await store.update((raw) => {
    const state = normalizeStoreShape(raw);
    state.seeded = true;
    const existingIdx = state.books.findIndex((b) => b.id === SEED_BOOK_ID);
    if (existingIdx !== -1) {
      state.books[existingIdx] = freshSeed;
    } else {
      state.books.unshift(freshSeed);
    }
    return state;
  });

  return structuredClone(freshSeed);
}

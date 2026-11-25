/**
 * Isomorphic Spanish Lexical-Poetic Analyzer, Layout Advisor & Illustration Matcher.
 * Pure ES Module — zero Node.js imports; runs identically in Node.js and Browser.
 */

import { ILLUSTRATIONS_CATALOG, getIllustrationById } from './illustrationsCatalog.js';
import { getRecommendedSlotSpecs } from './formatSpecs.js';
import { PAGE_LAYOUTS, FONT_SIZES } from './contracts.js';

/**
 * Normalizes Spanish text by stripping diacritics/accents and lowercasing.
 */
export function normalizeSpanishText(input = '') {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Extracts clean normalized word tokens from normalized text.
 */
function tokenizeNormalized(normalizedText) {
  return normalizedText
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

/**
 * Rich Spanish poetic lexicon (>240 words & roots) across 10 thematic axes.
 */
export const POETIC_LEXICON = [
  {
    id: 'amor',
    label: 'Amor & Vínculo',
    catalogCategories: ['amor'],
    englishTerms: ['romantic couple', 'lovers embrace', 'intertwined hands'],
    exactWords: [
      'amor', 'amar', 'amo', 'amas', 'ama', 'amamos', 'amaba', 'amabamos', 'amado', 'amada', 'amante', 'amantes',
      'piel', 'beso', 'besos', 'besar', 'abrazo', 'abrazos', 'abrazar', 'caricia', 'caricias', 'acariciar',
      'labio', 'labios', 'boca', 'cuerpo', 'deseo', 'querer', 'quiero', 'quise', 'pareja', 'juntos', 'junto',
      'latido', 'latir', 'late', 'ternura', 'pasion', 'pecho', 'mano', 'manos', 'dedos', 'tacto', 'calido',
      'calor', 'tuyo', 'tuya', 'contigo', 'quedarme', 'quedate', 'quedarse', 'lado', 'entregartelo', 'entregar',
      'aniversario', 'cuchi', 'querida', 'querido', 'vida mia', 'enamorado', 'enamorada'
    ],
    stems: ['abraz', 'acarici', 'enamor', 'besand', 'amand']
  },
  {
    id: 'cosmos',
    label: 'Cosmos & Noche Estrellada',
    catalogCategories: ['cosmos'],
    englishTerms: ['night stars', 'crescent moon', 'celestial constellation'],
    exactWords: [
      'estrella', 'estrellas', 'astro', 'astros', 'universo', 'cosmos', 'cielo', 'cielos', 'celeste',
      'noche', 'noches', 'nocturno', 'nocturna', 'luna', 'lunar', 'menguante', 'creciente', 'eclipse',
      'constelacion', 'galaxia', 'cometa', 'infinito', 'infinita', 'firmamento', 'lucero', 'orbita',
      'planeta', 'mundo', 'mundos', 'sol', 'solar', 'aurora', 'alba', 'amanecer', 'brillar', 'brilla',
      'brillante', 'destello', 'medianoche', 'oscuridad', 'cordillera', 'montana', 'cumbre', 'unica', 'unico'
    ],
    stems: ['estrell', 'univers', 'constelac', 'nocturn', 'respland']
  },
  {
    id: 'botanica',
    label: 'Botánica & Jardín',
    catalogCategories: ['botanica'],
    englishTerms: ['botanical flower', 'wild rose', 'floral stem'],
    exactWords: [
      'flor', 'flores', 'jardin', 'jardines', 'raiz', 'raices', 'primavera', 'rosa', 'rosas', 'rosal',
      'espina', 'espinas', 'petalo', 'petalos', 'tallo', 'tallos', 'hoja', 'hojas', 'arbol', 'arboles',
      'bosque', 'semilla', 'semillas', 'brote', 'brotar', 'florecer', 'ramo', 'loto', 'azucena', 'jazmin',
      'lavanda', 'hiedra', 'prado', 'campo', 'hierba', 'perfume', 'aroma', 'fragancia', 'naturaleza', 'diente'
    ],
    stems: ['florec', 'jardin', 'primaver', 'botanic', 'semill']
  },
  {
    id: 'vuelo',
    label: 'Vuelo & Libertad',
    catalogCategories: ['vuelo'],
    englishTerms: ['butterflies flight', 'swallows birds', 'wings wind'],
    exactWords: [
      'mariposa', 'mariposas', 'ala', 'alas', 'volar', 'vuelo', 'vuela', 'pajaro', 'pajaros', 'ave', 'aves',
      'golondrina', 'golondrinas', 'gaviota', 'pluma', 'plumas', 'aire', 'viento', 'vientos', 'brisa',
      'libre', 'libertad', 'elevar', 'flotar', 'caer', 'cayendo', 'danza', 'bailar', 'respirar', 'respiro',
      'suspiro', 'suspira', 'suspirar', 'soplar'
    ],
    stems: ['maripos', 'golondrin', 'voland', 'suspir', 'respir']
  },
  {
    id: 'melancolia',
    label: 'Melancolía & Lluvia',
    catalogCategories: ['melancolia'],
    englishTerms: ['rain streetlamp', 'weeping angel', 'melancholy shadow'],
    exactWords: [
      'lluvia', 'lluvias', 'llover', 'llueve', 'lagrima', 'lagrimas', 'llorar', 'lloro', 'llanto',
      'sombra', 'sombras', 'olvido', 'olvidar', 'apago', 'apagar', 'frio', 'fria', 'helado', 'triste',
      'tristeza', 'dolor', 'duelo', 'herida', 'herido', 'roto', 'rota', 'vencido', 'vencida', 'juzgado',
      'soledad', 'sola', 'solo', 'ausencia', 'ausente', 'gris', 'niebla', 'ceniza', 'invierno', 'perdida',
      'nostalgia', 'miedo', 'miedos', 'falta', 'faltas', 'error', 'errores', 'panuelo', 'seque', 'muero', 'morir'
    ],
    stems: ['lagrim', 'olvid', 'melanc', 'tristez', 'soledad', 'inviern']
  },
  {
    id: 'sacro',
    label: 'Sacro, Corazón & Fe',
    catalogCategories: ['sacro'],
    englishTerms: ['sacred heart', 'radiant flame', 'mystic candle'],
    exactWords: [
      'corazon', 'corazones', 'dios', 'alma', 'almas', 'promesa', 'promesas', 'prometo', 'prometer',
      'fe', 'sagrado', 'sagrada', 'santo', 'rezar', 'oracion', 'altar', 'milagro', 'bendicion',
      'llama', 'fuego', 'vela', 'arder', 'arde', 'espiritu', 'divino', 'divina', 'templo', 'redencion',
      'perdon', 'perdona', 'perdonar', 'ofrenda', 'consuele', 'consuelo', 'gracias', 'suerte', 'afortunado',
      'afortunados', 'verdad', 'pureza'
    ],
    stems: ['corazon', 'promet', 'perdon', 'agradec', 'afortunad', 'consuel']
  },
  {
    id: 'angel_sueno',
    label: 'Ángeles, Cupido & Sueño',
    catalogCategories: ['melancolia', 'amor', 'cosmos'],
    englishTerms: ['cherub cupid', 'winged angel', 'dreaming sleep'],
    exactWords: [
      'angel', 'angeles', 'querubin', 'cupido', 'flecha', 'flechas', 'arco', 'sueno', 'suenos',
      'ensueno', 'sonar', 'suena', 'despertar', 'despierte', 'despierto', 'dormir', 'duerme', 'cuidaba',
      'mito', 'musa', 'olimpo', 'diosa', 'destino', 'hechizo', 'magia', 'alado', 'alada', 'velar'
    ],
    stems: ['despert', 'ensuen', 'querub']
  },
  {
    id: 'tiempo',
    label: 'Tiempo & Memoria',
    catalogCategories: ['tiempo'],
    englishTerms: ['antique hourglass', 'pocket watch', 'autumn leaves'],
    exactWords: [
      'tiempo', 'tiempos', 'reloj', 'ayer', 'memoria', 'memorias', 'recuerdo', 'recuerdos', 'recordar',
      'recordaras', 'acordaras', 'acordar', 'manana', 'eterno', 'eterna', 'eternidad', 'siempre', 'nunca',
      'jamas', 'siglo', 'siglos', 'instante', 'segundo', 'segundos', 'minuto', 'minutos', 'hora', 'horas',
      'pasado', 'futuro', 'edad', 'otono', 'arena', 'efimero', 'huella', 'huellas', 'sendero', 'senderos',
      'camino', 'caminar', 'vida', 'vidas', 'vivir', 'vivimos', 'dia', 'dias', 'suficiente', 'volver', 'volvere'
    ],
    stems: ['recuerd', 'record', 'acordar', 'memor', 'etern', 'sender']
  },
  {
    id: 'mar',
    label: 'Mar, Faro & Travesía',
    catalogCategories: ['mar'],
    englishTerms: ['lighthouse sea', 'sailing boat waves', 'ocean shore'],
    exactWords: [
      'mar', 'mares', 'oceano', 'ola', 'olas', 'barco', 'barcos', 'navio', 'velero', 'puerto', 'puertos',
      'faro', 'costa', 'orilla', 'playa', 'espuma', 'marea', 'naufragio', 'naufrago', 'navegar', 'profundo',
      'abismo', 'agua', 'aguas', 'rio', 'rios', 'corriente', 'horizonte', 'isla', 'ancla', 'tormenta', 'viaje'
    ],
    stems: ['naveg', 'naufrag', 'torment', 'horizont']
  },
  {
    id: 'silencio_luz',
    label: 'Silencio, Ventana, Luz & Voz',
    catalogCategories: ['ornamento', 'melancolia', 'vuelo', 'sacro'],
    englishTerms: ['open window curtains', 'quill ink', 'classical lyre music'],
    exactWords: [
      'silencio', 'callar', 'ventana', 'ventanas', 'puerta', 'umbral', 'luz', 'luces', 'claridad',
      'cancion', 'canciones', 'musica', 'melodia', 'nota', 'notas', 'lira', 'voz', 'voces', 'palabra',
      'palabras', 'verso', 'versos', 'poema', 'poemas', 'escribir', 'tinta', 'papel', 'carta', 'libro',
      'pagina', 'nombre', 'ruido', 'habitacion', 'casa', 'farol', 'calle', 'rincon', 'ojos', 'ojo',
      'mirada', 'ver', 'veo', 'percibir', 'detalle', 'belleza', 'llave', 'secreto', 'columna'
    ],
    stems: ['silenci', 'ventan', 'cancion', 'melodi', 'escrib', 'mirad']
  }
];

/**
 * Specific keyword-to-illustration boosts for fine-grained editorial precision.
 */
const DIRECT_ILLUSTRATION_RULES = [
  { id: 'butterfliesTop', terms: ['mariposa', 'mariposas', 'alas', 'suspiro', 'suspira'] },
  { id: 'fallingCouple', terms: ['mundo', 'buscar', 'volvere', 'entregartelo', 'ramo'] },
  { id: 'klimtKiss', terms: ['beso', 'besos', 'piel', 'abrazo', 'abrazar', 'cuerpo', 'ser'] },
  { id: 'baroqueCorner', terms: ['barroco', 'clasico', 'ensueno', 'embriaguen', 'antiguo'] },
  { id: 'weepingAngel', terms: ['angel', 'angeles', 'lagrima', 'lagrimas', 'panuelo', 'consuele', 'llorar'] },
  { id: 'boyReachingStar', terms: ['estrella', 'universo', 'belleza', 'cuidado', 'afortunado'] },
  { id: 'cupidTopRight', terms: ['cupido', 'flecha', 'flechas', 'querubin', 'herida', 'enamorado'] },
  { id: 'sacredHeart', terms: ['corazon', 'dios', 'prometo', 'promesa', 'fe', 'latir', 'perdona'] },
  { id: 'botanicalFlowers', terms: ['flores', 'flor', 'jardin', 'primavera', 'florecer'] },
  { id: 'quillInk', terms: ['verso', 'versos', 'poema', 'tinta', 'pluma', 'escribir', 'carta', 'nombre'] },
  { id: 'crescentMoon', terms: ['luna', 'noche', 'noches', 'sueno', 'dormir', 'medianoche'] },
  { id: 'hourglassStars', terms: ['tiempo', 'suficiente', 'vivimos', 'arena', 'instante', 'eterno'] },
  { id: 'intertwinedHands', terms: ['manos', 'mano', 'quedarme', 'quedarse', 'lado', 'cuidar', 'abrazar'] },
  { id: 'birdsInFlight', terms: ['golondrina', 'pajaros', 'aves', 'volar', 'vuelo', 'migrar', 'aire'] },
  { id: 'streetlampRain', terms: ['lluvia', 'farol', 'calle', 'sola', 'solo', 'frio', 'rincon'] },
  { id: 'wildRose', terms: ['rosa', 'rosas', 'espina', 'espinas', 'petalo', 'perfume'] },
  { id: 'constellationMap', terms: ['constelacion', 'universo', 'cosmos', 'mapa', 'destino', 'estrellas'] },
  { id: 'openWindow', terms: ['ventana', 'aire', 'viento', 'despierte', 'despertar', 'manana', 'habitacion'] },
  { id: 'paperBoat', terms: ['barco', 'papel', 'ola', 'olas', 'rio', 'corriente', 'navegar'] },
  { id: 'astralEye', terms: ['ojos', 'ojo', 'mirada', 'ver', 'veo', 'percibir', 'detalle'] },
  { id: 'lighthouseSea', terms: ['faro', 'mar', 'puerto', 'tormenta', 'costa', 'orilla', 'horizonte'] },
  { id: 'autumnLeaves', terms: ['otono', 'hojas', 'hoja', 'sendero', 'senderos', 'memorias', 'ayer'] },
  { id: 'keyLocket', terms: ['secreto', 'llave', 'tesoro', 'guardar', 'recuerdo', 'pecho'] },
  { id: 'umbrellaCouple', terms: ['lluvia', 'amabamos', 'juntos', 'caminar', 'cuidaba', 'abrigo'] },
  { id: 'greekColumnIvy', terms: ['columna', 'templo', 'hiedra', 'piedra', 'historia', 'eterno'] },
  { id: 'mothCandle', terms: ['apago', 'vela', 'llama', 'fuego', 'arder', 'oscuridad', 'calido'] },
  { id: 'pocketWatch', terms: ['reloj', 'horas', 'hora', 'minutos', 'pasado', 'acordaras', 'recordaras'] },
  { id: 'mountainSun', terms: ['montana', 'cordillera', 'amanecer', 'alba', 'sol', 'caminar'] },
  { id: 'dandelionWind', terms: ['semilla', 'viento', 'brisa', 'deseo', 'soplar', 'respirar'] },
  { id: 'musicNotes', terms: ['cancion', 'musica', 'voz', 'melodia', 'lira', 'cantar', 'ruido'] },
  { id: 'eclipseSun', terms: ['eclipse', 'unica', 'unico', 'brillante', 'sol', 'sombra'] },
  { id: 'lotusBloom', terms: ['loto', 'paz', 'calma', 'alma', 'agua', 'silencio'] }
];

/**
 * Preferred aspect types per editorial layout so illustrations harmonize with the frame.
 */
const LAYOUT_ASPECT_COMPATIBILITY = {
  cover: ['square', 'vertical'],
  dedication: ['horizontal', 'square'],
  butterflies: ['vertical', 'square', 'horizontal'],
  klimt: ['vertical'],
  baroque: ['square', 'corner', 'vertical'],
  starboy: ['vertical', 'square'],
  cupid: ['horizontal', 'square'],
  sacredheart: ['vertical', 'square'],
  diptych_poem: ['horizontal', 'square'],
  backcover: ['horizontal', 'square']
};

/**
 * Splits a long poem cleanly into multiple pages, prioritizing stanza boundaries (\n\n)
 * and falling back to balanced line chunks only if a single stanza exceeds maxLinesPerPage.
 */
export function splitPoemIntoPages(poemTextOrPayload, maxLinesPerPage = 18) {
  let rawPoemText = poemTextOrPayload;
  let requestedMax = maxLinesPerPage;
  if (poemTextOrPayload && typeof poemTextOrPayload === 'object' && !Array.isArray(poemTextOrPayload)) {
    rawPoemText = poemTextOrPayload.text ?? poemTextOrPayload.poemText ?? '';
    requestedMax = poemTextOrPayload.maxLinesPerPage ?? maxLinesPerPage;
  }
  const safeMaxLines = Math.max(4, Math.floor(Number(requestedMax) || 18));
  const cleaned = String(rawPoemText || '').replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [''];

  const rawStanzas = cleaned
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Expand any oversized stanza into sub-blocks <= safeMaxLines
  const blocks = [];
  for (const stanza of rawStanzas) {
    const stanzaLines = stanza.split('\n');
    if (stanzaLines.length <= safeMaxLines) {
      blocks.push(stanzaLines);
    } else {
      for (let i = 0; i < stanzaLines.length; i += safeMaxLines) {
        blocks.push(stanzaLines.slice(i, i + safeMaxLines));
      }
    }
  }

  const pages = [];
  let currentLines = [];

  for (const blockLines of blocks) {
    const separatorLines = currentLines.length > 0 ? 1 : 0;
    if (currentLines.length > 0 && currentLines.length + separatorLines + blockLines.length > safeMaxLines) {
      pages.push(currentLines.join('\n').trim());
      currentLines = [...blockLines];
    } else {
      if (currentLines.length > 0) {
        currentLines.push('');
      }
      currentLines.push(...blockLines);
    }
  }

  if (currentLines.length > 0) {
    pages.push(currentLines.join('\n').trim());
  }

  return pages.length > 0 ? pages : [cleaned];
}

/**
 * Computes structural verse metrics for a poem.
 */
function computePoemMetrics(poemText) {
  const cleaned = String(poemText || '').replace(/\r\n/g, '\n').trim();
  if (!cleaned) {
    return {
      lineCount: 0,
      nonEmptyLineCount: 0,
      stanzaCount: 0,
      wordCount: 0,
      maxLineChars: 0,
      avgLineChars: 0
    };
  }

  const lines = cleaned.split('\n');
  const nonEmptyLines = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  const stanzas = cleaned.split(/\n\s*\n+/).filter((s) => s.trim().length > 0);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const maxLineChars = nonEmptyLines.reduce((max, l) => Math.max(max, l.length), 0);
  const totalChars = nonEmptyLines.reduce((sum, l) => sum + l.length, 0);
  const avgLineChars = nonEmptyLines.length > 0 ? Math.round(totalChars / nonEmptyLines.length) : 0;

  return {
    lineCount: lines.length,
    nonEmptyLineCount: nonEmptyLines.length,
    stanzaCount: stanzas.length,
    wordCount: words.length,
    maxLineChars,
    avgLineChars
  };
}

/**
 * Chooses the ideal editorial layout and font according to dominant poetic themes AND verse geometry.
 */
function recommendLayoutForPoem(metrics, rankedThemes) {
  const topTheme = rankedThemes[0]?.id || 'amor';
  const secondTheme = rankedThemes[1]?.id || null;
  const themeIds = new Set(rankedThemes.slice(0, 3).map((t) => t.id));

  const isVeryLong =
    metrics.nonEmptyLineCount >= 23 ||
    metrics.lineCount >= 27 ||
    (metrics.nonEmptyLineCount >= 16 && metrics.avgLineChars >= 42);
  const isLongOrWide =
    metrics.nonEmptyLineCount >= 18 ||
    metrics.avgLineChars >= 37 ||
    metrics.maxLineChars >= 52;
  const isShortNarrowVerses =
    metrics.avgLineChars > 0 &&
    metrics.avgLineChars <= 27 &&
    metrics.maxLineChars <= 42;

  if (isVeryLong) {
    return {
      layoutId: 'diptych_poem',
      font: 'font-serif-classic',
      reason: 'Poema extenso de varias estrofas: la página literaria limpia maximiza la caja de lectura sin apretar márgenes.'
    };
  }

  if (isLongOrWide && (topTheme === 'amor' || topTheme === 'angel_sueno' || topTheme === 'tiempo')) {
    return {
      layoutId: 'cupid',
      font: 'font-serif-italic',
      reason: 'Estrofas amplias con tono afectivo: la viñeta flotante superior derecha libera todo el ancho inferior para tus versos.'
    };
  }

  if (topTheme === 'cosmos' || (secondTheme === 'cosmos' && isShortNarrowVerses)) {
    return {
      layoutId: 'starboy',
      font: 'font-sans-clean',
      reason: 'Imaginario celeste/nocturno con versos esbeltos: la columna vertical derecha equilibra el aire poético.'
    };
  }

  if (topTheme === 'melancolia' || (topTheme === 'angel_sueno' && themeIds.has('melancolia'))) {
    return {
      layoutId: 'baroque',
      font: 'font-serif-classic',
      reason: 'Tono nocturno, nostálgico o solemne: el esquinero barroco y el grabado al pie enmarcan la emoción con peso clásico.'
    };
  }

  if (topTheme === 'sacro' || topTheme === 'botanica') {
    return {
      layoutId: 'sacredheart',
      font: 'font-serif-italic',
      reason: 'Simbolismo del corazón, promesa o botánica: doble acento diagonal con emblema superior e ilustración al pie.'
    };
  }

  if (topTheme === 'amor' && isShortNarrowVerses) {
    return {
      layoutId: 'klimt',
      font: 'font-serif-italic',
      reason: 'Versos breves e íntimos de amor: el marco vertical lateral estilo Klimt acompaña el ritmo confesional.'
    };
  }

  if (topTheme === 'vuelo' || topTheme === 'tiempo' || topTheme === 'mar') {
    return {
      layoutId: 'butterflies',
      font: 'font-serif-italic',
      reason: 'Movimiento de vuelo, memoria o travesía: apertura aérea arriba y escena narrativa cerrando la página.'
    };
  }

  if (isLongOrWide) {
    return {
      layoutId: 'cupid',
      font: 'font-serif-classic',
      reason: 'Versos de buen aliento: la viñeta superior derecha deja amplio respiro tipográfico.'
    };
  }

  return {
    layoutId: 'butterflies',
    font: 'font-serif-italic',
    reason: 'Equilibrio editorial clásico entre aire blanco, ornamento superior y grabado principal al pie.'
  };
}

/**
 * Analyzes Spanish poem text and returns metrics, thematic profile, layout recommendation,
 * exact 300-DPI slot geometry, page overflow guidance, top 6 SVG illustrations, and online query.
 */
export function analyzePoemAndSuggest(poemTextInput, optionsInput = {}) {
  let poemText = poemTextInput;
  let resolvedOptions = optionsInput || {};
  if (poemTextInput && typeof poemTextInput === 'object' && !Array.isArray(poemTextInput)) {
    poemText = poemTextInput.text ?? poemTextInput.poemText ?? '';
    resolvedOptions = { ...poemTextInput, ...(optionsInput || {}) };
  }

  const {
    paperId = 'A4',
    formatId = 'saddle_half',
    customWidthMm = 100,
    customHeightMm = 140,
    currentLayoutId = null,
    layoutId = null,
    fontSize = null
  } = resolvedOptions;

  const metrics = computePoemMetrics(poemText);

  // Map normalized token -> original surface word from the poem for expressive explanations
  const rawWords = String(poemText || '')
    .replace(/\r\n/g, '\n')
    .split(/[\s,.;:!?¿¡()"'«»—–-]+/)
    .filter((w) => w.length >= 2);

  const normalizedToOriginal = new Map();
  for (const rawWord of rawWords) {
    const norm = normalizeSpanishText(rawWord).replace(/[^a-z0-9]/g, '');
    if (norm.length >= 2 && !normalizedToOriginal.has(norm)) {
      normalizedToOriginal.set(norm, rawWord.toLowerCase());
    }
  }

  const normalizedFull = normalizeSpanishText(poemText);
  const tokens = tokenizeNormalized(normalizedFull);

  // Evaluate each thematic axis
  const themeResults = POETIC_LEXICON.map((theme) => {
    const exactSet = new Set(theme.exactWords);
    let score = 0;
    const matchedWords = [];
    const seenNorm = new Set();

    for (const token of tokens) {
      let matched = false;
      if (exactSet.has(token)) {
        score += 3;
        matched = true;
      } else if (token.length >= 4 && theme.stems.some((stem) => token.startsWith(stem))) {
        score += 2;
        matched = true;
      }
      if (matched && !seenNorm.has(token)) {
        seenNorm.add(token);
        matchedWords.push(normalizedToOriginal.get(token) || token);
      }
    }

    return {
      id: theme.id,
      label: theme.label,
      catalogCategories: theme.catalogCategories,
      englishTerms: theme.englishTerms,
      score,
      matchedWords
    };
  });

  const rankedThemes = [...themeResults]
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score);

  const layoutRec = recommendLayoutForPoem(metrics, rankedThemes);
  const recommendedLayoutId = layoutRec.layoutId;
  const recommendedLayoutReason = layoutRec.reason;

  const requestedLayout = currentLayoutId || layoutId;
  const effectiveLayoutId = requestedLayout && PAGE_LAYOUTS[requestedLayout]
    ? requestedLayout
    : recommendedLayoutId;

  // Baseline slot specs for the format to get its natural recommendedFontSize
  const baseFormatSpecs = getRecommendedSlotSpecs({
    paperId,
    formatId,
    customWidthMm,
    customHeightMm,
    layoutId: effectiveLayoutId
  });

  const recommendedFontSize = fontSize || baseFormatSpecs.recommendedFontSize;

  const slotSpecs = getRecommendedSlotSpecs({
    paperId,
    formatId,
    customWidthMm,
    customHeightMm,
    layoutId: effectiveLayoutId,
    fontSize: recommendedFontSize
  });

  // Overflow detection & smart editorial remedy ('shrink_font' vs 'split_two_pages')
  const exceedsLines = metrics.lineCount > slotSpecs.maxLines;
  const exceedsChars = metrics.maxLineChars > slotSpecs.maxCharsPerLine;
  const hasOverflow = exceedsLines || exceedsChars;

  let overflow = {
    isOverflowing: false,
    hasOverflow: false,
    exceedsLines: false,
    exceedsChars: false,
    action: 'none',
    suggestedFontSize: recommendedFontSize,
    message: 'El poema entra cómodamente en los márgenes de esta plantilla.',
    splitPages: []
  };

  if (hasOverflow) {
    const currentPt = parseFloat(recommendedFontSize) || 12.5;
    const smallerCandidates = [...FONT_SIZES]
      .filter((f) => f.pt < currentPt)
      .sort((a, b) => b.pt - a.pt); // try 11pt first, then 9.5pt

    let fittingFont = null;
    for (const candidate of smallerCandidates) {
      const candidateSpecs = getRecommendedSlotSpecs({
        paperId,
        formatId,
        customWidthMm,
        customHeightMm,
        layoutId: effectiveLayoutId,
        fontSize: candidate.id
      });
      if (
        metrics.lineCount <= candidateSpecs.maxLines &&
        metrics.maxLineChars <= candidateSpecs.maxCharsPerLine
      ) {
        fittingFont = candidate;
        break;
      }
    }

    const splitPages = splitPoemIntoPages(poemText, slotSpecs.maxLines);

    if (fittingFont) {
      overflow = {
        isOverflowing: true,
        hasOverflow: true,
        exceedsLines,
        exceedsChars,
        action: 'shrink_font',
        suggestedFontSize: fittingFont.id,
        message: `El poema supera las ${slotSpecs.maxLines} líneas / ${slotSpecs.maxCharsPerLine} caracteres a ${recommendedFontSize}, pero entra entero bajando la tipografía a ${fittingFont.id}.`,
        splitPages
      };
    } else {
      overflow = {
        isOverflowing: true,
        hasOverflow: true,
        exceedsLines,
        exceedsChars,
        action: 'split_two_pages',
        suggestedFontSize: '9.5pt',
        message: `El poema tiene ${metrics.lineCount} líneas (máx. ${slotSpecs.maxLines} en este formato). Conviene dividirlo en ${splitPages.length} páginas enfrentadas respetando sus estrofas.`,
        splitPages
      };
    }
  }

  // Score all 32 illustrations in the catalog
  const categoryScoreMap = new Map();
  for (const theme of rankedThemes) {
    for (const cat of theme.catalogCategories) {
      categoryScoreMap.set(cat, (categoryScoreMap.get(cat) || 0) + theme.score);
    }
  }

  const directBoostMap = new Map();
  for (const rule of DIRECT_ILLUSTRATION_RULES) {
    const hits = [];
    for (const term of rule.terms) {
      const normTerm = normalizeSpanishText(term);
      if (normalizedToOriginal.has(normTerm)) {
        hits.push(normalizedToOriginal.get(normTerm));
      } else if (normTerm.length >= 4 && tokens.some((t) => t.startsWith(normTerm.slice(0, -1)))) {
        const matchTok = tokens.find((t) => t.startsWith(normTerm.slice(0, -1)));
        hits.push(normalizedToOriginal.get(matchTok) || term);
      }
    }
    if (hits.length > 0) {
      directBoostMap.set(rule.id, hits);
    }
  }

  const preferredAspects = LAYOUT_ASPECT_COMPATIBILITY[effectiveLayoutId] || ['vertical', 'square'];
  const defaultLayoutIllusId = PAGE_LAYOUTS[effectiveLayoutId]?.primaryDefaultId || null;

  const scoredIllustrations = ILLUSTRATIONS_CATALOG.map((item) => {
    let score = 0;
    const matchedWords = [];
    const seenWords = new Set();

    const addMatchedWord = (w) => {
      if (w && !seenWords.has(w)) {
        seenWords.add(w);
        matchedWords.push(w);
      }
    };

    // 1. Direct keyword overlap on item.keywords & item.emotions
    for (const kw of [...item.keywords, ...item.emotions]) {
      const normKw = normalizeSpanishText(kw);
      if (normalizedToOriginal.has(normKw)) {
        score += 6;
        addMatchedWord(normalizedToOriginal.get(normKw));
      } else if (normKw.length >= 5) {
        const stem = normKw.slice(0, 5);
        const tok = tokens.find((t) => t.startsWith(stem));
        if (tok) {
          score += 4;
          addMatchedWord(normalizedToOriginal.get(tok) || kw);
        }
      }
    }

    // 2. Direct poetic rule boosts
    const ruleHits = directBoostMap.get(item.id) || [];
    if (ruleHits.length > 0) {
      score += ruleHits.length * 5;
      ruleHits.forEach(addMatchedWord);
    }

    // 3. Thematic category resonance
    const catScore = categoryScoreMap.get(item.category) || 0;
    score += Math.min(12, catScore * 1.5);

    // 4. Aspect-type compatibility bonus with the target layout
    const aspectRank = preferredAspects.indexOf(item.aspectType);
    const aspectCompatible = aspectRank !== -1;
    if (aspectRank === 0) {
      score += 4.5;
    } else if (aspectRank === 1) {
      score += 2.5;
    } else if (aspectRank === 2) {
      score += 1.2;
    }

    // 5. Gentle tie-breaker if this illustration is the layout's signature engraving
    if (item.id === defaultLayoutIllusId) {
      score += 1.5;
    }

    // Build warm editorial reason in Spanish
    let reason;
    if (matchedWords.length > 0) {
      const quoted = matchedWords.slice(0, 3).map((w) => `«${w}»`).join(', ');
      reason = aspectCompatible
        ? `Resuena con ${quoted} · encuadre ${item.aspectType} ideal para esta plantilla`
        : `Resuena con ${quoted} en tus versos`;
    } else if (catScore > 0) {
      const matchingTheme = rankedThemes.find((t) => t.catalogCategories.includes(item.category));
      const themeWords = matchingTheme?.matchedWords?.slice(0, 2).map((w) => `«${w}»`).join(', ');
      reason = themeWords
        ? `Afinidad temática (${matchingTheme.label}) por ${themeWords}`
        : `Afinidad con el clima de ${matchingTheme?.label || item.category}`;
    } else {
      reason = `Grabado curado compatible con el encuadre de ${PAGE_LAYOUTS[effectiveLayoutId]?.name || 'la página'}`;
    }

    return {
      ...item,
      score: Number(score.toFixed(2)),
      matchedWords: matchedWords.slice(0, 4),
      aspectCompatible,
      reason
    };
  });

  scoredIllustrations.sort((a, b) => b.score - a.score);
  const suggestedIllustrations = scoredIllustrations.slice(0, 6);

  // Build clean bilingual/English search query for vintage engravings on Wikimedia Commons
  const topIllustration = suggestedIllustrations[0] || getIllustrationById('butterfliesTop');
  const englishPieces = [];
  for (const theme of rankedThemes.slice(0, 2)) {
    if (theme.englishTerms?.[0]) {
      englishPieces.push(theme.englishTerms[0]);
    }
  }
  if (englishPieces.length === 0 && topIllustration) {
    englishPieces.push(topIllustration.keywords.slice(0, 2).join(' '));
  }
  const onlineSearchQuery = `${englishPieces.join(' ')} vintage engraving illustration`.trim();

  return {
    metrics,
    dominantThemes: rankedThemes.slice(0, 4).map(({ id, label, score, matchedWords }) => ({
      id,
      label,
      score,
      matchedWords: matchedWords.slice(0, 5)
    })),
    recommendedLayoutId,
    recommendedLayoutReason,
    recommendedFont: layoutRec.font,
    recommendedFontSize,
    slotSpecs,
    overflow,
    splitPages: overflow.splitPages,
    suggestedIllustrations,
    onlineSearchQuery
  };
}

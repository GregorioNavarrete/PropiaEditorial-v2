/**
 * Curated Editorial Black & White Ink / Woodcut SVG Catalog (32 Illustrations).
 * Pure isomorphic ES Module — zero Node.js imports; compatible with Browser DOM and svg-to-pdfkit.
 * All SVGs use explicit xmlns, viewBox, width="100%", height="100%", and pure #000000 / #ffffff ink.
 */

export const ILLUSTRATION_CATEGORIES = [
  { id: 'amor', label: 'Amor & Vínculo' },
  { id: 'cosmos', label: 'Cosmos & Noche' },
  { id: 'botanica', label: 'Botánica & Flores' },
  { id: 'melancolia', label: 'Melancolía & Lluvia' },
  { id: 'vuelo', label: 'Vuelo & Libertad' },
  { id: 'sacro', label: 'Sacro & Alma' },
  { id: 'tiempo', label: 'Tiempo & Memoria' },
  { id: 'mar', label: 'Mar & Travesía' },
  { id: 'ornamento', label: 'Ornamentos & Pluma' },
  { id: 'minimalista', label: 'Minimalista (Un Solo Trazo)' }
];

export const ILLUSTRATIONS_CATALOG = [
  // =========================================================================
  // 10 GRABADOS BASE MEJORADOS (COLECCIÓN ORIGINAL REFINADA EN TINTA PURA)
  // =========================================================================
  {
    id: 'butterfliesTop',
    name: 'Mariposas en Vuelo de Tinta',
    category: 'vuelo',
    aspectType: 'horizontal',
    keywords: ['mariposa', 'mariposas', 'alas', 'volar', 'vuelo', 'aire', 'brisa', 'primavera', 'metamorfosis', 'suspiro'],
    emotions: ['ternura', 'nostalgia', 'libertad', 'ligereza'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 130" width="100%" height="100%" fill="none">
      <g transform="translate(18,8) rotate(-12)">
        <path d="M45,45 C20,5 0,15 5,40 C10,60 30,55 45,50 C25,60 15,85 30,90 C45,95 50,70 48,52 Z" fill="#000000"/>
        <path d="M47,45 C70,5 95,15 88,40 C83,60 65,55 49,50 C68,60 78,85 63,90 C48,95 45,70 47,52 Z" fill="#000000"/>
        <path d="M40,35 C25,20 12,25 15,38 C18,48 32,45 42,45 Z" fill="#ffffff"/>
        <path d="M54,35 C68,20 82,25 78,38 C75,48 62,45 52,45 Z" fill="#ffffff"/>
        <circle cx="24" cy="72" r="5.5" fill="#ffffff"/>
        <circle cx="69" cy="72" r="5.5" fill="#ffffff"/>
        <circle cx="18" cy="34" r="2" fill="#000000"/>
        <circle cx="75" cy="34" r="2" fill="#000000"/>
        <path d="M46,30 L46,86" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
        <path d="M46,32 Q38,14 29,11 M46,32 Q54,14 63,11" stroke="#000000" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </g>
      <g transform="translate(126,20) rotate(22) scale(0.76)">
        <path d="M45,45 C15,0 0,20 8,45 C14,62 35,55 45,50 C25,60 20,85 35,88 C45,90 48,68 46,52 Z" fill="#ffffff" stroke="#000000" stroke-width="2.4"/>
        <path d="M47,45 C78,0 92,20 84,45 C78,62 58,55 47,50 C68,60 72,85 58,88 C48,90 45,68 46,52 Z" fill="#ffffff" stroke="#000000" stroke-width="2.4"/>
        <path d="M45,45 L20,24 M45,48 L15,40 M45,54 L28,72 M47,45 L72,24 M47,48 L77,40 M47,54 L64,72" stroke="#000000" stroke-width="1.3"/>
        <path d="M46,28 L46,82" stroke="#000000" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M46,28 Q39,14 33,12 M46,28 Q53,14 59,12" stroke="#000000" stroke-width="1.4" fill="none"/>
      </g>
      <g transform="translate(68,62) rotate(8) scale(0.84)">
        <path d="M40,55 C10,10 5,50 40,62 C18,68 25,95 42,80 Z" fill="#000000"/>
        <path d="M35,45 C22,28 18,45 36,55 Z" fill="#ffffff"/>
        <circle cx="30" cy="74" r="3" fill="#ffffff"/>
        <path d="M41,40 L43,85" stroke="#000000" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M41,40 Q34,28 28,26" stroke="#000000" stroke-width="1.3" fill="none"/>
      </g>
      <path d="M18,108 Q55,96 92,110 M135,98 Q168,88 202,102" stroke="#000000" stroke-width="1" stroke-dasharray="3 4"/>
    </svg>`
  },
  {
    id: 'fallingCouple',
    name: 'Encuentro y Ramo en el Aire',
    category: 'amor',
    aspectType: 'vertical',
    keywords: ['pareja', 'amor', 'flores', 'ramo', 'caer', 'encuentro', 'buscar', 'entregar', 'destino', 'mundo'],
    emotions: ['romance', 'entrega', 'anhelo', 'vertigo'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="100%" height="100%" fill="none">
      <g transform="translate(15,10)">
        <path d="M55,15 L63,8 L70,22 L52,58 L35,90 L10,75 L5,82 L38,104 L65,68 Z" fill="#000000"/>
        <path d="M62,65 L95,88 L112,72 L82,48 Z" fill="#000000"/>
        <path d="M66,62 L96,83 M72,57 L102,78 M77,52 L107,73" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="105" cy="95" r="8.5" fill="#000000"/>
        <path d="M92,85 L98,125 L105,125 L100,85 Z" fill="#000000"/>
        <g transform="translate(90,121)">
          <path d="M5,10 L17,8 M9,13 L18,10" stroke="#000000" stroke-width="1.8"/>
          <circle cx="12" cy="8" r="3.2" fill="#000000"/>
          <circle cx="18" cy="4.5" r="3.6" fill="#000000"/>
          <circle cx="23" cy="10.5" r="3.2" fill="#000000"/>
          <circle cx="16" cy="14" r="3" fill="#000000"/>
          <circle cx="27" cy="6.5" r="2.6" fill="#000000"/>
          <circle cx="18" cy="4.5" r="1.1" fill="#ffffff"/>
          <circle cx="23" cy="10.5" r="1" fill="#ffffff"/>
        </g>
      </g>
      <g transform="translate(35,130)">
        <path d="M65,25 C85,25 100,65 112,88 L55,88 C45,65 52,38 65,25 Z" fill="#000000"/>
        <path d="M68,35 C78,48 88,68 95,85 M61,44 C68,58 75,72 80,85" stroke="#ffffff" stroke-width="1.7"/>
        <path d="M95,82 L88,42 L95,15" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="105" cy="68" r="7.5" fill="#000000"/>
        <path d="M55,78 L15,82 L10,74 M55,70 L28,55 L22,62" stroke="#000000" stroke-width="4" stroke-linecap="round"/>
      </g>
    </svg>`
  },
  {
    id: 'klimtKiss',
    name: 'El Abrazo (Grabado Klimt)',
    category: 'amor',
    aspectType: 'vertical',
    keywords: ['beso', 'abrazo', 'piel', 'amantes', 'manto', 'klimt', 'rostro', 'caricia', 'amor', 'eterno', 'ser'],
    emotions: ['pasion', 'intimidad', 'devocion', 'ternura'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 420" width="100%" height="100%" fill="none">
      <path d="M25,65 C25,20 175,20 185,95 L192,415 L12,415 L15,120 Z" fill="#ffffff" stroke="#000000" stroke-width="1.8"/>
      <path d="M55,48 C50,25 98,20 112,42 C120,54 108,75 92,72 C75,70 58,62 55,48 Z" fill="#000000"/>
      <circle cx="75" cy="36" r="2.5" fill="#ffffff"/>
      <circle cx="88" cy="34" r="2" fill="#ffffff"/>
      <circle cx="98" cy="42" r="2.5" fill="#ffffff"/>
      <circle cx="68" cy="46" r="2" fill="#ffffff"/>
      <path d="M90,70 C95,82 108,85 115,78" stroke="#000000" stroke-width="1.5"/>
      <path d="M105,72 C125,68 145,82 142,105 C139,122 118,125 104,112 C95,102 96,80 105,72 Z" fill="#ffffff" stroke="#000000" stroke-width="1.5"/>
      <path d="M118,86 Q124,92 130,88 M114,98 Q120,104 126,100 M108,96 L112,102" stroke="#000000" stroke-width="1.4"/>
      <path d="M72,95 C82,88 95,90 103,98 L98,115 C86,112 75,108 72,95 Z" fill="#ffffff" stroke="#000000" stroke-width="1.4"/>
      <path d="M135,108 C148,108 160,122 152,138 C142,145 118,142 102,128" fill="#ffffff" stroke="#000000" stroke-width="1.4"/>
      <rect x="24" y="125" width="16" height="42" fill="#000000"/>
      <rect x="46" y="135" width="12" height="30" fill="#ffffff" stroke="#000000" stroke-width="1.4"/>
      <rect x="64" y="128" width="18" height="48" fill="#000000"/>
      <rect x="30" y="180" width="14" height="55" fill="#ffffff" stroke="#000000" stroke-width="1.4"/>
      <rect x="50" y="190" width="20" height="38" fill="#000000"/>
      <rect x="26" y="250" width="18" height="45" fill="#000000"/>
      <rect x="52" y="242" width="14" height="60" fill="#ffffff" stroke="#000000" stroke-width="1.4"/>
      <rect x="34" y="310" width="15" height="50" fill="#000000"/>
      <rect x="56" y="320" width="18" height="40" fill="#000000"/>
      <rect x="28" y="370" width="20" height="32" fill="#ffffff" stroke="#000000" stroke-width="1.3"/>
      <g stroke="#000000" stroke-width="1.4">
        <circle cx="115" cy="165" r="14"/><circle cx="115" cy="165" r="7"/><circle cx="115" cy="165" r="2.5" fill="#000000"/>
        <circle cx="142" cy="182" r="12"/><circle cx="142" cy="182" r="6"/>
        <circle cx="108" cy="205" r="16"/><circle cx="108" cy="205" r="9"/><circle cx="108" cy="205" r="3" fill="#000000"/>
        <circle cx="138" cy="225" r="15"/><circle cx="138" cy="225" r="8"/>
        <circle cx="112" cy="255" r="18"/><circle cx="112" cy="255" r="10"/><circle cx="112" cy="255" r="4" fill="#000000"/>
        <circle cx="135" cy="285" r="14"/><circle cx="135" cy="285" r="7"/>
        <circle cx="110" cy="318" r="16"/><circle cx="110" cy="318" r="8"/><circle cx="110" cy="318" r="3" fill="#000000"/>
        <circle cx="130" cy="355" r="18"/><circle cx="130" cy="355" r="10"/>
        <circle cx="168" cy="155" r="11"/><circle cx="168" cy="155" r="5"/>
        <circle cx="172" cy="195" r="13"/><circle cx="172" cy="195" r="6"/>
        <circle cx="166" cy="240" r="12"/><circle cx="166" cy="240" r="5"/>
        <circle cx="174" cy="285" r="14"/><circle cx="174" cy="285" r="7"/>
        <circle cx="168" cy="335" r="13"/><circle cx="168" cy="335" r="6"/>
        <circle cx="172" cy="380" r="12"/><circle cx="172" cy="380" r="5"/>
      </g>
    </svg>`
  },
  {
    id: 'baroqueCorner',
    name: 'Esquinero Barroco de Tinta',
    category: 'ornamento',
    aspectType: 'corner',
    keywords: ['barroco', 'marco', 'esquina', 'arabesco', 'clasico', 'elegante', 'libro', 'antiguo', 'medallon'],
    emotions: ['solemnidad', 'clasicismo', 'belleza'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="100%" height="100%" fill="none" stroke="#000000">
      <path d="M8,8 L198,8 M8,8 L8,198" stroke-width="2.2" stroke-linecap="square"/>
      <path d="M14,14 L172,14 M14,14 L14,172" stroke-width="0.9"/>
      <path d="M14,14 C46,14 66,36 46,59 C30,73 15,56 25,39 C33,26 53,33 49,47" stroke-width="1.8"/>
      <path d="M56,14 C96,12 116,39 93,56 C76,69 63,46 77,33 C89,23 106,36 96,49" stroke-width="1.5"/>
      <path d="M14,56 C12,96 39,116 56,93 C69,76 46,63 33,77 C23,89 36,106 49,96" stroke-width="1.5"/>
      <path d="M112,14 C144,14 160,34 144,48 C130,60 120,40 132,30" stroke-width="1.3"/>
      <path d="M14,112 C14,144 34,160 48,144 C60,130 40,120 30,132" stroke-width="1.3"/>
      <circle cx="58" cy="58" r="22" stroke-width="1.7" fill="#ffffff"/>
      <circle cx="58" cy="58" r="15" stroke-width="1"/>
      <path d="M58,40 L62,54 L76,58 L62,62 L58,76 L54,62 L40,58 L54,54 Z" fill="#000000" stroke="none"/>
      <circle cx="168" cy="20" r="4" fill="#000000" stroke="none"/>
      <circle cx="181" cy="17" r="2.5" fill="#000000" stroke="none"/>
      <circle cx="20" cy="168" r="4" fill="#000000" stroke="none"/>
      <circle cx="17" cy="181" r="2.5" fill="#000000" stroke="none"/>
      <path d="M75,75 Q106,106 122,86 M75,75 Q106,106 86,122" stroke-width="1.4"/>
    </svg>`
  },
  {
    id: 'weepingAngel',
    name: 'Ángel Pensativo en Reposo',
    category: 'melancolia',
    aspectType: 'square',
    keywords: ['angel', 'alas', 'lagrima', 'lagrimas', 'llorar', 'consuelo', 'noche', 'alma', 'tristeza', 'soledad', 'ensueno'],
    emotions: ['melancolia', 'consuelo', 'recogimiento', 'paz'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.5">
      <path d="M85,65 C55,20 15,35 20,78 C24,112 52,135 75,148 C58,125 45,98 85,65 Z" fill="#ffffff" stroke-width="1.7"/>
      <path d="M30,58 Q50,65 72,82 M25,75 Q48,82 70,98 M32,95 Q52,102 72,115 M45,115 Q60,122 75,132" stroke-width="1.2"/>
      <path d="M115,65 C145,20 185,35 180,78 C176,112 148,135 125,148 C142,125 155,98 115,65 Z" fill="#ffffff" stroke-width="1.7"/>
      <path d="M170,58 Q150,65 128,82 M175,75 Q152,82 130,98 M168,95 Q148,102 128,115 M155,115 Q140,122 125,132" stroke-width="1.2"/>
      <ellipse cx="100" cy="48" rx="18" ry="4.5" stroke-width="1.2"/>
      <circle cx="100" cy="74" r="16" fill="#ffffff" stroke-width="1.6"/>
      <path d="M86,70 Q100,60 114,70 M88,76 Q100,68 112,76" stroke-width="1.3"/>
      <path d="M75,88 C65,102 78,118 102,116 C126,114 135,100 122,86" fill="#ffffff" stroke-width="1.6"/>
      <path d="M82,115 L95,172 L108,175 L96,115" fill="#ffffff" stroke-width="1.6"/>
      <path d="M118,115 L92,162 L82,158 L104,115" fill="#ffffff" stroke-width="1.6"/>
      <path d="M88,96 L112,96 M90,102 L108,102 M62,178 L138,178" stroke-width="1.1" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'boyReachingStar',
    name: 'Alcanzar una Estrella',
    category: 'cosmos',
    aspectType: 'vertical',
    keywords: ['estrella', 'universo', 'cielo', 'deseo', 'alcanzar', 'sueno', 'brillante', 'belleza', 'infinito', 'luz'],
    emotions: ['esperanza', 'asombro', 'gratitud', 'ilusion'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 340" width="100%" height="100%" fill="none">
      <g transform="translate(105,15)" stroke="#000000" stroke-width="3.4" stroke-linecap="round">
        <line x1="25" y1="2" x2="25" y2="48"/>
        <line x1="2" y1="25" x2="48" y2="25"/>
        <line x1="9" y1="9" x2="41" y2="41"/>
        <line x1="41" y1="9" x2="9" y2="41"/>
      </g>
      <circle cx="88" cy="26" r="2.2" fill="#000000"/>
      <circle cx="158" cy="68" r="2" fill="#000000"/>
      <g transform="translate(15,70)" fill="#000000">
        <circle cx="65" cy="65" r="19"/>
        <path d="M46,58 Q40,48 50,45 Q55,35 68,42 Q80,36 84,48 Q92,52 84,62 Z"/>
        <path d="M74,82 L115,24 L124,28 L88,92 Z"/>
        <circle cx="120" cy="24" r="5"/>
        <path d="M45,84 L88,84 L96,155 L38,155 Z"/>
        <path d="M46,86 L32,148 L40,152 L52,98 Z"/>
        <path d="M42,155 L92,155 L96,202 L70,202 L67,178 L63,202 L38,202 Z"/>
        <path d="M58,92 L54,135 M76,105 L82,145 M48,165 L46,192 M82,165 L84,192" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
        <rect x="45" y="200" width="11" height="42"/>
        <rect x="74" y="200" width="11" height="42"/>
        <ellipse cx="48" cy="245" rx="12" ry="7"/>
        <ellipse cx="80" cy="245" rx="12" ry="7"/>
      </g>
    </svg>`
  },
  {
    id: 'cupidTopRight',
    name: 'Cupido Herido de Flechas',
    category: 'amor',
    aspectType: 'horizontal',
    keywords: ['cupido', 'flecha', 'flechas', 'querubin', 'herida', 'enamorado', 'mito', 'deseo', 'pecho', 'amor'],
    emotions: ['vulnerabilidad', 'pasion', 'melancolia', 'entrega'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.6">
      <path d="M95,55 C115,15 155,10 165,35 C150,45 135,55 112,68 Z" fill="#ffffff"/>
      <path d="M105,65 C135,45 172,58 182,85 C155,88 130,82 108,78 Z" fill="#000000"/>
      <path d="M122,32 L148,25 M118,45 L152,38" stroke="#000000" stroke-width="1.3"/>
      <circle cx="72" cy="52" r="14" fill="#ffffff"/>
      <path d="M65,42 L35,20 L25,24 L55,50" fill="#ffffff"/>
      <path d="M62,62 C55,88 68,115 92,122 L128,155 L136,148 L105,112 C112,95 102,72 85,62 Z" fill="#ffffff"/>
      <path d="M105,105 L158,118 L165,108 L112,92" fill="#ffffff"/>
      <line x1="42" y1="88" x2="68" y2="75" stroke="#000000" stroke-width="1.8"/>
      <polygon points="42,88 48,82 50,89" fill="#000000" stroke="none"/>
      <line x1="48" y1="102" x2="74" y2="88" stroke="#000000" stroke-width="1.8"/>
      <polygon points="48,102 54,96 56,103" fill="#000000" stroke="none"/>
      <line x1="60" y1="115" x2="82" y2="98" stroke="#000000" stroke-width="1.8"/>
      <polygon points="60,115 66,109 68,116" fill="#000000" stroke="none"/>
    </svg>`
  },
  {
    id: 'sacredHeart',
    name: 'Corazón Sagrado Radiante',
    category: 'sacro',
    aspectType: 'vertical',
    keywords: ['corazon', 'sagrado', 'promesa', 'fe', 'dios', 'alma', 'fuego', 'latir', 'luz', 'perdon', 'milagro'],
    emotions: ['devocion', 'sinceridad', 'fuerza', 'redencion'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 200" width="100%" height="100%" fill="none" stroke="#000000">
      <line x1="90" y1="8" x2="90" y2="192" stroke-width="2"/>
      <line x1="12" y1="98" x2="168" y2="98" stroke-width="1.8"/>
      <line x1="35" y1="38" x2="145" y2="158" stroke-width="1.3" stroke-dasharray="6 3"/>
      <line x1="145" y1="38" x2="35" y2="158" stroke-width="1.3" stroke-dasharray="6 3"/>
      <line x1="65" y1="22" x2="115" y2="174" stroke-width="1"/>
      <line x1="115" y1="22" x2="65" y2="174" stroke-width="1"/>
      <line x1="22" y1="70" x2="158" y2="126" stroke-width="1"/>
      <line x1="158" y1="70" x2="22" y2="126" stroke-width="1"/>
      <circle cx="90" cy="98" r="27" fill="#ffffff" stroke="none"/>
      <path d="M90,64 C86,54 90,46 90,42 C94,48 96,55 90,64 Z" fill="#000000" stroke="none"/>
      <path d="M90,120 C90,120 65,103 65,85 C65,74 75,68 83,72 C87,74 90,79 90,79 C90,79 93,74 97,72 C105,68 115,74 115,85 C115,103 90,120 90,120 Z" fill="#ffffff" stroke="#000000" stroke-width="2"/>
      <path d="M90,114 C90,114 71,100 71,86 C71,78 78,74 84,77 C87,79 90,83 90,83 C90,83 93,79 96,77 C102,74 109,78 109,86 C109,100 90,114 90,114 Z" fill="#000000" stroke="none"/>
    </svg>`
  },
  {
    id: 'botanicalFlowers',
    name: 'Ramo Botánico a Pluma',
    category: 'botanica',
    aspectType: 'vertical',
    keywords: ['flores', 'flor', 'ramo', 'jardin', 'primavera', 'tallo', 'petalo', 'botanica', 'delicado', 'florecer'],
    emotions: ['ternura', 'calma', 'gratitud', 'frescura'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 240" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.4">
      <path d="M115,232 C110,180 85,120 55,65"/>
      <path d="M115,232 C118,175 115,110 120,35"/>
      <path d="M115,232 C125,185 148,140 162,95"/>
      <path d="M98,155 C75,135 45,125 25,115"/>
      <path d="M106,208 Q116,204 125,208" stroke-width="2.2"/>
      <g transform="translate(120,35)">
        <ellipse cx="0" cy="-8" rx="4" ry="8" fill="#ffffff"/>
        <ellipse cx="8" cy="0" rx="8" ry="4" fill="#ffffff"/>
        <ellipse cx="0" cy="8" rx="4" ry="8" fill="#ffffff"/>
        <ellipse cx="-8" cy="0" rx="8" ry="4" fill="#ffffff"/>
        <circle cx="0" cy="0" r="3" fill="#000000" stroke="none"/>
      </g>
      <g transform="translate(55,65) rotate(-20)">
        <ellipse cx="0" cy="-7" rx="3.5" ry="7" fill="#ffffff"/>
        <ellipse cx="7" cy="0" rx="7" ry="3.5" fill="#ffffff"/>
        <ellipse cx="0" cy="7" rx="3.5" ry="7" fill="#ffffff"/>
        <ellipse cx="-7" cy="0" rx="7" ry="3.5" fill="#ffffff"/>
        <circle cx="0" cy="0" r="2.5" fill="#000000" stroke="none"/>
      </g>
      <g transform="translate(25,115) rotate(-35)">
        <ellipse cx="0" cy="-7" rx="3.5" ry="7" fill="#ffffff"/>
        <ellipse cx="7" cy="0" rx="7" ry="3.5" fill="#ffffff"/>
        <ellipse cx="0" cy="7" rx="3.5" ry="7" fill="#ffffff"/>
        <ellipse cx="-7" cy="0" rx="7" ry="3.5" fill="#ffffff"/>
        <circle cx="0" cy="0" r="2.5" fill="#000000" stroke="none"/>
      </g>
      <g transform="translate(162,95) rotate(25)">
        <ellipse cx="0" cy="-7" rx="3.5" ry="7" fill="#ffffff"/>
        <ellipse cx="7" cy="0" rx="7" ry="3.5" fill="#ffffff"/>
        <ellipse cx="0" cy="7" rx="3.5" ry="7" fill="#ffffff"/>
        <ellipse cx="-7" cy="0" rx="7" ry="3.5" fill="#ffffff"/>
        <circle cx="0" cy="0" r="2.5" fill="#000000" stroke="none"/>
      </g>
      <g transform="translate(92,92) rotate(10)">
        <ellipse cx="0" cy="-6" rx="3" ry="6" fill="#ffffff"/>
        <ellipse cx="6" cy="0" rx="6" ry="3" fill="#ffffff"/>
        <ellipse cx="0" cy="6" rx="3" ry="6" fill="#ffffff"/>
        <ellipse cx="-6" cy="0" rx="6" ry="3" fill="#ffffff"/>
        <circle cx="0" cy="0" r="2" fill="#000000" stroke="none"/>
      </g>
      <path d="M85,125 Q75,115 82,108 Q90,115 85,125 Z" fill="#000000" stroke="none"/>
      <path d="M116,130 Q128,120 122,112 Q114,120 116,130 Z" fill="#000000" stroke="none"/>
      <path d="M105,175 Q92,165 98,158 Q106,165 105,175 Z" fill="#000000" stroke="none"/>
      <path d="M132,162 Q145,155 140,146 Q130,154 132,162 Z" fill="#000000" stroke="none"/>
    </svg>`
  },
  {
    id: 'quillInk',
    name: 'Pluma y Tintero Editorial',
    category: 'ornamento',
    aspectType: 'horizontal',
    keywords: ['pluma', 'tinta', 'escribir', 'carta', 'verso', 'poema', 'palabra', 'papel', 'libro', 'autor', 'voz'],
    emotions: ['confesion', 'oficio', 'intimidad', 'silencio'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.5">
      <path d="M22,132 L218,132" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M52,132 L58,98 L102,98 L108,132 Z" fill="#ffffff" stroke-width="1.8"/>
      <rect x="65" y="86" width="30" height="12" fill="#000000" stroke="none"/>
      <rect x="61" y="82" width="38" height="5" fill="#ffffff" stroke-width="1.5"/>
      <path d="M56,112 L104,112" stroke-width="1.2"/>
      <path d="M62,118 L98,118 L102,129 L58,129 Z" fill="#000000" stroke="none"/>
      <path d="M84,84 C102,52 145,22 204,14 C196,42 168,72 126,84 C112,88 96,86 84,84 Z" fill="#ffffff" stroke-width="1.7"/>
      <path d="M76,94 L202,15" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M122,58 L140,42 M142,46 L158,31 M162,34 L176,22 M135,72 L156,64 M156,58 L176,50" stroke-width="1.1"/>
      <path d="M126,124 Q152,116 178,125 T214,122" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`
  },

  // =========================================================================
  // 22 NUEVOS GRABADOS EDITORIALES EN BLANCO Y NEGRO (COLECCIÓN EXPANDIDA)
  // =========================================================================
  {
    id: 'crescentMoon',
    name: 'Luna Menguante entre Nubes',
    category: 'cosmos',
    aspectType: 'square',
    keywords: ['luna', 'noche', 'nubes', 'sueno', 'dormir', 'cielo', 'oscuridad', 'velar', 'medianoche', 'arrullo'],
    emotions: ['serenidad', 'misterio', 'nostalgia', 'ensueno'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="#000000">
      <path d="M118,28 C72,28 42,64 46,108 C50,150 86,176 128,168 C94,158 76,126 80,92 C84,58 104,38 128,32 C124,30 121,28 118,28 Z" fill="#000000" stroke="#000000" stroke-width="1.6"/>
      <path d="M62,74 L74,74 M56,86 L72,86 M55,98 L72,98 M58,110 L75,110 M64,122 L80,122 M72,134 L88,134" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M24,142 C24,130 36,124 46,128 C52,116 70,116 78,126 C88,122 100,128 102,138 L102,148 L24,148 Z" fill="#ffffff" stroke-width="1.6"/>
      <path d="M32,143 L94,143 M38,138 L82,138" stroke-width="1"/>
      <path d="M108,152 C108,142 118,136 128,140 C134,130 150,130 158,139 C168,136 178,142 178,152 L178,158 L108,158 Z" fill="#ffffff" stroke-width="1.6"/>
      <path d="M116,153 L170,153" stroke-width="1"/>
      <path d="M142,58 L145,66 L153,69 L145,72 L142,80 L139,72 L131,69 L139,66 Z" fill="#000000" stroke="none"/>
      <path d="M38,52 L40,57 L45,59 L40,61 L38,66 L36,61 L31,59 L36,57 Z" fill="#000000" stroke="none"/>
      <circle cx="164" cy="96" r="2.2" fill="#000000" stroke="none"/>
      <circle cx="122" cy="96" r="2" fill="#000000" stroke="none"/>
      <circle cx="152" cy="40" r="1.8" fill="#000000" stroke="none"/>
    </svg>`
  },
  {
    id: 'hourglassStars',
    name: 'Reloj de Arena Cósmico',
    category: 'tiempo',
    aspectType: 'vertical',
    keywords: ['tiempo', 'arena', 'reloj', 'horas', 'instante', 'efimero', 'eterno', 'espera', 'suficiente', 'vidas'],
    emotions: ['urgencia', 'eternidad', 'reflexion', 'anhelo'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 260" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.6">
      <rect x="34" y="24" width="112" height="10" fill="#000000"/>
      <rect x="28" y="18" width="124" height="6" fill="#ffffff"/>
      <rect x="34" y="226" width="112" height="10" fill="#000000"/>
      <rect x="28" y="236" width="124" height="6" fill="#ffffff"/>
      <line x1="42" y1="34" x2="42" y2="226" stroke-width="2"/>
      <line x1="138" y1="34" x2="138" y2="226" stroke-width="2"/>
      <path d="M52,34 C52,86 82,116 90,130 C98,116 128,86 128,34 Z" fill="#ffffff"/>
      <path d="M52,226 C52,174 82,144 90,130 C98,144 128,174 128,226 Z" fill="#ffffff"/>
      <path d="M64,82 C72,102 84,116 90,126 C96,116 108,102 116,82 Q90,88 64,82 Z" fill="#000000" stroke="none"/>
      <line x1="90" y1="130" x2="90" y2="196" stroke-width="1.5" stroke-dasharray="3 3"/>
      <path d="M56,226 C62,198 78,188 90,188 C102,188 118,198 124,226 Z" fill="#000000" stroke="none"/>
      <path d="M72,216 L108,216 M78,208 L102,208" stroke="#ffffff" stroke-width="1.1"/>
      <path d="M90,52 L92,58 L98,60 L92,62 L90,68 L88,62 L82,60 L88,58 Z" fill="#000000" stroke="none"/>
      <circle cx="74" cy="68" r="1.8" fill="#000000" stroke="none"/>
      <circle cx="106" cy="66" r="1.8" fill="#000000" stroke="none"/>
      <circle cx="20" cy="130" r="2.2" fill="#000000" stroke="none"/>
      <circle cx="160" cy="130" r="2.2" fill="#000000" stroke="none"/>
    </svg>`
  },
  {
    id: 'intertwinedHands',
    name: 'Manos Entrelazadas en Línea Fina',
    category: 'amor',
    aspectType: 'horizontal',
    keywords: ['manos', 'dedos', 'tacto', 'juntos', 'quedarse', 'quedarme', 'cuidado', 'promesa', 'union', 'piel', 'abrazo'],
    emotions: ['confianza', 'ternura', 'companerismo', 'refugio'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12,92 L68,78 C84,72 98,62 114,66 C126,69 132,78 124,84 C114,90 98,86 90,84" fill="#ffffff"/>
      <path d="M228,88 L172,74 C156,68 140,60 122,66 C108,71 104,82 114,88 C124,94 142,88 150,84" fill="#ffffff"/>
      <path d="M94,86 C94,96 108,100 120,96 C132,92 136,84 128,78" fill="#ffffff"/>
      <path d="M100,98 C102,107 116,110 128,105 C138,100 142,92 134,86" fill="#ffffff"/>
      <path d="M108,108 C112,116 124,118 134,112 C142,107 144,100 138,95" fill="#ffffff"/>
      <path d="M14,118 L76,106 C92,104 104,112 118,114"/>
      <path d="M226,114 L164,104 C148,102 138,110 126,114"/>
      <path d="M32,88 L32,110 M42,85 L42,108 M208,84 L208,106 M198,81 L198,104" stroke-width="1.1"/>
      <path d="M120,26 L123,35 L132,38 L123,41 L120,50 L117,41 L108,38 L117,35 Z" fill="#000000" stroke="none"/>
      <line x1="120" y1="14" x2="120" y2="21" stroke-width="1.2"/>
      <line x1="98" y1="26" x2="104" y2="31" stroke-width="1.2"/>
      <line x1="142" y1="26" x2="136" y2="31" stroke-width="1.2"/>
    </svg>`
  },
  {
    id: 'birdsInFlight',
    name: 'Bandada de Golondrinas',
    category: 'vuelo',
    aspectType: 'horizontal',
    keywords: ['golondrina', 'pajaros', 'aves', 'volar', 'migrar', 'cielo', 'libertad', 'horizonte', 'partir', 'regresar'],
    emotions: ['libertad', 'nostalgia', 'viaje', 'esperanza'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 140" width="100%" height="100%" fill="none">
      <g transform="translate(22,62) rotate(-14)">
        <path d="M32,26 C18,4 2,2 0,12 C12,16 20,24 26,32 L12,48 L24,40 L20,54 L34,36 C46,24 62,14 74,8 C58,6 44,12 32,26 Z" fill="#000000"/>
        <circle cx="34" cy="28" r="1.5" fill="#ffffff"/>
      </g>
      <g transform="translate(96,24) rotate(-8) scale(1.12)">
        <path d="M32,26 C18,4 2,2 0,12 C12,16 20,24 26,32 L12,48 L24,40 L20,54 L34,36 C46,24 62,14 74,8 C58,6 44,12 32,26 Z" fill="#000000"/>
        <path d="M26,24 L10,14 M40,22 L58,12" stroke="#ffffff" stroke-width="1.2"/>
      </g>
      <g transform="translate(168,54) rotate(6) scale(0.78)">
        <path d="M32,26 C18,4 2,2 0,12 C12,16 20,24 26,32 L12,48 L24,40 L20,54 L34,36 C46,24 62,14 74,8 C58,6 44,12 32,26 Z" fill="#000000"/>
      </g>
      <path d="M68,98 Q78,86 88,94 Q98,86 108,98" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
      <path d="M148,18 Q155,10 162,16 Q169,10 176,18" stroke="#000000" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M16,118 Q74,104 134,116 T226,108" stroke="#000000" stroke-width="1" stroke-dasharray="4 4"/>
    </svg>`
  },
  {
    id: 'streetlampRain',
    name: 'Farol Antiguo bajo la Lluvia',
    category: 'melancolia',
    aspectType: 'vertical',
    keywords: ['lluvia', 'farol', 'calle', 'noche', 'esquina', 'espera', 'frio', 'ciudad', 'sola', 'solo', 'invierno'],
    emotions: ['melancolia', 'soledad', 'nostalgia', 'abrigo'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 280" width="100%" height="100%" fill="none" stroke="#000000">
      <g stroke-width="1.1" stroke-linecap="round">
        <line x1="36" y1="18" x2="22" y2="56"/><line x1="64" y1="14" x2="50" y2="52"/>
        <line x1="138" y1="20" x2="124" y2="58"/><line x1="162" y1="36" x2="148" y2="74"/>
        <line x1="28" y1="96" x2="14" y2="134"/><line x1="52" y1="124" x2="38" y2="162"/>
        <line x1="144" y1="108" x2="130" y2="146"/><line x1="164" y1="142" x2="150" y2="180"/>
        <line x1="38" y1="186" x2="24" y2="224"/><line x1="134" y1="188" x2="120" y2="226"/>
      </g>
      <path d="M90,26 L98,38 L66,48 L114,48 L82,38 Z" fill="#000000"/>
      <polygon points="68,48 112,48 104,92 76,92" fill="#ffffff" stroke-width="1.8"/>
      <line x1="90" y1="48" x2="90" y2="92" stroke-width="1.3"/>
      <circle cx="90" cy="70" r="6" fill="#000000" stroke="none"/>
      <path d="M56,64 L46,60 M54,74 L42,76 M124,64 L134,60 M126,74 L138,76" stroke-width="1.3" stroke-linecap="round"/>
      <rect x="80" y="92" width="20" height="7" fill="#000000" stroke="none"/>
      <path d="M72,104 C78,96 102,96 108,104" stroke-width="1.6"/>
      <rect x="86" y="99" width="8" height="142" fill="#000000" stroke="none"/>
      <path d="M78,241 L102,241 L108,256 L72,256 Z" fill="#000000" stroke="none"/>
      <ellipse cx="90" cy="258" rx="54" ry="7" stroke-width="1.3"/>
      <ellipse cx="90" cy="258" rx="28" ry="3.5" stroke-width="1"/>
    </svg>`
  },
  {
    id: 'wildRose',
    name: 'Rosa Silvestre con Espinas',
    category: 'botanica',
    aspectType: 'vertical',
    keywords: ['rosa', 'espina', 'espinas', 'flor', 'amor', 'belleza', 'jardin', 'herida', 'perfume', 'petalo'],
    emotions: ['pasion', 'delicadeza', 'intensidad', 'romance'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 260" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.6">
      <path d="M92,98 C88,144 96,192 86,244" stroke-width="2.4" stroke-linecap="round"/>
      <polygon points="90,126 80,132 90,136" fill="#000000" stroke="none"/>
      <polygon points="92,162 103,167 92,172" fill="#000000" stroke="none"/>
      <polygon points="90,202 80,207 90,212" fill="#000000" stroke="none"/>
      <path d="M91,148 C68,144 46,128 42,108 C62,110 80,124 91,148 Z" fill="#ffffff"/>
      <path d="M46,112 L86,144 M58,122 L62,114 M70,131 L74,122" stroke-width="1.1"/>
      <path d="M92,182 C116,176 138,160 142,140 C122,142 104,156 92,182 Z" fill="#ffffff"/>
      <path d="M138,144 L96,178 M124,154 L120,146 M112,164 L108,155" stroke-width="1.1"/>
      <path d="M90,98 C62,98 46,76 54,52 C60,34 78,24 92,26 C110,24 126,36 130,54 C136,78 118,98 90,98 Z" fill="#ffffff"/>
      <path d="M66,52 C74,38 106,38 114,52 C120,66 104,80 90,80 C74,80 62,66 66,52 Z" fill="#ffffff"/>
      <path d="M78,56 C82,46 98,46 102,56 C104,64 96,70 90,70 C82,70 76,62 78,56 Z" fill="#000000"/>
      <path d="M84,56 C88,52 94,52 96,57" stroke="#ffffff" stroke-width="1.3"/>
      <path d="M74,96 L64,108 M106,96 L116,108 M90,98 L90,110" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: 'constellationMap',
    name: 'Carta Celeste y Astrolabio',
    category: 'cosmos',
    aspectType: 'square',
    keywords: ['constelacion', 'universo', 'mapa', 'cosmos', 'estrellas', 'destino', 'orbita', 'norte', 'astrolabio', 'mundo'],
    emotions: ['asombro', 'destino', 'inmensidad', 'busqueda'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="#000000">
      <circle cx="100" cy="100" r="82" stroke-width="1.8"/>
      <circle cx="100" cy="100" r="74" stroke-width="1" stroke-dasharray="4 3"/>
      <ellipse cx="100" cy="100" rx="74" ry="28" transform="rotate(-28 100 100)" stroke-width="1.2"/>
      <ellipse cx="100" cy="100" rx="74" ry="28" transform="rotate(32 100 100)" stroke-width="1"/>
      <line x1="100" y1="10" x2="100" y2="190" stroke-width="1"/>
      <line x1="10" y1="100" x2="190" y2="100" stroke-width="1"/>
      <polyline points="56,68 82,54 114,72 138,52 148,86" stroke-width="1.4"/>
      <polyline points="58,132 88,122 112,142 142,126" stroke-width="1.4"/>
      <circle cx="56" cy="68" r="3.5" fill="#000000"/><circle cx="82" cy="54" r="4" fill="#000000"/>
      <circle cx="114" cy="72" r="3.5" fill="#000000"/><circle cx="138" cy="52" r="4.5" fill="#000000"/>
      <circle cx="148" cy="86" r="3" fill="#000000"/><circle cx="58" cy="132" r="3.5" fill="#000000"/>
      <circle cx="88" cy="122" r="3" fill="#000000"/><circle cx="112" cy="142" r="4" fill="#000000"/>
      <circle cx="142" cy="126" r="3.5" fill="#000000"/>
      <path d="M100,82 L104,96 L118,100 L104,104 L100,118 L96,104 L82,100 L96,96 Z" fill="#000000" stroke="none"/>
      <circle cx="100" cy="100" r="3" fill="#ffffff" stroke="none"/>
    </svg>`
  },
  {
    id: 'openWindow',
    name: 'Ventana Abierta al Viento',
    category: 'melancolia',
    aspectType: 'vertical',
    keywords: ['ventana', 'aire', 'viento', 'cortina', 'habitacion', 'casa', 'mirar', 'manana', 'despertar', 'ausencia', 'silencio'],
    emotions: ['contemplacion', 'nostalgia', 'calma', 'espera'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 260" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.6">
      <path d="M36,220 L36,78 C36,42 62,24 95,24 C128,24 154,42 154,78 L154,220 Z" fill="#ffffff" stroke-width="2"/>
      <rect x="26" y="220" width="138" height="10" fill="#ffffff" stroke-width="1.8"/>
      <line x1="95" y1="24" x2="95" y2="220" stroke-width="1.5"/>
      <line x1="36" y1="118" x2="154" y2="118" stroke-width="1.5"/>
      <path d="M36,52 L68,66 L68,206 L36,220 Z" fill="#ffffff" stroke-width="1.6"/>
      <path d="M154,52 L122,66 L122,206 L154,220 Z" fill="#ffffff" stroke-width="1.6"/>
      <path d="M36,36 C56,74 52,134 18,196 C38,200 52,188 64,162" fill="#ffffff" stroke-width="1.5"/>
      <path d="M154,36 C136,76 144,138 176,192 C156,198 142,186 128,162" fill="#ffffff" stroke-width="1.5"/>
      <circle cx="110" cy="68" r="9" fill="#000000" stroke="none"/>
      <circle cx="114" cy="65" r="7" fill="#ffffff" stroke="none"/>
      <path d="M76,88 Q82,82 88,88 Q94,82 100,88" stroke-width="1.4"/>
      <path d="M74,154 Q104,144 134,158" stroke-width="1.1" stroke-dasharray="4 3"/>
    </svg>`
  },
  {
    id: 'paperBoat',
    name: 'Barco de Papel sobre Olas',
    category: 'mar',
    aspectType: 'horizontal',
    keywords: ['barco', 'papel', 'mar', 'ola', 'olas', 'viaje', 'navegar', 'infancia', 'corriente', 'agua', 'rio'],
    emotions: ['fragilidad', 'esperanza', 'inocencia', 'aventura'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.6" stroke-linejoin="round">
      <polygon points="120,24 88,84 152,84" fill="#ffffff"/>
      <line x1="120" y1="24" x2="120" y2="84" stroke-width="1.3"/>
      <polygon points="44,68 120,84 94,108" fill="#ffffff"/>
      <polygon points="196,68 120,84 146,108" fill="#ffffff"/>
      <polygon points="44,68 196,68 164,110 76,110" fill="#ffffff" stroke-width="1.8"/>
      <path d="M76,110 L120,84 L164,110 Z" fill="#000000"/>
      <path d="M92,105 L148,105" stroke="#ffffff" stroke-width="1.2"/>
      <path d="M16,114 C36,102 56,122 76,110 C96,98 116,120 136,110 C156,100 176,120 196,110 C210,104 220,112 228,114" stroke-width="2" stroke-linecap="round"/>
      <path d="M28,126 C48,116 68,134 88,124 C108,114 128,134 148,124 C168,114 188,134 212,124" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M54,136 C78,130 102,142 126,135 C150,128 174,140 196,134" stroke-width="1" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'astralEye',
    name: 'Ojo Poético y Destellos',
    category: 'sacro',
    aspectType: 'horizontal',
    keywords: ['ojos', 'ojo', 'mirada', 'ver', 'percibir', 'despertar', 'vision', 'alma', 'detalle', 'luz', 'verdad'],
    emotions: ['revelacion', 'asombro', 'intimidad', 'presencia'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150" width="100%" height="100%" fill="none" stroke="#000000">
      <line x1="120" y1="10" x2="120" y2="34" stroke-width="1.6"/>
      <line x1="120" y1="116" x2="120" y2="140" stroke-width="1.6"/>
      <line x1="72" y1="22" x2="84" y2="42" stroke-width="1.3"/>
      <line x1="168" y1="22" x2="156" y2="42" stroke-width="1.3"/>
      <line x1="38" y1="44" x2="56" y2="56" stroke-width="1.2"/>
      <line x1="202" y1="44" x2="184" y2="56" stroke-width="1.2"/>
      <line x1="72" y1="128" x2="84" y2="108" stroke-width="1.2"/>
      <line x1="168" y1="128" x2="156" y2="108" stroke-width="1.2"/>
      <path d="M28,75 C62,34 178,34 212,75 C178,116 62,116 28,75 Z" fill="#ffffff" stroke-width="2.2"/>
      <path d="M40,68 C72,38 168,38 200,68" stroke-width="1.1"/>
      <circle cx="120" cy="75" r="26" fill="#ffffff" stroke-width="1.8"/>
      <circle cx="120" cy="75" r="12" fill="#000000" stroke="none"/>
      <circle cx="114" cy="69" r="3.5" fill="#ffffff" stroke="none"/>
      <path d="M120,49 L120,58 M120,92 L120,101 M94,75 L103,75 M137,75 L146,75 M102,57 L108,63 M138,57 L132,63 M102,93 L108,87 M138,93 L132,87" stroke-width="1.1"/>
      <path d="M120,118 C115,126 115,132 120,136 C125,132 125,126 120,118 Z" fill="#000000" stroke="none"/>
    </svg>`
  },
  {
    id: 'lighthouseSea',
    name: 'Faro Nocturno en el Acantilado',
    category: 'mar',
    aspectType: 'vertical',
    keywords: ['faro', 'puerto', 'mar', 'tormenta', 'guia', 'luz', 'costa', 'acantilado', 'horizonte', 'naufragio', 'refugio'],
    emotions: ['esperanza', 'firmeza', 'soledad', 'guia'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 270" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.6">
      <polygon points="82,62 12,32 12,78" fill="#ffffff" stroke-width="1"/>
      <polygon points="108,62 178,32 178,78" fill="#ffffff" stroke-width="1"/>
      <line x1="22" y1="48" x2="74" y2="60" stroke-width="1" stroke-dasharray="4 3"/>
      <line x1="168" y1="48" x2="116" y2="60" stroke-width="1" stroke-dasharray="4 3"/>
      <path d="M80,46 Q95,30 110,46 Z" fill="#000000"/>
      <rect x="82" y="46" width="26" height="24" fill="#ffffff"/>
      <circle cx="95" cy="58" r="5" fill="#000000" stroke="none"/>
      <rect x="76" y="70" width="38" height="6" fill="#000000" stroke="none"/>
      <polygon points="82,76 108,76 118,192 72,192" fill="#ffffff" stroke-width="1.8"/>
      <polygon points="80,98 110,98 112,122 78,122" fill="#000000" stroke="none"/>
      <polygon points="76,146 114,146 116,170 74,170" fill="#000000" stroke="none"/>
      <rect x="91" y="176" width="8" height="16" fill="#000000" stroke="none"/>
      <path d="M36,236 L58,192 L132,192 L156,236 Z" fill="#000000"/>
      <path d="M52,206 L74,218 M116,204 L138,220 M84,202 L96,224" stroke="#ffffff" stroke-width="1.3"/>
      <path d="M12,238 C34,228 54,246 76,236 C98,226 118,246 140,236 C156,228 168,240 180,238" stroke-width="2" stroke-linecap="round"/>
      <path d="M22,252 C46,244 68,258 92,250 C116,242 138,258 166,250" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'autumnLeaves',
    name: 'Hojas de Otoño al Viento',
    category: 'tiempo',
    aspectType: 'corner',
    keywords: ['otono', 'hojas', 'hoja', 'arbol', 'pasado', 'ayer', 'despedida', 'memoria', 'cambio', 'sendero'],
    emotions: ['nostalgia', 'melancolia', 'serenidad', 'transicion'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.5">
      <path d="M10,18 C68,22 122,10 186,32" stroke-width="2" stroke-linecap="round"/>
      <path d="M46,19 C62,42 54,74 32,98" stroke-width="1.5"/>
      <g transform="translate(88,24) rotate(18)">
        <path d="M0,0 C18,-8 36,6 32,28 C28,44 10,48 0,36 C-10,48 -28,44 -32,28 C-36,6 -18,-8 0,0 Z" fill="#ffffff"/>
        <line x1="0" y1="-6" x2="0" y2="42"/>
        <path d="M0,12 L16,6 M0,22 L18,18 M0,12 L-16,6 M0,22 L-18,18" stroke-width="1.1"/>
      </g>
      <g transform="translate(36,118) rotate(-28)">
        <path d="M0,0 C16,10 20,34 0,52 C-20,34 -16,10 0,0 Z" fill="#000000"/>
        <line x1="0" y1="4" x2="0" y2="48" stroke="#ffffff" stroke-width="1.3"/>
        <path d="M0,18 L9,12 M0,30 L10,24 M0,18 L-9,12 M0,30 L-10,24" stroke="#ffffff" stroke-width="1"/>
      </g>
      <g transform="translate(132,108) rotate(36)">
        <path d="M0,0 C18,12 22,38 0,58 C-22,38 -18,12 0,0 Z" fill="#ffffff"/>
        <line x1="0" y1="-8" x2="0" y2="56"/>
        <path d="M0,18 L12,10 M0,32 L13,24 M0,18 L-12,10 M0,32 L-13,24" stroke-width="1.1"/>
      </g>
      <g transform="translate(86,168) rotate(-14) scale(0.75)">
        <path d="M0,0 C16,10 20,34 0,52 C-20,34 -16,10 0,0 Z" fill="#000000"/>
        <line x1="0" y1="4" x2="0" y2="48" stroke="#ffffff" stroke-width="1.3"/>
      </g>
      <path d="M68,86 Q96,98 112,126 M58,158 Q74,174 78,194" stroke-width="1" stroke-dasharray="3 4"/>
    </svg>`
  },
  {
    id: 'keyLocket',
    name: 'Llave Antigua y Relicario',
    category: 'amor',
    aspectType: 'vertical',
    keywords: ['secreto', 'llave', 'relicario', 'guardar', 'tesoro', 'recuerdo', 'pecho', 'promesa', 'nombre', 'intimo'],
    emotions: ['intimidad', 'fidelidad', 'misterio', 'afecto'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 250" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.6">
      <path d="M58,20 C78,42 112,42 132,20" stroke-width="1.3" stroke-dasharray="3 3"/>
      <g transform="translate(56,42)">
        <circle cx="22" cy="24" r="18" fill="#ffffff" stroke-width="2"/>
        <circle cx="22" cy="24" r="9" fill="#000000" stroke="none"/>
        <circle cx="22" cy="24" r="3.5" fill="#ffffff" stroke="none"/>
        <rect x="19" y="42" width="6" height="96" fill="#000000" stroke="none"/>
        <path d="M25,112 L42,112 L42,120 L32,120 L32,126 L42,126 L42,134 L25,134 Z" fill="#000000" stroke="none"/>
        <circle cx="22" cy="54" r="4" fill="#ffffff"/>
      </g>
      <g transform="translate(118,92)">
        <circle cx="0" cy="-24" r="6" fill="#ffffff"/>
        <path d="M0,48 C0,48 -34,26 -34,4 C-34,-10 -22,-18 -10,-14 C-4,-12 0,-6 0,-6 C0,-6 4,-12 10,-14 C22,-18 34,-10 34,4 C34,26 0,48 0,48 Z" fill="#ffffff" stroke-width="2"/>
        <path d="M0,40 C0,40 -26,22 -26,5 C-26,-5 -17,-10 -9,-7 C-4,-5 0,0 0,0 C0,0 4,-5 9,-7 C17,-10 26,-5 26,5 C26,22 0,40 0,40 Z" fill="#ffffff" stroke-width="1.1"/>
        <circle cx="0" cy="12" r="4" fill="#000000" stroke="none"/>
        <polygon points="-2.5,14 2.5,14 4,24 -4,24" fill="#000000" stroke="none"/>
      </g>
    </svg>`
  },
  {
    id: 'umbrellaCouple',
    name: 'Dos Siluetas bajo la Lluvia',
    category: 'amor',
    aspectType: 'vertical',
    keywords: ['lluvia', 'paraguas', 'pareja', 'juntos', 'caminar', 'cuidar', 'abrigo', 'tarde', 'ciudad', 'lado'],
    emotions: ['companerismo', 'ternura', 'refugio', 'romance'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 260" width="100%" height="100%" fill="none" stroke="#000000">
      <g stroke-width="1.1" stroke-linecap="round">
        <line x1="30" y1="18" x2="20" y2="48"/><line x1="68" y1="12" x2="58" y2="42"/>
        <line x1="122" y1="14" x2="112" y2="44"/><line x1="162" y1="22" x2="152" y2="52"/>
        <line x1="24" y1="108" x2="14" y2="138"/><line x1="168" y1="112" x2="158" y2="142"/>
      </g>
      <line x1="95" y1="42" x2="95" y2="52" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M28,96 C34,54 156,54 162,96 C142,88 126,92 118,98 C104,90 86,90 72,98 C62,92 46,88 28,96 Z" fill="#000000" stroke-width="1.6"/>
      <path d="M95,54 C78,66 72,82 72,96 M95,54 C112,66 118,82 118,96" stroke="#ffffff" stroke-width="1.3"/>
      <path d="M95,94 L95,142 C95,148 89,150 86,145" stroke-width="1.8" stroke-linecap="round"/>
      <g fill="#000000" stroke="none">
        <circle cx="78" cy="116" r="10"/>
        <path d="M64,128 L92,128 L94,192 L62,192 Z"/>
        <rect x="67" y="190" width="8" height="38"/>
        <rect x="80" y="190" width="8" height="38"/>
        <circle cx="110" cy="122" r="9.5"/>
        <path d="M98,134 L120,134 L132,198 L92,198 Z"/>
        <rect x="102" y="196" width="6.5" height="32"/>
        <rect x="113" y="196" width="6.5" height="32"/>
      </g>
      <path d="M92,138 L92,188 M108,144 L118,192" stroke="#ffffff" stroke-width="1.5"/>
      <ellipse cx="95" cy="234" rx="56" ry="6" stroke-width="1.3"/>
    </svg>`
  },
  {
    id: 'greekColumnIvy',
    name: 'Columna Clásica con Hiedra',
    category: 'ornamento',
    aspectType: 'vertical',
    keywords: ['columna', 'templo', 'hiedra', 'clasico', 'historia', 'piedra', 'firme', 'ruina', 'arquitectura', 'eterno'],
    emotions: ['solemnidad', 'permanencia', 'belleza', 'memoria'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 280" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.6">
      <rect x="44" y="26" width="92" height="10" fill="#ffffff"/>
      <path d="M52,36 L128,36 L122,56 L58,56 Z" fill="#ffffff"/>
      <circle cx="48" cy="46" r="11" fill="#ffffff"/><circle cx="48" cy="46" r="5"/>
      <circle cx="132" cy="46" r="11" fill="#ffffff"/><circle cx="132" cy="46" r="5"/>
      <rect x="60" y="56" width="60" height="178" fill="#ffffff"/>
      <line x1="72" y1="62" x2="72" y2="228" stroke-width="1.2"/>
      <line x1="84" y1="62" x2="84" y2="228" stroke-width="1.2"/>
      <line x1="96" y1="62" x2="96" y2="228" stroke-width="1.2"/>
      <line x1="108" y1="62" x2="108" y2="228" stroke-width="1.2"/>
      <rect x="52" y="234" width="76" height="10" fill="#ffffff"/>
      <rect x="42" y="244" width="96" height="12" fill="#000000"/>
      <path d="M54,232 C46,192 128,176 124,134 C120,96 56,98 66,64" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M52,202 L38,196 L46,184 Z M92,176 L106,166 L94,158 Z M124,142 L140,136 L130,124 Z M88,112 L74,104 L86,94 Z M64,78 L48,72 L58,60 Z" fill="#000000" stroke="none"/>
    </svg>`
  },
  {
    id: 'mothCandle',
    name: 'Polilla Nocturna y Vela Encendida',
    category: 'sacro',
    aspectType: 'vertical',
    keywords: ['vela', 'llama', 'fuego', 'polilla', 'luz', 'oscuridad', 'apago', 'arder', 'vigilia', 'fe', 'calido'],
    emotions: ['atraccion', 'intimidad', 'recogimiento', 'fragilidad'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 260" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.5">
      <g transform="translate(90,54)">
        <path d="M-4,0 C-26,-24 -62,-18 -58,8 C-54,26 -24,22 -6,10 C-22,22 -28,42 -12,44 C0,45 0,24 -2,12 Z" fill="#000000"/>
        <path d="M4,0 C26,-24 62,-18 58,8 C54,26 24,22 6,10 C22,22 28,42 12,44 C0,45 0,24 2,12 Z" fill="#000000"/>
        <circle cx="-32" cy="4" r="6" fill="#ffffff"/><circle cx="-32" cy="4" r="2.5" fill="#000000" stroke="none"/>
        <circle cx="32" cy="4" r="6" fill="#ffffff"/><circle cx="32" cy="4" r="2.5" fill="#000000" stroke="none"/>
        <ellipse cx="0" cy="10" rx="4" ry="16" fill="#000000"/>
        <path d="M-2,-6 Q-10,-18 -18,-20 M2,-6 Q10,-18 18,-20" stroke-width="1.3"/>
      </g>
      <circle cx="90" cy="134" r="22" stroke-width="1" stroke-dasharray="3 4"/>
      <path d="M90,112 C80,126 82,144 90,148 C98,144 100,126 90,112 Z" fill="#ffffff" stroke-width="1.7"/>
      <path d="M90,122 C86,130 87,140 90,143 C93,140 94,130 90,122 Z" fill="#000000" stroke="none"/>
      <line x1="90" y1="148" x2="90" y2="155" stroke-width="1.8"/>
      <rect x="72" y="155" width="36" height="72" fill="#ffffff" stroke-width="1.8"/>
      <path d="M72,164 C78,174 82,166 86,184 C90,168 98,176 108,162" stroke-width="1.4"/>
      <ellipse cx="90" cy="230" rx="42" ry="9" fill="#ffffff" stroke-width="1.8"/>
      <path d="M126,226 C138,220 144,232 130,236" stroke-width="1.8"/>
    </svg>`
  },
  {
    id: 'pocketWatch',
    name: 'Reloj de Bolsillo Abierto',
    category: 'tiempo',
    aspectType: 'square',
    keywords: ['reloj', 'tiempo', 'horas', 'minutos', 'tarde', 'puntual', 'memoria', 'pasado', 'manana', 'segundo'],
    emotions: ['nostalgia', 'memoria', 'precision', 'paso_del_tiempo'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.6">
      <circle cx="100" cy="26" r="12"/>
      <rect x="93" y="36" width="14" height="12" fill="#000000" stroke="none"/>
      <circle cx="100" cy="112" r="66" fill="#ffffff" stroke-width="2.4"/>
      <circle cx="100" cy="112" r="58" stroke-width="1.2"/>
      <circle cx="100" cy="112" r="44" stroke-width="0.9" stroke-dasharray="2 4"/>
      <g stroke-width="2" stroke-linecap="round">
        <line x1="100" y1="58" x2="100" y2="66"/>
        <line x1="100" y1="158" x2="100" y2="166"/>
        <line x1="46" y1="112" x2="54" y2="112"/>
        <line x1="146" y1="112" x2="154" y2="112"/>
      </g>
      <g stroke-width="1.2">
        <line x1="127" y1="65" x2="123" y2="72"/><line x1="147" y1="85" x2="140" y2="89"/>
        <line x1="147" y1="139" x2="140" y2="135"/><line x1="127" y1="159" x2="123" y2="152"/>
        <line x1="73" y1="159" x2="77" y2="152"/><line x1="53" y1="139" x2="60" y2="135"/>
        <line x1="53" y1="85" x2="60" y2="89"/><line x1="73" y1="65" x2="77" y2="72"/>
      </g>
      <line x1="100" y1="112" x2="78" y2="88" stroke-width="2.8" stroke-linecap="round"/>
      <line x1="100" y1="112" x2="132" y2="96" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="100" cy="112" r="4" fill="#000000" stroke="none"/>
      <path d="M112,26 C148,22 178,42 184,78" stroke-width="1.4" stroke-dasharray="4 3"/>
    </svg>`
  },
  {
    id: 'mountainSun',
    name: 'Cordillera y Sol en Xilografía',
    category: 'cosmos',
    aspectType: 'horizontal',
    keywords: ['montana', 'cordillera', 'sol', 'amanecer', 'manana', 'alba', 'horizonte', 'mundo', 'caminar', 'cumbre'],
    emotions: ['esperanza', 'grandeza', 'renacer', 'claridad'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150" width="100%" height="100%" fill="none" stroke="#000000">
      <circle cx="120" cy="68" r="24" fill="#ffffff" stroke-width="2"/>
      <g stroke-width="1.4" stroke-linecap="round">
        <line x1="120" y1="14" x2="120" y2="36"/>
        <line x1="88" y1="22" x2="100" y2="40"/><line x1="152" y1="22" x2="140" y2="40"/>
        <line x1="62" y1="42" x2="86" y2="54"/><line x1="178" y1="42" x2="154" y2="54"/>
        <line x1="48" y1="68" x2="88" y2="68"/><line x1="192" y1="68" x2="152" y2="68"/>
      </g>
      <polygon points="16,128 74,58 128,128" fill="#ffffff" stroke-width="1.8"/>
      <polygon points="74,58 102,128 128,128" fill="#000000" stroke="none"/>
      <polygon points="112,128 168,52 224,128" fill="#ffffff" stroke-width="1.8"/>
      <polygon points="168,52 194,128 224,128" fill="#000000" stroke="none"/>
      <polygon points="62,128 120,66 178,128" fill="#ffffff" stroke-width="2"/>
      <polygon points="120,66 148,128 178,128" fill="#000000" stroke="none"/>
      <path d="M98,92 L120,86 M86,108 L120,98 M76,120 L120,112" stroke-width="1.1"/>
      <line x1="12" y1="128" x2="228" y2="128" stroke-width="2.2"/>
      <line x1="28" y1="136" x2="212" y2="136" stroke-width="1.2"/>
    </svg>`
  },
  {
    id: 'dandelionWind',
    name: 'Diente de León al Viento',
    category: 'botanica',
    aspectType: 'vertical',
    keywords: ['semilla', 'deseo', 'soplar', 'viento', 'aire', 'diente', 'efimero', 'soltar', 'sueño', 'campo'],
    emotions: ['ligereza', 'deseo', 'desapego', 'esperanza'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 260" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.4">
      <path d="M62,244 C64,198 68,156 76,112" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M64,218 C42,202 36,184 48,172 C52,188 58,202 64,218 Z" fill="#000000" stroke="none"/>
      <circle cx="76" cy="108" r="7" fill="#000000" stroke="none"/>
      <g stroke-width="1.2">
        <line x1="76" y1="108" x2="76" y2="68"/><circle cx="76" cy="66" r="2.2" fill="#000000"/>
        <line x1="76" y1="108" x2="52" y2="76"/><circle cx="50" cy="74" r="2.2" fill="#000000"/>
        <line x1="76" y1="108" x2="38" y2="96"/><circle cx="36" cy="95" r="2.2" fill="#000000"/>
        <line x1="76" y1="108" x2="40" y2="122"/><circle cx="38" cy="123" r="2.2" fill="#000000"/>
        <line x1="76" y1="108" x2="54" y2="140"/><circle cx="52" cy="142" r="2.2" fill="#000000"/>
        <line x1="76" y1="108" x2="94" y2="140"/><circle cx="96" cy="142" r="2.2" fill="#000000"/>
        <line x1="76" y1="108" x2="96" y2="76"/><circle cx="98" cy="74" r="2.2" fill="#000000"/>
        <line x1="76" y1="108" x2="64" y2="70"/><line x1="76" y1="108" x2="44" y2="85"/>
        <line x1="76" y1="108" x2="44" y2="109"/><line x1="76" y1="108" x2="88" y2="128"/>
      </g>
      <g transform="translate(114,88) rotate(28)">
        <line x1="0" y1="0" x2="0" y2="16" stroke-width="1.3"/>
        <line x1="0" y1="0" x2="-7" y2="-8"/><line x1="0" y1="0" x2="0" y2="-10"/><line x1="0" y1="0" x2="7" y2="-8"/>
        <circle cx="0" cy="17" r="1.8" fill="#000000" stroke="none"/>
      </g>
      <g transform="translate(138,62) rotate(40)">
        <line x1="0" y1="0" x2="0" y2="15" stroke-width="1.3"/>
        <line x1="0" y1="0" x2="-6" y2="-7"/><line x1="0" y1="0" x2="0" y2="-9"/><line x1="0" y1="0" x2="6" y2="-7"/>
        <circle cx="0" cy="16" r="1.8" fill="#000000" stroke="none"/>
      </g>
      <g transform="translate(154,36) rotate(48)">
        <line x1="0" y1="0" x2="0" y2="13" stroke-width="1.2"/>
        <line x1="0" y1="0" x2="-5" y2="-6"/><line x1="0" y1="0" x2="0" y2="-8"/><line x1="0" y1="0" x2="5" y2="-6"/>
        <circle cx="0" cy="14" r="1.6" fill="#000000" stroke="none"/>
      </g>
    </svg>`
  },
  {
    id: 'musicNotes',
    name: 'Lira Clásica y Canción al Viento',
    category: 'vuelo',
    aspectType: 'horizontal',
    keywords: ['cancion', 'musica', 'voz', 'melodia', 'cantar', 'lira', 'sonido', 'susurro', 'oido', 'ritmo'],
    emotions: ['armonia', 'alegria', 'inspiracion', 'dulzura'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.5">
      <path d="M16,96 C64,72 118,118 172,86 C198,70 214,76 228,82" stroke-width="1.1"/>
      <path d="M16,106 C64,82 118,128 172,96 C198,80 214,86 228,92" stroke-width="1.1"/>
      <path d="M16,116 C64,92 118,138 172,106 C198,90 214,96 228,102" stroke-width="1.1"/>
      <g transform="translate(36,24)">
        <path d="M14,18 C2,18 0,38 8,56 C14,70 18,82 28,82 C38,82 42,70 48,56 C56,38 54,18 42,18" stroke-width="2.2"/>
        <line x1="10" y1="22" x2="46" y2="22" stroke-width="2"/>
        <rect x="16" y="76" width="24" height="12" fill="#000000" stroke="none"/>
        <line x1="22" y1="22" x2="22" y2="76" stroke-width="1"/>
        <line x1="28" y1="22" x2="28" y2="76" stroke-width="1"/>
        <line x1="34" y1="22" x2="34" y2="76" stroke-width="1"/>
      </g>
      <g fill="#000000" stroke="none">
        <ellipse cx="132" cy="76" rx="6" ry="4.5" transform="rotate(-20 132 76)"/>
        <rect x="136" y="46" width="2" height="30"/>
        <path d="M138,46 C146,50 148,56 144,62 C145,56 142,52 138,50 Z"/>
        <ellipse cx="174" cy="64" rx="6" ry="4.5" transform="rotate(-20 174 64)"/>
        <ellipse cx="198" cy="56" rx="6" ry="4.5" transform="rotate(-20 198 56)"/>
        <rect x="178" y="34" width="2" height="30"/>
        <rect x="202" y="26" width="2" height="30"/>
        <polygon points="178,34 204,26 204,31 178,39"/>
      </g>
    </svg>`
  },
  {
    id: 'eclipseSun',
    name: 'Eclipse Total Radiante',
    category: 'cosmos',
    aspectType: 'square',
    keywords: ['eclipse', 'sol', 'luna', 'sombra', 'luz', 'encuentro', 'unico', 'unica', 'universo', 'misterio'],
    emotions: ['asombro', 'intensidad', 'dualidad', 'magnetismo'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="#000000">
      <g stroke-width="1.3" stroke-linecap="round">
        <line x1="100" y1="8" x2="100" y2="44"/><line x1="100" y1="156" x2="100" y2="192"/>
        <line x1="8" y1="100" x2="44" y2="100"/><line x1="156" y1="100" x2="192" y2="100"/>
        <line x1="35" y1="35" x2="60" y2="60"/><line x1="165" y1="165" x2="140" y2="140"/>
        <line x1="165" y1="35" x2="140" y2="60"/><line x1="35" y1="165" x2="60" y2="140"/>
      </g>
      <g stroke-width="1" stroke-dasharray="3 3">
        <line x1="65" y1="16" x2="78" y2="48"/><line x1="135" y1="16" x2="122" y2="48"/>
        <line x1="16" y1="65" x2="48" y2="78"/><line x1="184" y1="65" x2="152" y2="78"/>
        <line x1="16" y1="135" x2="48" y2="122"/><line x1="184" y1="135" x2="152" y2="122"/>
        <line x1="65" y1="184" x2="78" y2="152"/><line x1="135" y1="184" x2="122" y2="152"/>
      </g>
      <circle cx="100" cy="100" r="52" fill="#ffffff" stroke-width="1.6"/>
      <circle cx="100" cy="100" r="44" fill="#000000" stroke="none"/>
      <path d="M132,70 A44,44 0 0,1 132,130 A40,40 0 0,0 132,70 Z" fill="#ffffff" stroke="none"/>
      <path d="M144,100 L152,97 L160,100 L152,103 Z" fill="#000000" stroke="none"/>
    </svg>`
  },
  {
    id: 'lotusBloom',
    name: 'Flor de Loto en Tinta',
    category: 'botanica',
    aspectType: 'square',
    keywords: ['loto', 'flor', 'paz', 'agua', 'calma', 'respirar', 'renacer', 'pureza', 'alma', 'silencio'],
    emotions: ['serenidad', 'paz', 'equilibrio', 'pureza'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.6" stroke-linejoin="round">
      <path d="M36,126 C18,116 14,94 26,84 C46,88 66,104 78,128 Z" fill="#ffffff"/>
      <path d="M164,126 C182,116 186,94 174,84 C154,88 134,104 122,128 Z" fill="#ffffff"/>
      <path d="M58,130 C38,104 42,68 64,54 C80,68 90,96 92,130 Z" fill="#ffffff"/>
      <path d="M142,130 C162,104 158,68 136,54 C120,68 110,96 108,130 Z" fill="#ffffff"/>
      <path d="M100,36 C122,62 124,102 100,134 C76,102 78,62 100,36 Z" fill="#ffffff" stroke-width="1.8"/>
      <line x1="100" y1="52" x2="100" y2="124" stroke-width="1.1"/>
      <path d="M66,72 L84,118 M134,72 L116,118" stroke-width="1"/>
      <path d="M46,132 C78,144 122,144 154,132 C136,150 64,150 46,132 Z" fill="#000000"/>
      <ellipse cx="100" cy="158" rx="68" ry="8" stroke-width="1.3"/>
      <ellipse cx="100" cy="158" rx="40" ry="4" stroke-width="1"/>
    </svg>`
  },
  // =========================================================================
  // 8 GRABADOS MINIMALISTAS (UN SOLO TRAZO EN TINTA NEGRA PARA ESTAMPADO EXTRA)
  // =========================================================================
  {
    id: 'miniMoon',
    name: 'Luna Minimalista Fina',
    category: 'minimalista',
    aspectType: 'square',
    keywords: ['minimalista', 'luna', 'noche', 'trazo', 'fino', 'sencillo', 'cielo', 'lunar'],
    emotions: ['calma', 'minimalismo', 'intimismo', 'silencio'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M112,34 A56,56 0 1,0 144,126 A44,44 0 1,1 112,34 Z"/>
      <path d="M126,56 L128,62 L134,64 L128,66 L126,72 L124,66 L118,64 L124,62 Z" fill="#000000" stroke="none"/>
      <circle cx="144" cy="84" r="2" fill="#000000" stroke="none"/>
    </svg>`
  },
  {
    id: 'miniOneLineFlower',
    name: 'Flor Minimalista de Un Trazo',
    category: 'minimalista',
    aspectType: 'vertical',
    keywords: ['minimalista', 'flor', 'tallo', 'petalo', 'trazo', 'botanica', 'simple', 'delicado'],
    emotions: ['delicadeza', 'pureza', 'minimalismo', 'amor'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 220" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M80,196 L80,84 C80,68 96,52 98,38 C99,24 84,22 80,36 C76,22 61,24 62,38 C64,52 80,68 80,84 M80,84 C60,78 48,54 58,42 C68,32 82,50 80,84 M80,84 C100,78 112,54 102,42 C92,32 78,50 80,84 M80,148 C98,142 114,126 112,114 C96,118 82,132 80,148"/>
    </svg>`
  },
  {
    id: 'miniHandsLine',
    name: 'Manos en Línea Continua',
    category: 'minimalista',
    aspectType: 'horizontal',
    keywords: ['minimalista', 'manos', 'dedos', 'tacto', 'amor', 'trazo', 'contacto', 'abrazo'],
    emotions: ['cercania', 'minimalismo', 'ternura', 'vinculo'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16,96 C44,86 64,74 84,66 C94,62 106,62 112,68 C118,74 106,80 94,78 C110,82 126,70 138,60 C152,48 174,40 204,34"/>
      <path d="M24,110 C54,98 76,92 98,90 C112,88 124,78 138,74 C156,68 180,66 206,62"/>
      <circle cx="112" cy="40" r="3" fill="#000000" stroke="none"/>
    </svg>`
  },
  {
    id: 'miniBirdLine',
    name: 'Ave Minimalista en Vuelo',
    category: 'minimalista',
    aspectType: 'horizontal',
    keywords: ['minimalista', 'ave', 'pajaro', 'alas', 'libertad', 'trazo', 'volar'],
    emotions: ['libertad', 'ligereza', 'minimalismo', 'paz'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M26,96 C58,86 82,76 98,58 C108,46 112,28 102,22 C92,18 82,34 90,54 C98,74 126,82 152,66 C166,58 176,46 184,48 C174,56 164,70 146,82 C118,100 84,102 52,114 C40,118 30,108 26,96 Z"/>
      <path d="M152,66 L166,64" stroke-width="1.6"/>
    </svg>`
  },
  {
    id: 'miniHeartLine',
    name: 'Corazón de Un Solo Trazo',
    category: 'minimalista',
    aspectType: 'square',
    keywords: ['minimalista', 'corazon', 'amor', 'trazo', 'sencillo', 'pecho', 'puro'],
    emotions: ['amor', 'minimalismo', 'pureza', 'esencia'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M36,136 C60,120 78,100 88,78 C98,54 122,42 138,54 C154,66 146,98 116,120 C98,134 78,140 68,124 C56,104 42,64 62,48 C80,34 98,56 90,80 C84,98 104,126 144,136"/>
    </svg>`
  },
  {
    id: 'miniStarSpark',
    name: 'Estrella Polar Minimalista',
    category: 'minimalista',
    aspectType: 'square',
    keywords: ['minimalista', 'estrella', 'luz', 'astro', 'destello', 'guia', 'noche'],
    emotions: ['claridad', 'minimalismo', 'destino', 'asombro'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M90,22 C92,70 110,88 158,90 C110,92 92,110 90,158 C88,110 70,92 22,90 C70,88 88,70 90,22 Z"/>
      <circle cx="90" cy="90" r="3" fill="#000000" stroke="none"/>
      <path d="M44,44 L52,52 M136,44 L128,52 M44,136 L52,128 M136,136 L128,128" stroke-width="1.3"/>
    </svg>`
  },
  {
    id: 'miniWaveLine',
    name: 'Olas y Horizonte Minimalista',
    category: 'minimalista',
    aspectType: 'horizontal',
    keywords: ['minimalista', 'mar', 'ola', 'olas', 'horizonte', 'sol', 'agua', 'calma'],
    emotions: ['serenidad', 'minimalismo', 'travesia', 'calma'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.9" stroke-linecap="round">
      <path d="M72,64 A38,38 0 0,1 148,64"/>
      <line x1="22" y1="68" x2="198" y2="68" stroke-width="1.4"/>
      <path d="M24,84 Q54,74 84,84 T144,84 T198,84"/>
      <path d="M36,100 Q66,90 96,100 T156,100 T192,100" stroke-width="1.4"/>
    </svg>`
  },
  {
    id: 'miniEyeLine',
    name: 'Mirada Poética Minimalista',
    category: 'minimalista',
    aspectType: 'horizontal',
    keywords: ['minimalista', 'ojo', 'mirada', 'ver', 'alma', 'lagrima', 'despertar'],
    emotions: ['introspeccion', 'minimalismo', 'misterio', 'belleza'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="100%" height="100%" fill="none" stroke="#000000" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24,70 C58,34 162,34 196,70 C162,106 58,106 24,70 Z"/>
      <circle cx="110" cy="70" r="21"/>
      <circle cx="110" cy="70" r="7" fill="#000000" stroke="none"/>
      <circle cx="116" cy="64" r="2.8" fill="#ffffff" stroke="none"/>
      <line x1="110" y1="22" x2="110" y2="32" stroke-width="1.4"/>
      <line x1="78" y1="28" x2="83" y2="37" stroke-width="1.4"/>
      <line x1="142" y1="28" x2="137" y2="37" stroke-width="1.4"/>
    </svg>`
  }
];

const ILLUSTRATIONS_BY_ID = new Map(
  ILLUSTRATIONS_CATALOG.map((item) => [item.id, item])
);

/**
 * Finds an illustration by exact ID, returning null if not found.
 */
export function getIllustrationById(id) {
  if (!id) return null;
  return ILLUSTRATIONS_BY_ID.get(String(id)) || null;
}

/**
 * Lists illustrations filtered by category (or all 32 if category is omitted/'all').
 */
export function listIllustrationsByCategory(category) {
  if (!category || category === 'all' || category === 'todas') {
    return [...ILLUSTRATIONS_CATALOG];
  }
  const normalized = String(category).trim().toLowerCase();
  return ILLUSTRATIONS_CATALOG.filter((item) => item.category === normalized);
}

/**
 * Deterministic multi-format sheet imposition engine for Switch-Lit Poetry Press.
 * Pure isomorphic ES Module (no Node.js built-ins) — runs identically in Node and Browser.
 * PostScript precision: 1 inch = 25.4 mm = 72 pt (MM_TO_PT = 72 / 25.4, error < 0.05 pt).
 */

import { MM_TO_PT, computeFormatGeometry, mmToPt } from './formatSpecs.js';

export { MM_TO_PT };

function roundMm(value) {
  return Number(Number(value).toFixed(4));
}

function toPt(mm) {
  return Number(mmToPt(mm).toFixed(4));
}

function makeLine(x1Mm, y1Mm, x2Mm, y2Mm, kind, label) {
  return {
    kind,
    label,
    orientation: Math.abs(y1Mm - y2Mm) < 0.001 ? 'horizontal' : 'vertical',
    x1Mm: roundMm(x1Mm),
    y1Mm: roundMm(y1Mm),
    x2Mm: roundMm(x2Mm),
    y2Mm: roundMm(y2Mm),
    x1Pt: toPt(x1Mm),
    y1Pt: toPt(y1Mm),
    x2Pt: toPt(x2Mm),
    y2Pt: toPt(y2Mm)
  };
}

function normalizePages(pages, defaultMinPages) {
  if (!Array.isArray(pages) || pages.length === 0) {
    return Array.from({ length: defaultMinPages }, (_, idx) => ({
      id: idx + 1,
      role: `Página ${idx + 1}`,
      title: '',
      text: ''
    }));
  }

  return pages.map((raw, idx) => {
    if (raw && typeof raw === 'object') {
      return {
        ...raw,
        id: raw.id ?? idx + 1
      };
    }
    return {
      id: idx + 1,
      role: `Página ${idx + 1}`,
      title: '',
      text: typeof raw === 'string' ? raw : ''
    };
  });
}

function buildCell({
  col,
  row,
  xMm,
  yMm,
  widthMm,
  heightMm,
  displayPageNumber,
  totalPages,
  normalizedPages,
  rotationDeg = 0
}) {
  const isBlankPadding = displayPageNumber < 1 || displayPageNumber > totalPages;
  const pageNumber = isBlankPadding ? null : displayPageNumber;
  const page = pageNumber !== null ? normalizedPages[pageNumber - 1] : null;

  return {
    col,
    row,
    xMm: roundMm(xMm),
    yMm: roundMm(yMm),
    widthMm: roundMm(widthMm),
    heightMm: roundMm(heightMm),
    xPt: toPt(xMm),
    yPt: toPt(yMm),
    widthPt: toPt(widthMm),
    heightPt: toPt(heightMm),
    pageNumber,
    displayPageNumber,
    isBlankPadding,
    rotationDeg,
    page
  };
}

function buildPrinterSummary(geometry, sheetCount, totalPages, paddedPageCount) {
  const orientLabel = geometry.sheetOrientation === 'landscape' ? 'apaisada (horizontal)' : 'vertical';
  const blankCount = Math.max(0, paddedPageCount - totalPages);
  const blankNote = blankCount > 0
    ? ` Incluye ${blankCount} ${blankCount === 1 ? 'página de cortesía en blanco' : 'páginas de cortesía en blanco'} al cierre para completar el pliego.`
    : '';

  if (geometry.formatId === 'saddle_half') {
    return (
      `Imprimí ${sheetCount} ${sheetCount === 1 ? 'hoja' : 'hojas'} ${geometry.paperName} en orientación ${orientLabel} ` +
      `a doble faz (volteando por el borde corto), al 100% sin ajustar a página y con margen 0. ` +
      `Cada página cerrada mide ${geometry.pageWidthMm} × ${geometry.pageHeightMm} mm (${totalPages} páginas).` +
      blankNote
    );
  }

  if (geometry.formatId === 'pocket_quarter') {
    return (
      `Imprimí ${sheetCount} ${sheetCount === 1 ? 'hoja' : 'hojas'} ${geometry.paperName} en orientación ${orientLabel} ` +
      `a doble faz (volteando por el borde largo), al 100% sin márgenes. ` +
      `Hacé 1 corte horizontal exacto a mitad de hoja (${roundMm(geometry.sheetHeightMm / 2)} mm), doblá al medio y encartá. ` +
      `Formato final de bolsillo: ${geometry.pageWidthMm} × ${geometry.pageHeightMm} mm.` +
      blankNote
    );
  }

  if (geometry.formatId === 'single_sheet_zine') {
    return (
      `Imprimí ${sheetCount} ${sheetCount === 1 ? 'hoja' : 'hojas'} ${geometry.paperName} en orientación ${orientLabel} ` +
      `de 1 SOLA CARA (simple faz), al 100% sin márgenes. ` +
      `La fila superior ya incluye rotación exacta de 180°. Con 1 corte central y plegado en W armás tu fanzine de ${geometry.pageWidthMm} × ${geometry.pageHeightMm} mm sin grapas.` +
      blankNote
    );
  }

  return (
    `Imprimí ${sheetCount} ${sheetCount === 1 ? 'hoja' : 'hojas'} ${geometry.paperName} en orientación ${orientLabel} ` +
    `a doble faz (volteando por el borde largo), grilla centrada ${geometry.cols} × ${geometry.rows} al 100% sin ajustar. ` +
    `Guillotina por las líneas guía para obtener páginas exactas de ${geometry.pageWidthMm} × ${geometry.pageHeightMm} mm.` +
    blankNote
  );
}

function buildFoldingGuide(geometry, sheetCount) {
  const halfW = roundMm(geometry.sheetWidthMm / 2);
  const halfH = roundMm(geometry.sheetHeightMm / 2);

  if (geometry.formatId === 'saddle_half') {
    return {
      title: 'Guía de Impresión y Armado — Cuadernillo Clásico (1/2 Hoja)',
      steps: [
        {
          stepNumber: 1,
          title: 'Impresión doble faz (borde corto)',
          description: `Imprimí ${sheetCount === 1 ? 'la hoja' : `las ${sheetCount} hojas`} en papel ${geometry.paperName} apaisado, escala 100% (tamaño real) y doble faz volteando por el borde corto.`,
          diagramId: 'saddle-print-duplex'
        },
        {
          stepNumber: 2,
          title: 'Apilado encartado en orden',
          description: 'Mantené las hojas impresas en el mismo orden de salida, con la cara de la portada (Página 1) mirando hacia abajo o afuera según el pliego.',
          diagramId: 'saddle-stack'
        },
        {
          stepNumber: 3,
          title: 'Plegado central a la mitad',
          description: `Doblá todo el bloque exactamente por la línea central vertical (${halfW} mm) usando una plegadera o el lomo de una cuchara para marcar bien el lomo.`,
          diagramId: 'saddle-fold'
        },
        {
          stepNumber: 4,
          title: 'Cosido o abrochado en el lomo',
          description: 'Fijá el lomo con 2 grapas a caballo sobre el pliegue central o realizá 3 puntadas con hilo encerado para encuadernación artesanal.',
          diagramId: 'saddle-bind'
        }
      ]
    };
  }

  if (geometry.formatId === 'pocket_quarter') {
    return {
      title: 'Guía de Impresión, Corte y Encarte — Mini-Libro de Bolsillo (1/4 Hoja)',
      steps: [
        {
          stepNumber: 1,
          title: 'Impresión doble faz (borde largo)',
          description: `Imprimí ${sheetCount === 1 ? 'la hoja' : `las ${sheetCount} hojas`} en ${geometry.paperName} vertical a escala 100%, configurando doble faz por el borde largo para mantener el registro perfecto frente/dorso.`,
          diagramId: 'pocket-print-duplex'
        },
        {
          stepNumber: 2,
          title: 'Corte horizontal único a la mitad',
          description: `Cortá cada hoja de lado a lado por la línea horizontal media (y = ${halfH} mm) para separar la tira superior de la tira inferior.`,
          diagramId: 'pocket-cut-middle'
        },
        {
          stepNumber: 3,
          title: 'Doblado vertical de cada tira',
          description: `Doblá cada tira por su eje vertical central (x = ${halfW} mm) para formar dípticos de ${geometry.pageWidthMm} × ${geometry.pageHeightMm} mm.`,
          diagramId: 'pocket-fold-strips'
        },
        {
          stepNumber: 4,
          title: 'Encarte anidado y costura',
          description: 'Colocá la tira inferior dentro de la tira superior (y seguí anidando en orden si hay más hojas) para que las páginas corran de 1 a N sin saltos. Grapá o cosé por el lomo.',
          diagramId: 'pocket-nest-bind'
        }
      ]
    };
  }

  if (geometry.formatId === 'single_sheet_zine') {
    return {
      title: 'Guía de Corte y Plegado en W — Fanzine de 1 Sola Hoja (Sin Grapas)',
      steps: [
        {
          stepNumber: 1,
          title: 'Impresión simple faz al 100%',
          description: `Imprimí una sola cara en ${geometry.paperName} apaisado a escala real 100%. No hace falta dar vuelta la hoja: las 4 páginas superiores ya están rotadas 180°.`,
          diagramId: 'zine-print-single'
        },
        {
          stepNumber: 2,
          title: 'Marcado de pliegues en cruz y acordeón',
          description: 'Doblá primero la hoja al medio a lo largo (horizontal), abrí, y doblá en 4 partes iguales a lo ancho (cuartos verticales) marcando bien todos los pliegues.',
          diagramId: 'zine-score-folds'
        },
        {
          stepNumber: 3,
          title: 'Corte central único entre columnas 2 y 3',
          description: `Doblá la hoja por la mitad vertical y cortá con tijera o cúter SOLO el tramo central horizontal entre el 25% y el 75% del ancho (desde el pliegue hasta el centro).`,
          diagramId: 'zine-cut-center'
        },
        {
          stepNumber: 4,
          title: 'Plegado en W / libro instantáneo',
          description: 'Abrí la hoja, doblala a lo largo con lo impreso hacia afuera y empujá los extremos hacia el centro para abrir la cruz del corte. Plegá las tapas: la Página 1 queda al frente y la 8 atrás sin grapas.',
          diagramId: 'zine-fold-w'
        }
      ]
    };
  }

  return {
    title: `Guía de Guillotina y Registro Espejado — Medida Personalizada (${geometry.pageWidthMm} × ${geometry.pageHeightMm} mm)`,
    steps: [
      {
        stepNumber: 1,
        title: 'Impresión doble faz centrada al 100%',
        description: `Imprimí ${sheetCount === 1 ? 'la hoja' : `las ${sheetCount} hojas`} en ${geometry.paperName} (${geometry.sheetOrientation === 'landscape' ? 'apaisado' : 'vertical'}) a doble faz volteando por el borde largo. El dorso está espejado automáticamente en columnas.`,
        diagramId: 'custom-print-duplex'
      },
      {
        stepNumber: 2,
        title: 'Verificación al trasluz',
        description: 'Sostené la hoja a contraluz: cada recuadro del frente coincide al milímetro con su columna espejada en el dorso.',
        diagramId: 'custom-register-check'
      },
      {
        stepNumber: 3,
        title: 'Cortes rectos de guillotina',
        description: `Refilá siguiendo la grilla exterior de ${geometry.cols} × ${geometry.rows} celdas para obtener tus páginas sueltas exactas de ${geometry.pageWidthMm} × ${geometry.pageHeightMm} mm.`,
        diagramId: 'custom-guillotine'
      },
      {
        stepNumber: 4,
        title: 'Alzado y encuadernado libre',
        description: 'Ordená las hojas cortadas de la primera a la última y unilas con costura japonesa, anillado, encolado al lomo o broche.',
        diagramId: 'custom-bind'
      }
    ]
  };
}

/**
 * Computes exact deterministic imposition sheets, cell coordinates (in mm and PostScript pt),
 * cut/fold guides, printer summary, and folding guide for any supported format and paper size.
 */
export function imposeBookSpreads({
  pages = [],
  paperId = 'A4',
  formatId = 'saddle_half',
  customWidthMm = 105,
  customHeightMm = 148
} = {}) {
  const geometry = computeFormatGeometry({
    paperId,
    formatId,
    customWidthMm,
    customHeightMm
  });

  const sheetWidthMm = geometry.sheetWidthMm;
  const sheetHeightMm = geometry.sheetHeightMm;
  const pageWidthMm = geometry.pageWidthMm;
  const pageHeightMm = geometry.pageHeightMm;
  const cols = geometry.cols;
  const rows = geometry.rows;

  let defaultMinPages = 4;
  if (geometry.formatId === 'pocket_quarter' || geometry.formatId === 'single_sheet_zine') {
    defaultMinPages = 8;
  } else if (geometry.formatId === 'custom_nup') {
    defaultMinPages = Math.max(4, cols * rows * 2);
  }

  const normalizedPages = normalizePages(pages, defaultMinPages);
  const totalPages = normalizedPages.length;

  let paddedPageCount = 0;
  let offsetXMm = 0;
  let offsetYMm = 0;
  const cutLinesMm = [];
  const foldLinesMm = [];
  const sheets = [];

  if (geometry.formatId === 'saddle_half') {
    paddedPageCount = Math.max(4, Math.ceil(totalPages / 4) * 4);
    const sheetCount = paddedPageCount / 4;

    foldLinesMm.push(
      makeLine(sheetWidthMm / 2, 0, sheetWidthMm / 2, sheetHeightMm, 'fold', 'Pliegue central (lomo)')
    );

    for (let k = 1; k <= sheetCount; k += 1) {
      const frontNums = [paddedPageCount - 2 * (k - 1), 2 * k - 1];
      const backNums = [2 * k, paddedPageCount - 2 * k + 1];

      const frontCells = frontNums.map((num, col) =>
        buildCell({
          col,
          row: 0,
          xMm: col * pageWidthMm,
          yMm: 0,
          widthMm: pageWidthMm,
          heightMm: pageHeightMm,
          displayPageNumber: num,
          totalPages,
          normalizedPages,
          rotationDeg: 0
        })
      );

      const backCells = backNums.map((num, col) =>
        buildCell({
          col,
          row: 0,
          xMm: col * pageWidthMm,
          yMm: 0,
          widthMm: pageWidthMm,
          heightMm: pageHeightMm,
          displayPageNumber: num,
          totalPages,
          normalizedPages,
          rotationDeg: 0
        })
      );

      sheets.push({
        sheetNumber: k,
        sheetIndex: k - 1,
        sheetWidthMm: roundMm(sheetWidthMm),
        sheetHeightMm: roundMm(sheetHeightMm),
        sheetWidthPt: toPt(sheetWidthMm),
        sheetHeightPt: toPt(sheetHeightMm),
        sides: [
          {
            sideType: 'front',
            sideLabel: 'Frente',
            sheetNumber: k,
            cols,
            rows,
            cells: frontCells
          },
          {
            sideType: 'back',
            sideLabel: 'Dorso',
            sheetNumber: k,
            cols,
            rows,
            cells: backCells
          }
        ]
      });
    }
  } else if (geometry.formatId === 'pocket_quarter') {
    paddedPageCount = Math.max(8, Math.ceil(totalPages / 8) * 8);
    const sheetCount = paddedPageCount / 8;

    cutLinesMm.push(
      makeLine(0, sheetHeightMm / 2, sheetWidthMm, sheetHeightMm / 2, 'cut', 'Corte horizontal medio')
    );
    foldLinesMm.push(
      makeLine(sheetWidthMm / 2, 0, sheetWidthMm / 2, sheetHeightMm, 'fold', 'Pliegue vertical medio')
    );

    for (let k = 0; k < sheetCount; k += 1) {
      const frontGrid = [
        [paddedPageCount - 4 * k, 4 * k + 1],
        [paddedPageCount - 4 * k - 2, 4 * k + 3]
      ];
      const backGrid = [
        [4 * k + 2, paddedPageCount - 4 * k - 1],
        [4 * k + 4, paddedPageCount - 4 * k - 3]
      ];

      const frontCells = [];
      const backCells = [];

      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          frontCells.push(
            buildCell({
              col,
              row,
              xMm: col * pageWidthMm,
              yMm: row * pageHeightMm,
              widthMm: pageWidthMm,
              heightMm: pageHeightMm,
              displayPageNumber: frontGrid[row][col],
              totalPages,
              normalizedPages,
              rotationDeg: 0
            })
          );
          backCells.push(
            buildCell({
              col,
              row,
              xMm: col * pageWidthMm,
              yMm: row * pageHeightMm,
              widthMm: pageWidthMm,
              heightMm: pageHeightMm,
              displayPageNumber: backGrid[row][col],
              totalPages,
              normalizedPages,
              rotationDeg: 0
            })
          );
        }
      }

      sheets.push({
        sheetNumber: k + 1,
        sheetIndex: k,
        sheetWidthMm: roundMm(sheetWidthMm),
        sheetHeightMm: roundMm(sheetHeightMm),
        sheetWidthPt: toPt(sheetWidthMm),
        sheetHeightPt: toPt(sheetHeightMm),
        sides: [
          {
            sideType: 'front',
            sideLabel: 'Frente',
            sheetNumber: k + 1,
            cols,
            rows,
            cells: frontCells
          },
          {
            sideType: 'back',
            sideLabel: 'Dorso',
            sheetNumber: k + 1,
            cols,
            rows,
            cells: backCells
          }
        ]
      });
    }
  } else if (geometry.formatId === 'single_sheet_zine') {
    paddedPageCount = Math.max(8, Math.ceil(totalPages / 8) * 8);
    const sheetCount = paddedPageCount / 8;

    cutLinesMm.push(
      makeLine(
        sheetWidthMm * 0.25,
        sheetHeightMm * 0.5,
        sheetWidthMm * 0.75,
        sheetHeightMm * 0.5,
        'cut',
        'Corte central horizontal entre cols 2 y 3'
      )
    );

    foldLinesMm.push(
      makeLine(sheetWidthMm * 0.25, 0, sheetWidthMm * 0.25, sheetHeightMm, 'fold', 'Pliegue vertical 1/4'),
      makeLine(sheetWidthMm * 0.5, 0, sheetWidthMm * 0.5, sheetHeightMm, 'fold', 'Pliegue vertical 1/2'),
      makeLine(sheetWidthMm * 0.75, 0, sheetWidthMm * 0.75, sheetHeightMm, 'fold', 'Pliegue vertical 3/4'),
      makeLine(0, sheetHeightMm * 0.5, sheetWidthMm * 0.25, sheetHeightMm * 0.5, 'fold', 'Pliegue horizontal exterior izquierdo'),
      makeLine(sheetWidthMm * 0.75, sheetHeightMm * 0.5, sheetWidthMm, sheetHeightMm * 0.5, 'fold', 'Pliegue horizontal exterior derecho')
    );

    for (let k = 0; k < sheetCount; k += 1) {
      const off = k * 8;
      const topRow = [off + 5, off + 4, off + 3, off + 2];
      const bottomRow = [off + 6, off + 7, off + 8, off + 1];
      const frontCells = [];

      for (let col = 0; col < 4; col += 1) {
        frontCells.push(
          buildCell({
            col,
            row: 0,
            xMm: col * pageWidthMm,
            yMm: 0,
            widthMm: pageWidthMm,
            heightMm: pageHeightMm,
            displayPageNumber: topRow[col],
            totalPages,
            normalizedPages,
            rotationDeg: 180
          })
        );
      }
      for (let col = 0; col < 4; col += 1) {
        frontCells.push(
          buildCell({
            col,
            row: 1,
            xMm: col * pageWidthMm,
            yMm: pageHeightMm,
            widthMm: pageWidthMm,
            heightMm: pageHeightMm,
            displayPageNumber: bottomRow[col],
            totalPages,
            normalizedPages,
            rotationDeg: 0
          })
        );
      }

      sheets.push({
        sheetNumber: k + 1,
        sheetIndex: k,
        sheetWidthMm: roundMm(sheetWidthMm),
        sheetHeightMm: roundMm(sheetHeightMm),
        sheetWidthPt: toPt(sheetWidthMm),
        sheetHeightPt: toPt(sheetHeightMm),
        sides: [
          {
            sideType: 'front',
            sideLabel: 'Frente (Simple Faz)',
            sheetNumber: k + 1,
            cols,
            rows,
            cells: frontCells
          }
        ]
      });
    }
  } else {
    // custom_nup: centered N-up grid with mirrored back columns for exact duplex registration
    offsetXMm = (sheetWidthMm - cols * pageWidthMm) / 2;
    offsetYMm = (sheetHeightMm - rows * pageHeightMm) / 2;

    const perSide = cols * rows;
    const perSheet = perSide * 2;
    paddedPageCount = Math.max(perSheet, Math.ceil(totalPages / perSheet) * perSheet);
    const sheetCount = paddedPageCount / perSheet;

    for (let c = 0; c <= cols; c += 1) {
      const x = offsetXMm + c * pageWidthMm;
      cutLinesMm.push(makeLine(x, 0, x, sheetHeightMm, 'cut', `Corte vertical ${c + 1}`));
    }
    for (let r = 0; r <= rows; r += 1) {
      const y = offsetYMm + r * pageHeightMm;
      cutLinesMm.push(makeLine(0, y, sheetWidthMm, y, 'cut', `Corte horizontal ${r + 1}`));
    }

    for (let k = 0; k < sheetCount; k += 1) {
      const sheetOffset = k * perSheet;
      const frontCells = [];
      const backCells = [];

      for (let idx = 0; idx < perSide; idx += 1) {
        const row = Math.floor(idx / cols);
        const colFront = idx % cols;
        const colBack = cols - 1 - colFront;

        const frontPageNum = sheetOffset + idx + 1;
        const backPageNum = sheetOffset + perSide + idx + 1;

        frontCells.push(
          buildCell({
            col: colFront,
            row,
            xMm: offsetXMm + colFront * pageWidthMm,
            yMm: offsetYMm + row * pageHeightMm,
            widthMm: pageWidthMm,
            heightMm: pageHeightMm,
            displayPageNumber: frontPageNum,
            totalPages,
            normalizedPages,
            rotationDeg: 0
          })
        );

        backCells.push(
          buildCell({
            col: colBack,
            row,
            xMm: offsetXMm + colBack * pageWidthMm,
            yMm: offsetYMm + row * pageHeightMm,
            widthMm: pageWidthMm,
            heightMm: pageHeightMm,
            displayPageNumber: backPageNum,
            totalPages,
            normalizedPages,
            rotationDeg: 0
          })
        );
      }

      // Order backCells cleanly by row then col for deterministic rendering
      backCells.sort((a, b) => (a.row - b.row) || (a.col - b.col));

      sheets.push({
        sheetNumber: k + 1,
        sheetIndex: k,
        sheetWidthMm: roundMm(sheetWidthMm),
        sheetHeightMm: roundMm(sheetHeightMm),
        sheetWidthPt: toPt(sheetWidthMm),
        sheetHeightPt: toPt(sheetHeightMm),
        sides: [
          {
            sideType: 'front',
            sideLabel: 'Frente',
            sheetNumber: k + 1,
            cols,
            rows,
            cells: frontCells
          },
          {
            sideType: 'back',
            sideLabel: 'Dorso (Espejado)',
            sheetNumber: k + 1,
            cols,
            rows,
            cells: backCells
          }
        ]
      });
    }
  }

  const sheetCount = sheets.length;
  const totalSheetSides = sheets.reduce((acc, s) => acc + s.sides.length, 0);

  return {
    paperId: geometry.paperId,
    formatId: geometry.formatId,
    geometry: {
      ...geometry,
      sheetWidthPt: toPt(sheetWidthMm),
      sheetHeightPt: toPt(sheetHeightMm),
      pageWidthPt: toPt(pageWidthMm),
      pageHeightPt: toPt(pageHeightMm)
    },
    sheetWidthMm: roundMm(sheetWidthMm),
    sheetHeightMm: roundMm(sheetHeightMm),
    sheetWidthPt: toPt(sheetWidthMm),
    sheetHeightPt: toPt(sheetHeightMm),
    pageWidthMm: roundMm(pageWidthMm),
    pageHeightMm: roundMm(pageHeightMm),
    pageWidthPt: toPt(pageWidthMm),
    pageHeightPt: toPt(pageHeightMm),
    offsetXMm: roundMm(offsetXMm),
    offsetYMm: roundMm(offsetYMm),
    offsetXPt: toPt(offsetXMm),
    offsetYPt: toPt(offsetYMm),
    cols,
    rows,
    duplex: geometry.duplex,
    flipEdge: geometry.flipEdge,
    requiresCut: geometry.requiresCut,
    totalInputPages: totalPages,
    totalPages,
    paddedPageCount,
    blankPaddingCount: Math.max(0, paddedPageCount - totalPages),
    sheetCount,
    totalSheetSides,
    sheets,
    cutLinesMm,
    foldLinesMm,
    printerSummary: buildPrinterSummary(geometry, sheetCount, totalPages, paddedPageCount),
    foldingGuide: buildFoldingGuide(geometry, sheetCount)
  };
}

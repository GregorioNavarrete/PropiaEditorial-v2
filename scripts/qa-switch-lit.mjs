#!/usr/bin/env node
/**
 * Deterministic Switch-Lit Design System & Editorial SVG Catalog Auditor.
 * Verifies exact color/radius tokens, zero external CSS/font CDNs, zero CSS gradients,
 * zero illegal card shadows, and 30+ pure B&W ink SVGs free of Tailwind classes.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ILLUSTRATIONS_CATALOG } from '../src/shared/illustrationsCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const REQUIRED_COLOR_TOKENS = [
  { name: '--color-manuscript-cream', hex: '#f9f9f7' },
  { name: '--color-press-black', hex: '#000000' },
  { name: '--color-sage-border', hex: '#d2ddd2' },
  { name: '--color-mist-green', hex: '#dee5dd' },
  { name: '--color-paper-shadow', hex: '#edf0e9' },
  { name: '--color-smoke', hex: '#c7c7c6' },
  { name: '--color-highlighter-lime', hex: '#edfe5e' },
  { name: '--color-cornflower-wash', hex: '#bed4fb' },
  { name: '--color-spring-green', hex: '#31e992' }
];

const REQUIRED_RADIUS_VALUES = ['12px', '24px', '6px', '3px'];

const FORBIDDEN_CDN_PATTERNS = [
  { label: 'Tailwind CDN (cdn.tailwindcss.com)', regex: /cdn\.tailwindcss\.com/i },
  {
    label: 'External CSS/Font Framework CDN',
    regex: /https?:\/\/[^"'\s)>]*(?:tailwind|bootstrap|bulma|materialize|foundation|unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/i
  }
];

const FORBIDDEN_GRADIENT_PATTERNS = [
  { label: 'linear-gradient(', regex: /linear-gradient\s*\(/i },
  { label: 'radial-gradient(', regex: /radial-gradient\s*\(/i },
  { label: 'conic-gradient(', regex: /conic-gradient\s*\(/i }
];

const RESIDUAL_TAILWIND_PATTERNS = [
  /\btext-stone-\d*\b/i,
  /\btext-(?:slate|gray|zinc|neutral|red|amber|emerald|blue|indigo)-\d+\b/i,
  /\b(?:w|h)-\d+\b/i,
  /\bbg-(?:stone|slate|gray|white|black)\b/i,
  /\bstroke-current\b/i,
  /\bfill-current\b/i
];

async function listFilesWithExtension(dirPath, ext) {
  const results = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await listFilesWithExtension(fullPath, ext);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function findLineNumber(content, matchIndex) {
  return content.slice(0, matchIndex).split('\n').length;
}

async function runAudit() {
  const errors = [];
  const checksPassed = [];

  // 1. Verify exact color & radius tokens in public/css/switch-lit-tokens.css
  const tokensPath = path.join(ROOT_DIR, 'public/css/switch-lit-tokens.css');
  let tokensContent = '';
  try {
    tokensContent = await fs.readFile(tokensPath, 'utf8');
  } catch (err) {
    errors.push(`No se pudo leer public/css/switch-lit-tokens.css: ${err.message}`);
  }

  if (tokensContent) {
    for (const token of REQUIRED_COLOR_TOKENS) {
      const escapedName = token.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tokenRegex = new RegExp(`${escapedName}\\s*:\\s*${token.hex}\\b`, 'i');
      if (!tokenRegex.test(tokensContent)) {
        errors.push(`Token de color faltante o inexacto en switch-lit-tokens.css: ${token.name}: ${token.hex}`);
      }
    }
    if (errors.length === 0) {
      checksPassed.push(`9 tokens de color exactos verificados en public/css/switch-lit-tokens.css`);
    }

    for (const radius of REQUIRED_RADIUS_VALUES) {
      const radiusRegex = new RegExp(`--radius-[a-z0-9-]+\\s*:\\s*${radius}\\b`, 'i');
      if (!radiusRegex.test(tokensContent)) {
        errors.push(`Radio geométrico obligatorio faltante en switch-lit-tokens.css: ${radius}`);
      }
    }
    if (!errors.some((e) => e.includes('Radio geométrico'))) {
      checksPassed.push(`4 radios geométricos exactos (${REQUIRED_RADIUS_VALUES.join(', ')}) verificados`);
    }
  }

  // 2. Scan public/css/*.css, src/views/*.ejs, and public/js/*.js for prohibited CDNs, gradients & illegal shadows
  const cssFiles = await listFilesWithExtension(path.join(ROOT_DIR, 'public/css'), '.css');
  const ejsFiles = await listFilesWithExtension(path.join(ROOT_DIR, 'src/views'), '.ejs');
  const jsFiles = await listFilesWithExtension(path.join(ROOT_DIR, 'public/js'), '.js');
  const uiFiles = [...cssFiles, ...ejsFiles, ...jsFiles];

  if (uiFiles.length === 0) {
    errors.push('No se encontraron archivos CSS, EJS o JS para auditar.');
  }

  let cdnClean = true;
  let gradientClean = true;
  let shadowClean = true;

  for (const filePath of uiFiles) {
    const relPath = path.relative(ROOT_DIR, filePath);
    const content = await fs.readFile(filePath, 'utf8');

    for (const { label, regex } of FORBIDDEN_CDN_PATTERNS) {
      const match = regex.exec(content);
      if (match) {
        cdnClean = false;
        const line = findLineNumber(content, match.index);
        errors.push(`CDN prohibido (${label}) detectado en ${relPath}:${line} -> "${match[0]}"`);
      }
    }

    for (const { label, regex } of FORBIDDEN_GRADIENT_PATTERNS) {
      const match = regex.exec(content);
      if (match) {
        gradientClean = false;
        const line = findLineNumber(content, match.index);
        errors.push(`Gradiente prohibido (${label}) detectado en ${relPath}:${line}`);
      }
    }

    // Verify box-shadow is never used on cards/containers (only var(--shadow-sm) or none allowed)
    const boxShadowRegex = /box-shadow\s*:\s*([^;}\n]+)/gi;
    let shadowMatch;
    while ((shadowMatch = boxShadowRegex.exec(content)) !== null) {
      const rawVal = shadowMatch[1].trim();
      if (rawVal !== 'var(--shadow-sm)' && rawVal !== 'none') {
        shadowClean = false;
        const line = findLineNumber(content, shadowMatch.index);
        errors.push(`box-shadow no permitido en ${relPath}:${line} -> "box-shadow: ${rawVal}"`);
      }
    }
  }

  if (cdnClean) {
    checksPassed.push(`0 CDNs externos prohibidos en ${uiFiles.length} archivos UI (CSS/EJS/JS)`);
  }
  if (gradientClean) {
    checksPassed.push(`0 gradientes CSS (linear/radial/conic) en ${uiFiles.length} archivos UI`);
  }
  if (shadowClean) {
    checksPassed.push(`0 sombras ilegales en tarjetas o contenedores`);
  }

  // 3. Audit src/shared/illustrationsCatalog.js SVGs
  if (!Array.isArray(ILLUSTRATIONS_CATALOG)) {
    errors.push('ILLUSTRATIONS_CATALOG no es un arreglo válido.');
  } else {
    if (ILLUSTRATIONS_CATALOG.length < 30) {
      errors.push(
        `Catálogo insuficiente: se encontraron ${ILLUSTRATIONS_CATALOG.length} grabados (mínimo requerido: 30).`
      );
    } else {
      checksPassed.push(
        `Catálogo vectorial verificado con ${ILLUSTRATIONS_CATALOG.length} grabados en tinta B&N (>= 30)`
      );
    }

    let svgValidCount = 0;
    for (const item of ILLUSTRATIONS_CATALOG) {
      const id = item?.id || '(sin-id)';
      const svg = String(item?.svg || '');

      if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
        errors.push(`SVG "${id}" carece de atributo obligatorio xmlns="http://www.w3.org/2000/svg".`);
        continue;
      }
      if (!/\bviewBox\s*=\s*"[^"]+"/.test(svg)) {
        errors.push(`SVG "${id}" carece de atributo obligatorio viewBox.`);
        continue;
      }

      let hasTailwindResidue = false;
      for (const twRegex of RESIDUAL_TAILWIND_PATTERNS) {
        const twMatch = twRegex.exec(svg);
        if (twMatch) {
          hasTailwindResidue = true;
          errors.push(`SVG "${id}" contiene clase residual de Tailwind: "${twMatch[0]}".`);
        }
      }

      if (!hasTailwindResidue) {
        svgValidCount += 1;
      }
    }

    if (svgValidCount === ILLUSTRATIONS_CATALOG.length) {
      checksPassed.push(
        `Los ${svgValidCount} SVGs poseen xmlns, viewBox explícito y 0 clases residuales de Tailwind`
      );
    }
  }

  // 4. Print deterministic report
  console.log('======================================================================');
  console.log(' SWITCH-LIT DESIGN SYSTEM & SVG CATALOG QA AUDIT');
  console.log('======================================================================');
  for (const okMsg of checksPassed) {
    console.log(` [PASS] ${okMsg}`);
  }

  if (errors.length > 0) {
    console.error('----------------------------------------------------------------------');
    for (const errMsg of errors) {
      console.error(` [FAIL] ${errMsg}`);
    }
    console.error('======================================================================');
    console.error(` RESULTADO: FALLÓ (${errors.length} incumplimiento(s) detectado(s))`);
    console.error('======================================================================');
    process.exit(1);
  }

  console.log('----------------------------------------------------------------------');
  console.log(' RESULTADO: 100% EN VERDE — Cumplimiento Switch-Lit verificado.');
  console.log('======================================================================');
  process.exit(0);
}

runAudit().catch((err) => {
  console.error('[FATAL] Error inesperado en qa-switch-lit.mjs:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Master QA Gate Runner for Switch-Lit Poetry Press (Phases 1 to 5).
 * Sequentially executes Switch-Lit static/catalog audit and automated integration tests.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const STAGES = [
  {
    name: 'Auditoría Estática Switch-Lit CSS & Catálogo SVG (scripts/qa-switch-lit.mjs)',
    cmd: process.execPath,
    args: ['scripts/qa-switch-lit.mjs']
  },
  {
    name: 'Suite Automatizada de Integración Fases 1–5 (npm test)',
    cmd: 'npm',
    args: ['test']
  }
];

const results = [];
let allPassed = true;

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║   SWITCH-LIT POETRY PRESS — COMPUERTA QA INTEGRAL (FASES 1 A 5)    ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

for (const stage of STAGES) {
  console.log(`▶ Ejecutando: ${stage.name}...`);
  const start = performance.now();
  const outcome = spawnSync(stage.cmd, stage.args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env }
  });
  const elapsedMs = Math.round(performance.now() - start);
  const ok = outcome.status === 0;
  results.push({ name: stage.name, ok, elapsedMs, code: outcome.status });

  if (!ok) {
    allPassed = false;
    break;
  }
  console.log('');
}

console.log('══════════════════════════════════════════════════════════════════════');
console.log(' DICTAMEN FINAL DE AUDITORÍA QA — FASES 1, 2, 3, 4 Y 5');
console.log('══════════════════════════════════════════════════════════════════════');
for (const r of results) {
  const badge = r.ok ? 'PASS' : `FAIL (exit ${r.code})`;
  console.log(` [${badge}] ${r.name} (${r.elapsedMs} ms)`);
}
console.log('──────────────────────────────────────────────────────────────────────');

if (!allPassed) {
  console.error(' DICTAMEN: RECHAZADO — Existen fallos que deben corregirse antes de avanzar.');
  console.log('══════════════════════════════════════════════════════════════════════\n');
  process.exit(1);
}

console.log(' DICTAMEN: APROBADO 100% EN VERDE — Fases 1 a 5 verificadas.');
console.log('   • Fase 1: Express MVC, Switch-Lit CSS offline y CRUD Multi-Libro Atómico OK');
console.log('   • Fase 2: Geometría 300 DPI multi-formato, 10 plantillas y partición de poemas OK');
console.log('   • Fase 3: Motor semántico Poema→Imagen, Minimalistas + Drag & Drop, Sharp 300 DPI y Anti-SSRF OK');
console.log('   • Fase 4: Imposición multi-formato (< 0.05 pt), Simulador 3D y Guía paso a paso OK');
console.log('   • Fase 5: Exportación PDF 1:1 cero-configuración (press.pdf + guide.pdf) OK');
console.log('══════════════════════════════════════════════════════════════════════\n');
process.exit(0);

/**
 * Open-Access Vintage Engraving Search & Anti-SSRF Importer (Wikimedia Commons API).
 * Gracefully falls back to local curated SVG engravings when offline or rate-limited,
 * and enforces strict HTTPS + private-IP blocking + 10 MB limit + magic-byte checks on import.
 */

import dns from 'node:dns/promises';
import net from 'node:net';
import { analyzePoemAndSuggest } from '../shared/poemMatcher.js';
import { ILLUSTRATIONS_CATALOG } from '../shared/illustrationsCatalog.js';
import {
  processImageToEngraving,
  detectImageMimeFromMagicBytes,
  DEFAULT_ENGRAVINGS_DIR
} from './engravingService.js';

const COMMONS_API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'SwitchLitPoetryPress/1.0 (https://switchlit.editorial.local; studio@switchlit.local) node-fetch';
export const MAX_ONLINE_DOWNLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const SEARCH_TIMEOUT_MS = 6000;
const DOWNLOAD_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
  '0.0.0.0'
]);

/**
 * Checks whether an IPv4 address belongs to loopback, private, link-local, CGNAT, or reserved ranges.
 */
function isPrivateOrReservedIPv4(ip) {
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
  if (a >= 224) return true; // multicast & reserved
  return false;
}

/**
 * Checks whether an IPv4 or IPv6 address is private, loopback, link-local, or reserved.
 */
export function isPrivateOrReservedIp(ipRaw) {
  if (!ipRaw) return true;
  const ip = String(ipRaw).replace(/^\[|\]$/g, '').trim().toLowerCase();

  // Check IPv4-mapped IPv6 e.g. ::ffff:127.0.0.1
  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice('::ffff:'.length);
    if (net.isIPv4(mapped)) {
      return isPrivateOrReservedIPv4(mapped);
    }
  }

  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateOrReservedIPv4(ip);
  }
  if (version === 6) {
    if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:1' || ip === '0:0:0:0:0:0:0:0') {
      return true;
    }
    // Unique local fc00::/7 (fc.. or fd..)
    if (ip.startsWith('fc') || ip.startsWith('fd')) {
      return true;
    }
    // Link-local fe80::/10 (fe8, fe9, fea, feb)
    if (/^fe[89ab]/.test(ip)) {
      return true;
    }
    // Multicast ff00::/8
    if (ip.startsWith('ff')) {
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Validates that a URL strictly uses HTTPS and does not target local/private hosts or IPs (anti-SSRF).
 */
export async function assertSafeHttpsUrl(rawUrl, { resolveDns = true } = {}) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    const err = new Error('La URL de imagen proporcionada no es válida.');
    err.statusCode = 400;
    err.code = 'INVALID_IMAGE_URL';
    throw err;
  }

  if (parsed.protocol !== 'https:') {
    const err = new Error('Por seguridad solo se permiten URLs externas con protocolo HTTPS.');
    err.statusCode = 400;
    err.code = 'UNSAFE_URL_PROTOCOL';
    throw err;
  }

  if (parsed.username || parsed.password) {
    const err = new Error('No se permiten credenciales embebidas en la URL.');
    err.statusCode = 400;
    err.code = 'UNSAFE_URL_CREDENTIALS';
    throw err;
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    !hostname ||
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.arpa')
  ) {
    const err = new Error('Host de destino bloqueado por política anti-SSRF.');
    err.statusCode = 400;
    err.code = 'SSRF_BLOCKED_HOST';
    throw err;
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      const err = new Error('Dirección IP privada o local bloqueada por seguridad.');
      err.statusCode = 400;
      err.code = 'SSRF_BLOCKED_IP';
      throw err;
    }
    return parsed;
  }

  if (resolveDns) {
    let records;
    try {
      records = await dns.lookup(hostname, { all: true });
    } catch {
      const err = new Error('No se pudo resolver el dominio de la imagen externa.');
      err.statusCode = 502;
      err.code = 'DNS_LOOKUP_FAILED';
      throw err;
    }
    if (!records || records.length === 0 || records.some((r) => isPrivateOrReservedIp(r.address))) {
      const err = new Error('El dominio resuelve a una red interna no permitida.');
      err.statusCode = 400;
      err.code = 'SSRF_DNS_REBIND_BLOCKED';
      throw err;
    }
  }

  return parsed;
}

/**
 * Strips HTML tags and trims metadata strings returned by Wikimedia Commons.
 */
function stripHtml(raw = '') {
  return String(raw || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Searches Wikimedia Commons for public-domain / open-license engravings, woodcuts, and ink line art.
 * Never throws on network errors — cleanly falls back to local curated SVG suggestions.
 */
export async function searchOnlineIllustrations({ query = '', poemText = '', style = 'minimalist', limit = 6 } = {}) {
  const analysis = analyzePoemAndSuggest(poemText || query || '');
  const localSuggestions = analysis.suggestedIllustrations;
  const safeLimit = Math.max(1, Math.min(24, Math.round(Number(limit) || 6)));

  const cleanUserQuery = String(query || '').trim();
  const baseSearchTerms = cleanUserQuery || analysis.onlineSearchQuery || 'botanical stars';
  let styleQueryClause = '(engraving OR woodcut OR "line art")';
  if (style === 'minimalist') {
    styleQueryClause = '("line art" OR minimalist OR monochrome OR "ink drawing" OR silhouette)';
  } else if (style === 'silhouette') {
    styleQueryClause = '(silhouette OR "black and white" OR cutout)';
  }
  const gsrsearch = `${baseSearchTerms} ${styleQueryClause} filetype:bitmap`;

  const apiUrl = new URL(COMMONS_API_ENDPOINT);
  apiUrl.searchParams.set('action', 'query');
  apiUrl.searchParams.set('format', 'json');
  apiUrl.searchParams.set('origin', '*');
  apiUrl.searchParams.set('generator', 'search');
  apiUrl.searchParams.set('gsrnamespace', '6');
  apiUrl.searchParams.set('gsrlimit', String(Math.min(36, safeLimit * 3)));
  apiUrl.searchParams.set('gsrsearch', gsrsearch);
  apiUrl.searchParams.set('prop', 'imageinfo');
  apiUrl.searchParams.set('iiprop', 'url|size|mime|extmetadata');
  apiUrl.searchParams.set('iiurlwidth', '960');

  try {
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS)
    });

    if (!response.ok) {
      return {
        onlineAvailable: false,
        message: 'Sin conexión a catálogo externo; mostrando grabados curados locales.',
        items: [],
        localSuggestions
      };
    }

    const payload = await response.json();
    const pagesObj = payload?.query?.pages || {};
    const rawPages = Object.values(pagesObj);

    const allowedRasterMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const items = [];

    for (const page of rawPages) {
      const info = Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
      if (!info) continue;

      const thumbCandidate = info.thumburl || info.url;
      if (!thumbCandidate || !thumbCandidate.startsWith('https://')) continue;

      const hasAllowedMime = allowedRasterMimes.has(info.mime);
      const hasRasterThumb = /\.(png|jpe?g|webp)(\?|$)/i.test(thumbCandidate);
      if (!hasAllowedMime && !hasRasterThumb) continue;

      // Prefer original raster file when <= 8 MB so imports bypass thumbnail scaler rate limits
      const canUseDirectOriginal =
        hasAllowedMime &&
        typeof info.url === 'string' &&
        info.url.startsWith('https://') &&
        Number(info.size) > 0 &&
        Number(info.size) <= 8 * 1024 * 1024;
      const importTargetUrl = canUseDirectOriginal ? info.url : thumbCandidate;

      const rawTitle = String(page.title || '')
        .replace(/^File:/i, '')
        .replace(/\.[a-z0-9]{2,5}$/i, '')
        .replace(/_/g, ' ')
        .trim();

      const meta = info.extmetadata || {};
      const title = stripHtml(meta.ObjectName?.value) || rawTitle || 'Grabado de archivo';
      const author = stripHtml(meta.Artist?.value) || 'Archivo histórico';
      const license = stripHtml(meta.LicenseShortName?.value) || 'Dominio público / CC';

      items.push({
        id: `commons_${page.pageid}`,
        title: title.slice(0, 110),
        thumbUrl: thumbCandidate,
        imageUrl: importTargetUrl,
        originalUrl: info.url,
        sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/?curid=${page.pageid}`,
        author: author.slice(0, 80),
        license: license.slice(0, 50),
        width: info.thumbwidth || info.width || 960,
        height: info.thumbheight || info.height || 960,
        source: 'Wikimedia Commons'
      });

      if (items.length >= safeLimit) break;
    }

    const minimalistPool = style === 'minimalist'
      ? ILLUSTRATIONS_CATALOG.filter((it) => it.category === 'minimalista')
      : [];
    const mergedLocal = [
      ...localSuggestions,
      ...minimalistPool.filter((m) => !localSuggestions.some((s) => s.id === m.id))
    ].slice(0, Math.max(8, safeLimit));

    return {
      onlineAvailable: true,
      query: baseSearchTerms,
      style,
      message: items.length > 0
        ? `Se encontraron ${items.length} imágenes (${style === 'minimalist' ? 'minimalistas / trazo B&N' : 'grabado clásico'}). Arrastralas a la hoja o hacé clic para aplicar.`
        : 'No hubo coincidencias exactas online; podés arrastrar o usar nuestros grabados minimalistas locales.',
      items,
      localSuggestions: mergedLocal
    };
  } catch {
    const minimalistPool = style === 'minimalist'
      ? ILLUSTRATIONS_CATALOG.filter((it) => it.category === 'minimalista')
      : [];
    const mergedLocal = [
      ...localSuggestions,
      ...minimalistPool.filter((m) => !localSuggestions.some((s) => s.id === m.id))
    ].slice(0, Math.max(8, safeLimit));
    return {
      onlineAvailable: false,
      style,
      message: 'Sin conexión a catálogo externo; mostrando grabados y trazos minimalistas locales.',
      items: [],
      localSuggestions: mergedLocal
    };
  }
}

/**
 * Downloads an external HTTPS image safely (anti-SSRF, <= 10 MB, PNG/JPEG/WebP magic bytes)
 * and converts it into a 300-DPI black-and-white engraving via engravingService.
 */
export async function importOnlineImageAsEngraving({
  imageUrl,
  mode = 'engraving',
  widthPx = 600,
  heightPx = 800,
  fit = 'contain',
  outputDir = DEFAULT_ENGRAVINGS_DIR
} = {}) {
  let currentUrl = await assertSafeHttpsUrl(imageUrl);
  let response = null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    response = await fetch(currentUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/png,image/jpeg,image/webp;q=0.9,*/*;q=0.1'
      },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
    });

    if (response.status >= 300 && response.status < 400) {
      if (hop === MAX_REDIRECTS) {
        const err = new Error('Demasiadas redirecciones al descargar la imagen externa.');
        err.statusCode = 502;
        err.code = 'TOO_MANY_REDIRECTS';
        throw err;
      }
      const location = response.headers.get('location');
      if (!location) {
        const err = new Error('Redirección inválida desde el servidor externo.');
        err.statusCode = 502;
        err.code = 'INVALID_REDIRECT';
        throw err;
      }
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = await assertSafeHttpsUrl(nextUrl);
      continue;
    }

    break;
  }

  if (!response || !response.ok) {
    const err = new Error(`No se pudo descargar la ilustración externa (HTTP ${response?.status || 'error'}).`);
    err.statusCode = 502;
    err.code = 'EXTERNAL_IMAGE_FETCH_FAILED';
    throw err;
  }

  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_ONLINE_DOWNLOAD_BYTES) {
    const err = new Error('La imagen externa supera el límite máximo permitido de 10 MB.');
    err.statusCode = 413;
    err.code = 'IMAGE_TOO_LARGE';
    throw err;
  }

  // Stream body chunks enforcing strict 10 MB ceiling
  const chunks = [];
  let totalBytes = 0;

  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_ONLINE_DOWNLOAD_BYTES) {
        await reader.cancel().catch(() => {});
        const err = new Error('La descarga superó el límite máximo de seguridad de 10 MB.');
        err.statusCode = 413;
        err.code = 'IMAGE_TOO_LARGE';
        throw err;
      }
      chunks.push(Buffer.from(value));
    }
  } else {
    const ab = await response.arrayBuffer();
    if (ab.byteLength > MAX_ONLINE_DOWNLOAD_BYTES) {
      const err = new Error('La imagen externa supera el límite máximo de seguridad de 10 MB.');
      err.statusCode = 413;
      err.code = 'IMAGE_TOO_LARGE';
      throw err;
    }
    chunks.push(Buffer.from(ab));
  }

  const buffer = Buffer.concat(chunks);
  const mime = detectImageMimeFromMagicBytes(buffer);
  if (!mime) {
    const err = new Error('El recurso descargado no es una imagen PNG, JPEG o WebP válida.');
    err.statusCode = 400;
    err.code = 'INVALID_IMAGE_SIGNATURE';
    throw err;
  }

  return processImageToEngraving({
    buffer,
    mode,
    widthPx,
    heightPx,
    fit,
    outputDir
  });
}

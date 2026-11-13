import { esc } from './dom.js';

/**
 * Ilustrações de demonstração (SVG embutido, sem arquivos externos). São usadas:
 *  - no protótipo do Claude Artifact, que bloqueia imagens de outros sites;
 *  - como reserva quando um produto não tem foto ou a foto não carrega.
 * Não são fotos dos produtos: na loja publicada aparece a foto real de cada item.
 */
const PALETTES = [
  ['#f6d2cb', '#e9a79f', '#8f4e3d'],
  ['#f8dfd3', '#e8b49b', '#8a4a38'],
  ['#f3d3d6', '#dc9ba3', '#7f3f4a'],
  ['#f5dccb', '#d9a98a', '#80472f'],
  ['#efd6d0', '#cf9d92', '#76413a'],
  ['#fbe3dc', '#efb6aa', '#93473c'],
];
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const ART = {
  lips: (c) => `<rect x="34" y="40" width="32" height="42" rx="9" fill="#fff" opacity=".93"/><rect x="38" y="56" width="24" height="22" rx="6" fill="${c}" opacity=".85"/><rect x="31" y="28" width="38" height="16" rx="6" fill="#3a1f19"/><path d="M47 28V14c0-3 6-3 6 0v14z" fill="${c}"/><ellipse cx="50" cy="13" rx="6" ry="4" fill="#fff" opacity=".7"/>`,
  face: (c) => `<rect x="16" y="26" width="68" height="54" rx="14" fill="#3a1f19"/><rect x="16" y="26" width="68" height="20" rx="12" fill="#fff" opacity=".9"/><circle cx="50" cy="60" r="19" fill="${c}"/><circle cx="50" cy="60" r="19" fill="none" stroke="#fff" stroke-width="2.5" opacity=".8"/><path d="M40 55c3-5 11-7 18-3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".65"/>`,
  eyes: (c) => `<rect x="18" y="30" width="64" height="42" rx="8" fill="#3a1f19"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${30 + (i % 3) * 20}" cy="${43 + Math.floor(i / 3) * 18}" r="7.4" fill="${i % 2 ? c : '#fff'}" opacity="${i % 2 ? 0.85 : 0.9}"/>`).join('')}`,
  tools: (c) => `<rect x="46" y="44" width="8" height="42" rx="4" fill="#3a1f19"/><rect x="44" y="40" width="12" height="9" rx="2" fill="#e8d2c7"/><path d="M50 12c9 8 11 20 6 29h-12c-5-9-3-21 6-29z" fill="#fff" opacity=".92"/><path d="M50 18c5 6 6 14 3 21h-6c-3-7-2-15 3-21z" fill="${c}" opacity=".8"/>`,
  moon: () => `<path d="M62 56a22 22 0 1 1-20-31 17 17 0 0 0 20 31z" fill="#fff" opacity=".9"/>`,
};
const KIND = (category = '') => {
  const k = category.toLowerCase();
  if (/l[áa]bio|gloss|batom|boca/.test(k)) return 'lips';
  if (/rosto|face|blush|base/.test(k)) return 'face';
  if (/olho|sobrancelha/.test(k)) return 'eyes';
  if (/acess|pinc|esponja|brinco/.test(k)) return 'tools';
  return 'moon';
};

/** Cartão ilustrado elegante. `name` varia levemente a cor entre produtos. */
export function placeholderHtml(category = '', name = '') {
  const [a, b, ink] = PALETTES[hash(name || category) % PALETTES.length];
  const kind = KIND(category);
  const spark = '<path d="M84 16c.7 5 2.3 6.6 7.3 7.3-5 .7-6.6 2.3-7.3 7.3-.7-5-2.3-6.6-7.3-7.3 5-.7 6.6-2.3 7.3-7.3z" fill="#fff" opacity=".85"/>';
  return `<div class="ph" role="img" aria-label="Ilustração de ${esc(category || 'produto')}, sem foto" style="--ph-a:${a};--ph-b:${b};--ph-ink:${ink}"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${ART[kind](b)}${spark}</svg><span>${esc(category || 'Luar Make Up')}</span></div>`;
}

/**
 * Foto do produto. No protótipo (Artifact) imagens externas são bloqueadas pelo ambiente,
 * então aparece a ilustração; nos outros modos a foto é carregada e, se falhar,
 * a ilustração entra no lugar (listener de "error" abaixo).
 */
export function productImageHtml(p, mode) {
  const url = p.image_url || '';
  const blocked = mode === 'prototype' && url && !url.startsWith('blob:');
  if (!url || blocked) return placeholderHtml(p.category, p.name);
  return `<img src="${esc(url)}" alt="${esc(p.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-cat="${esc(p.category || '')}" data-name="${esc(p.name)}">`;
}

/** Troca uma <img> quebrada pela ilustração. */
export function installImageFallback() {
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.dataset && 'cat' in t.dataset) t.outerHTML = placeholderHtml(t.dataset.cat, t.dataset.name || '');
  }, true);
}

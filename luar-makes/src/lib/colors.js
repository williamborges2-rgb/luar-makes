/**
 * Cores por produto. A maioria dos produtos da loja tem (um batom, um blusher...), mas não
 * todos (esponjas, pincéis). Lista opcional de opções: [{ name, hex }]. `hex` é opcional —
 * sem ele a opção aparece só como texto, sem a bolinha colorida.
 */
export const MAX_COLORS = 10;
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normaliza uma lista de cores vinda do formulário ou do banco: remove vazias e duplicadas,
 * corta nomes longos, valida o hex e limita a quantidade. Nunca lança erro. */
export function normalizeColors(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const c of raw) {
    if (out.length >= MAX_COLORS) break;
    const name = String((c && c.name) ?? c ?? '').trim().slice(0, 30);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const hexRaw = String((c && c.hex) ?? '').trim();
    const hex = HEX_RE.test(hexRaw) ? hexRaw : null;
    out.push({ name, hex });
  }
  return out;
}

export function hasColors(p) {
  return Array.isArray(p?.colors) && p.colors.length > 0;
}

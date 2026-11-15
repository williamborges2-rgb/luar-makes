import { PRICE_CENTS, MAX_QTY } from '../config.js';

/**
 * Cálculo do carrinho: total = quantidade de itens × R$ 10,00.
 * Tudo em centavos inteiros, sem ponto flutuante.
 * lines: [{ id, productId, name, color, qty }]
 * `id` é a chave da linha (produto + cor); `productId` é o id real do produto, usado para
 * reencontrar o produto no catálogo (dois tons do mesmo produto viram duas linhas).
 */
export function cartTotals(lines) {
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotalCents = count * PRICE_CENTS;
  return { count, subtotalCents, totalCents: subtotalCents };
}

export function lineTotalCents(line) {
  return line.qty * PRICE_CENTS;
}

/** Quantidade entre 0 e 99 (ou o limite do estoque, se houver). */
export function clampQty(q, max = null) {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n)) return 1;
  const cap = max === null || max === undefined ? MAX_QTY : Math.min(MAX_QTY, max);
  return Math.max(0, Math.min(cap, n));
}

const KEY = 'luar-makes-cart-v2';

/** Chave da linha: mesmo produto em cores diferentes vira linhas separadas no carrinho. */
function lineKey(productId, color) { return color ? `${productId}::${color}` : productId; }

/**
 * Carrinho com persistência leve no navegador (só conveniência da cliente: se ela for ao
 * WhatsApp e voltar, o carrinho continua). Cada linha guarda `max`: o limite de estoque
 * informado pela loja (null = sem limite); e `color`, quando o produto tem cor escolhida.
 */
export function createCart() {
  let lines = [];
  const subs = new Set();

  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(raw)) {
      lines = raw
        .filter((l) => l && typeof l.id === 'string' && typeof l.name === 'string')
        .map((l) => {
          const max = Number.isInteger(l.max) && l.max >= 0 ? l.max : null;
          const color = typeof l.color === 'string' && l.color ? l.color : null;
          const productId = typeof l.productId === 'string' && l.productId ? l.productId : l.id;
          return { id: l.id, productId, name: l.name, color, category: l.category || '', image_url: l.image_url || '', max, qty: clampQty(l.qty, max) };
        })
        .filter((l) => l.qty > 0);
    }
  } catch { /* sem storage: segue só em memória */ }

  const emit = () => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* ignora */ }
    subs.forEach((fn) => fn(lines));
  };
  const maxOf = (p) => (p.stock === null || p.stock === undefined ? null : Math.max(0, p.stock));
  const pidOf = (l) => l.productId || l.id;
  /** Soma a quantidade das linhas de um mesmo produto (outras cores incluídas), opcionalmente
   * ignorando uma linha (a que está sendo alterada), para checar o estoque compartilhado entre cores. */
  const totalFor = (productId, excludeId = null) =>
    lines.filter((l) => pidOf(l) === productId && l.id !== excludeId).reduce((n, l) => n + l.qty, 0);
  /** Recalcula `max` de cada linha do produto = estoque − o que as OUTRAS cores já ocupam, para
   * que o limite de estoque seja do produto como um todo, não de cada cor isoladamente. */
  const applyShared = (productId, rawMax) => {
    for (const l of lines) {
      if (pidOf(l) !== productId) continue;
      l.max = rawMax === null ? null : Math.max(0, rawMax - totalFor(productId, l.id));
    }
  };

  return {
    get lines() { return lines; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    /** Devolve { ok:true } ou { ok:false, max } quando já está no limite do estoque (contando
     * as unidades de todas as cores desse produto no carrinho).
     * `color` é o nome da cor escolhida (ou null, para produto sem opção de cor). */
    add(p, color = null) {
      const rawMax = maxOf(p);
      const id = lineKey(p.id, color);
      const found = lines.find((l) => l.id === id);
      const current = found ? found.qty : 0;
      if (rawMax !== null && totalFor(p.id, id) + current >= rawMax) return { ok: false, max: rawMax };
      if (found) found.qty = current + 1;
      else lines.push({ id, productId: p.id, name: p.name, color, category: p.category || '', image_url: p.image_url || '', max: rawMax, qty: 1 });
      applyShared(p.id, rawMax);
      emit();
      return { ok: true };
    },
    setQty(id, qty) {
      const cur = lines.find((l) => l.id === id);
      if (!cur) return;
      const productId = pidOf(cur);
      const rawMax = cur.max === null ? null : cur.max + totalFor(productId, id);
      const q = clampQty(qty, cur.max);
      lines = q === 0 ? lines.filter((l) => l.id !== id) : lines.map((l) => (l.id === id ? { ...l, qty: q } : l));
      if (rawMax !== null) applyShared(productId, rawMax);
      emit();
    },
    remove(id) { lines = lines.filter((l) => l.id !== id); emit(); },
    clear() { lines = []; emit(); },
    /** Mantém só itens que ainda existem e podem ser comprados; atualiza nome, foto e limite de
     * estoque — dividindo o estoque entre as cores já no carrinho quando ele cai. */
    reconcile(products) {
      const byId = new Map(products.map((p) => [p.id, p]));
      const left = new Map(); // productId -> estoque ainda não alocado a uma linha já processada
      const next = [];
      for (const l of lines) {
        const pid = pidOf(l);
        const p = byId.get(pid);
        if (!p || !p.available) continue;
        const rawMax = maxOf(p);
        if (rawMax === 0) continue;
        let qty = clampQty(l.qty, rawMax);
        if (rawMax !== null) {
          if (!left.has(pid)) left.set(pid, rawMax);
          qty = Math.min(qty, left.get(pid));
          left.set(pid, left.get(pid) - qty);
        }
        if (qty <= 0) continue;
        next.push({ ...l, name: p.name, category: p.category, image_url: p.image_url || '', max: null, qty });
      }
      for (const l of next) {
        const p = byId.get(pidOf(l));
        const rawMax = p ? maxOf(p) : null;
        l.max = rawMax === null ? null : Math.max(0, rawMax - next.filter((x) => x !== l && pidOf(x) === pidOf(l)).reduce((n, x) => n + x.qty, 0));
      }
      const changed = JSON.stringify(next) !== JSON.stringify(lines);
      lines = next;
      if (changed) emit();
      return changed;
    },
    totals() { return cartTotals(lines); },
  };
}

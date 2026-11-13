import { PRICE_CENTS, MAX_QTY } from '../config.js';

/**
 * Cálculo do carrinho: total = quantidade de itens × R$ 10,00.
 * Tudo em centavos inteiros, sem ponto flutuante.
 * lines: [{ id, name, qty }]
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

/**
 * Carrinho com persistência leve no navegador (só conveniência da cliente: se ela for ao
 * WhatsApp e voltar, o carrinho continua). Cada linha guarda `max`: o limite de estoque
 * informado pela loja (null = sem limite).
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
          return { id: l.id, name: l.name, category: l.category || '', image_url: l.image_url || '', max, qty: clampQty(l.qty, max) };
        })
        .filter((l) => l.qty > 0);
    }
  } catch { /* sem storage: segue só em memória */ }

  const emit = () => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* ignora */ }
    subs.forEach((fn) => fn(lines));
  };
  const maxOf = (p) => (p.stock === null || p.stock === undefined ? null : Math.max(0, p.stock));

  return {
    get lines() { return lines; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    /** Devolve { ok:true } ou { ok:false, max } quando já está no limite do estoque. */
    add(p) {
      const max = maxOf(p);
      const found = lines.find((l) => l.id === p.id);
      const current = found ? found.qty : 0;
      if (max !== null && current >= max) return { ok: false, max };
      if (found) { found.qty = current + 1; found.max = max; }
      else lines.push({ id: p.id, name: p.name, category: p.category || '', image_url: p.image_url || '', max, qty: 1 });
      emit();
      return { ok: true };
    },
    setQty(id, qty) {
      const cur = lines.find((l) => l.id === id);
      if (!cur) return;
      const q = clampQty(qty, cur.max);
      lines = q === 0 ? lines.filter((l) => l.id !== id) : lines.map((l) => (l.id === id ? { ...l, qty: q } : l));
      emit();
    },
    remove(id) { lines = lines.filter((l) => l.id !== id); emit(); },
    clear() { lines = []; emit(); },
    /** Mantém só itens que ainda existem e podem ser comprados; atualiza nome, foto e limite de estoque. */
    reconcile(products) {
      const byId = new Map(products.map((p) => [p.id, p]));
      const next = [];
      for (const l of lines) {
        const p = byId.get(l.id);
        const max = p ? maxOf(p) : null;
        if (!p || !p.available || max === 0) continue;
        next.push({ ...l, name: p.name, category: p.category, image_url: p.image_url || '', max, qty: clampQty(l.qty, max) });
      }
      const changed = JSON.stringify(next) !== JSON.stringify(lines);
      lines = next;
      if (changed) emit();
      return changed;
    },
    totals() { return cartTotals(lines); },
  };
}

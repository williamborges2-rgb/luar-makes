/**
 * Estoque. `stock` pode ser:
 *  - null  -> a dona não informou: não há limite no carrinho (é o caso dos exemplos);
 *  - número (0, 1, 2...) -> unidades disponíveis; o carrinho nunca passa disso.
 */
export const hasStockInfo = (p) => p.stock !== null && p.stock !== undefined;

/** Pode ser comprado agora? */
export const isOrderable = (p) => !!p.available && (!hasStockInfo(p) || p.stock > 0);

/** 'out' (esgotado) | 'low' (poucas unidades) | 'ok' | 'untracked' */
export function stockState(p, threshold) {
  if (!hasStockInfo(p)) return 'untracked';
  if (p.stock <= 0) return 'out';
  return p.stock <= threshold ? 'low' : 'ok';
}

/** Para o painel: alerta se o estoque informado está no limite ou abaixo (inclui zero). */
export const isLowStock = (p, threshold) => hasStockInfo(p) && p.stock <= threshold;

/** Limite de unidades que a cliente pode pôr no carrinho (null = sem limite). */
export const maxQtyFor = (p) => (hasStockInfo(p) ? Math.max(0, p.stock) : null);

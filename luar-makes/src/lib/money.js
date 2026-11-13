import { PRICE_CENTS } from '../config.js';

const nf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1000 -> "R$ 10,00" (espaço comum, para funcionar bem no WhatsApp). */
export function formatBRL(cents) {
  return 'R$ ' + nf.format(cents / 100).replace(/ /g, ' ');
}

export const UNIT_PRICE_LABEL = formatBRL(PRICE_CENTS);

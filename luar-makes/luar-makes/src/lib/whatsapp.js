import { STORE, PRICE_CENTS } from '../config.js';
import { formatBRL } from './money.js';
import { cartTotals, lineTotalCents } from './cart.js';
import { normalizeSettings } from './settings.js';

export const FULFILLMENT_IDS = ['pickup', 'delivery'];

/** Opções de recebimento, com os textos configurados no painel. */
export function fulfillmentOptions(settings) {
  const s = normalizeSettings(settings);
  return {
    pickup: {
      id: 'pickup',
      label: 'Retirar na loja',
      hint: [s.address, s.pickup_instructions].filter(Boolean).join(' · '),
    },
    delivery: {
      id: 'delivery',
      label: 'Consultar entrega',
      hint: s.delivery_instructions,
    },
  };
}

/** Monta o texto do pedido em português. A cliente revisa antes de enviar. */
export function buildOrderMessage({ lines, fulfillment = 'pickup', notes = '', settings }) {
  const s = normalizeSettings(settings);
  const t = cartTotals(lines);
  const out = [];
  out.push(`Olá, ${STORE.name}! Quero fazer um pedido:`);
  out.push('');
  lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name}`);
    out.push(`   ${l.qty} × ${formatBRL(PRICE_CENTS)} = ${formatBRL(lineTotalCents(l))}`);
  });
  out.push('');
  out.push(`Itens: ${t.count}`);
  out.push(`Preço de cada item: ${formatBRL(PRICE_CENTS)}`);
  out.push(`Subtotal: ${formatBRL(t.subtotalCents)}`);
  out.push(`Total: ${formatBRL(t.totalCents)}`);
  out.push('');
  if (fulfillment === 'delivery') {
    out.push('Modalidade: Consultar entrega');
    out.push('Quero saber se vocês entregam na minha região, o valor e o prazo. O valor da entrega não está incluído no total acima.');
  } else {
    out.push(`Modalidade: Retirar na loja (${s.address})`);
  }
  const n = String(notes || '').trim();
  if (n) {
    out.push('');
    out.push(`Observações: ${n}`);
  }
  out.push('');
  out.push('Aguardo o retorno para confirmar meu pedido.');
  return out.join('\n');
}

export function buildWhatsAppUrl(message, settings) {
  return `${normalizeSettings(settings).whatsappUrl}?text=${encodeURIComponent(message)}`;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { cartTotals, lineTotalCents, clampQty } from '../src/lib/cart.js';
import { buildOrderMessage, buildWhatsAppUrl } from '../src/lib/whatsapp.js';
import { formatBRL } from '../src/lib/money.js';
import { PRICE_CENTS } from '../src/config.js';
import { createCart } from '../src/lib/cart.js';
import { normalizeSettings, parsePhone, parseInstagram } from '../src/lib/settings.js';
import { isOrderable, stockState, isLowStock } from '../src/lib/stock.js';

const lines = [
  { id: 'a', name: 'Gloss Labial - Vivai Good Girl', qty: 2 },
  { id: 'b', name: 'Kit de pincéis', qty: 1 },
  { id: 'c', name: 'Touca de cetim', qty: 3 },
];

test('o preço unitário é R$ 10,00', () => {
  assert.equal(PRICE_CENTS, 1000);
  assert.equal(formatBRL(PRICE_CENTS), 'R$ 10,00');
});

test('total = quantidade de itens × R$ 10,00', () => {
  const t = cartTotals(lines);
  assert.equal(t.count, 6);
  assert.equal(t.subtotalCents, 6000);
  assert.equal(t.totalCents, 6000);
  assert.equal(lineTotalCents(lines[0]), 2000);
  assert.deepEqual(cartTotals([]), { count: 0, subtotalCents: 0, totalCents: 0 });
});

test('totais grandes são formatados em reais', () => {
  assert.equal(formatBRL(cartTotals([{ id: 'x', name: 'x', qty: 99 }]).totalCents), 'R$ 990,00');
  assert.equal(formatBRL(100000), 'R$ 1.000,00');
});

test('quantidade é limitada de 0 a 99', () => {
  assert.equal(clampQty(150), 99);
  assert.equal(clampQty(-4), 0);
  assert.equal(clampQty('3'), 3);
  assert.equal(clampQty('abc'), 1);
});

test('mensagem de retirada traz produtos, quantidades, preço, subtotal, total e modalidade', () => {
  const m = buildOrderMessage({ lines, fulfillment: 'pickup', notes: '' });
  assert.match(m, /1\. Gloss Labial - Vivai Good Girl/);
  assert.match(m, /2 × R\$ 10,00 = R\$ 20,00/);
  assert.match(m, /1 × R\$ 10,00 = R\$ 10,00/);
  assert.match(m, /3 × R\$ 10,00 = R\$ 30,00/);
  assert.match(m, /Itens: 6/);
  assert.match(m, /Subtotal: R\$ 60,00/);
  assert.match(m, /Total: R\$ 60,00/);
  assert.match(m, /Modalidade: Retirar na loja \(Rua Congonhas, 172, Bloco 8 – Fundos, Monte Verde, Florianópolis\/SC\)/);
  assert.doesNotMatch(m, /Observações/);
});

test('mensagem de entrega não promete entrega, prazo nem valor', () => {
  const m = buildOrderMessage({ lines, fulfillment: 'delivery', notes: 'Moro no Monte Verde' });
  assert.match(m, /Modalidade: Consultar entrega/);
  assert.match(m, /não está incluído no total/);
  assert.match(m, /Observações: Moro no Monte Verde/);
  assert.doesNotMatch(m, /grátis|gratis|frete/i);
  assert.match(m, /Total: R\$ 60,00/);
});

test('o link do WhatsApp usa o número da loja e preserva o texto', () => {
  const m = buildOrderMessage({ lines, fulfillment: 'pickup', notes: 'Ligar antes & confirmar' });
  const url = buildWhatsAppUrl(m);
  assert.ok(url.startsWith('https://wa.me/5548985055020?text='));
  const decoded = decodeURIComponent(url.split('?text=')[1]);
  assert.equal(decoded, m);
  assert.match(decoded, /Ligar antes & confirmar/);
});

/* ---------- Estoque, carrinho e configurações ---------- */
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } };

test('o carrinho não passa do estoque informado', () => {
  const cart = createCart();
  const p = { id: 'x', name: 'Gloss', category: 'Lábios e gloss', stock: 2, available: true };
  assert.deepEqual(cart.add(p), { ok: true });
  assert.deepEqual(cart.add(p), { ok: true });
  assert.deepEqual(cart.add(p), { ok: false, max: 2 });
  assert.equal(cart.lines[0].qty, 2);
  cart.setQty('x', 9);
  assert.equal(cart.lines[0].qty, 2);
  assert.equal(cart.totals().totalCents, 2000);
});

test('estoque não informado (null) não limita; zero esgota', () => {
  const cart = createCart(); cart.clear();
  const free = { id: 'f', name: 'Livre', category: 'Rosto', stock: null, available: true };
  for (let i = 0; i < 5; i++) assert.equal(cart.add(free).ok, true);
  assert.equal(cart.lines.find((l) => l.id === 'f').qty, 5);
  const zero = { id: 'z', name: 'Zerado', category: 'Rosto', stock: 0, available: true };
  assert.equal(cart.add(zero).ok, false);
  assert.equal(isOrderable(zero), false);
  assert.equal(isOrderable({ ...free, available: false }), false);
  assert.equal(isOrderable(free), true);
});

test('reconcile reduz a quantidade quando o estoque cai e remove itens esgotados', () => {
  const cart = createCart(); cart.clear();
  cart.add({ id: 'a', name: 'A', category: 'c', stock: null, available: true });
  cart.add({ id: 'a', name: 'A', category: 'c', stock: null, available: true });
  cart.add({ id: 'a', name: 'A', category: 'c', stock: null, available: true });
  cart.add({ id: 'b', name: 'B', category: 'c', stock: null, available: true });
  cart.reconcile([{ id: 'a', name: 'A', category: 'c', stock: 1, available: true }, { id: 'b', name: 'B', category: 'c', stock: 0, available: true }]);
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].qty, 1);
  assert.equal(cart.lines[0].max, 1);
});

test('alerta de estoque baixo usa o limite configurado', () => {
  assert.equal(stockState({ stock: 3 }, 3), 'low');
  assert.equal(stockState({ stock: 4 }, 3), 'ok');
  assert.equal(stockState({ stock: 0 }, 3), 'out');
  assert.equal(stockState({ stock: null }, 3), 'untracked');
  assert.equal(isLowStock({ stock: 0 }, 3), true);
  assert.equal(isLowStock({ stock: null }, 3), false);
});

test('configurações: telefone e Instagram são normalizados e validados', () => {
  assert.equal(parsePhone('(48) 98505-5020'), '5548985055020');
  assert.equal(parsePhone('+55 48 98505-5020'), '5548985055020');
  assert.equal(parsePhone('123'), '');
  assert.deepEqual(parseInstagram('@luarmakeup10'), { url: 'https://www.instagram.com/luarmakeup10/', handle: '@luarmakeup10' });
  assert.deepEqual(parseInstagram('https://www.instagram.com/luarmakeup10/?hl=pt'), { url: 'https://www.instagram.com/luarmakeup10/', handle: '@luarmakeup10' });
  assert.equal(parseInstagram('https://evil.example.com/luar'), null);
  assert.equal(parseInstagram('http://www.instagram.com/x'), null);
});

test('o WhatsApp usa o número configurado na loja', () => {
  const settings = normalizeSettings({ whatsapp_number: '5548999990000', address: 'Rua Nova, 1' });
  const m = buildOrderMessage({ lines, fulfillment: 'pickup', notes: '', settings });
  assert.match(m, /Retirar na loja \(Rua Nova, 1\)/);
  assert.ok(buildWhatsAppUrl(m, settings).startsWith('https://wa.me/5548999990000?text='));
});

test('os produtos de exemplo são da RS Makes, sem preço e sem referência à RR Makes', async () => {
  const { readFileSync } = await import('node:fs');
  const raw = readFileSync(new URL('../src/data/demo-products.json', import.meta.url), 'utf8');
  const items = JSON.parse(raw);
  assert.ok(items.length >= 20);
  assert.doesNotMatch(raw, /rrmakes|rr makes|awsli|"price"/i);
  for (const p of items) {
    assert.match(p.image_url, /^https:\/\/arquivos\.facilzap\.app\.br\/produtos\/.+\.webp$/);
    assert.equal(p.stock, null);
    assert.match(p.source, /^RS Makes/);
  }
  assert.equal(new Set(items.map((p) => p.id)).size, items.length);
});

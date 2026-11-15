import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeColors, hasColors, MAX_COLORS } from '../src/lib/colors.js';
import { createCart } from '../src/lib/cart.js';
import { buildOrderMessage } from '../src/lib/whatsapp.js';
import { normalizeSettings } from '../src/lib/settings.js';

globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } };

test('normalizeColors remove vazios, duplicados e corta nomes longos', () => {
  // "Rosa" e "rosa" contam como a mesma cor — a 2ª (duplicada) é descartada, com seu hex.
  const out = normalizeColors([{ name: ' Rosa ', hex: '#E9A4B0' }, { name: 'rosa', hex: '#000' }, { name: '' }, { name: 'x'.repeat(50) }]);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, 'Rosa');
  assert.equal(out[0].hex, '#E9A4B0');
  assert.equal(out[1].hex, null); // nome longo, sem hex informado
  assert.ok(out[1].name.length <= 30);
});

test('normalizeColors descarta hex inválido (vira cor só com nome)', () => {
  const out = normalizeColors([{ name: 'Estampada', hex: 'não é cor' }, { name: 'Azul', hex: '#12z' }]);
  assert.equal(out[0].hex, null);
  assert.equal(out[1].hex, null);
});

test('normalizeColors ignora entradas inválidas e respeita o limite', () => {
  assert.deepEqual(normalizeColors(null), []);
  assert.deepEqual(normalizeColors(undefined), []);
  assert.deepEqual(normalizeColors('não é lista'), []);
  const many = Array.from({ length: MAX_COLORS + 5 }, (_, i) => ({ name: `Cor ${i}` }));
  assert.equal(normalizeColors(many).length, MAX_COLORS);
});

test('hasColors só é true com pelo menos uma cor', () => {
  assert.equal(hasColors({ colors: [{ name: 'Rosa' }] }), true);
  assert.equal(hasColors({ colors: [] }), false);
  assert.equal(hasColors({ colors: null }), false);
  assert.equal(hasColors({}), false);
});

test('o carrinho trata a mesma cor como uma linha e cores diferentes como linhas separadas', () => {
  const cart = createCart(); cart.clear();
  const p = { id: 'batom', name: 'Batom 24H', category: 'Lábios e gloss', stock: null, available: true };
  cart.add(p, 'Nude');
  cart.add(p, 'Nude');
  cart.add(p, 'Vinho');
  assert.equal(cart.lines.length, 2, 'Nude e Vinho são linhas diferentes');
  const nude = cart.lines.find((l) => l.color === 'Nude');
  const vinho = cart.lines.find((l) => l.color === 'Vinho');
  assert.equal(nude.qty, 2);
  assert.equal(vinho.qty, 1);
  assert.equal(cart.totals().count, 3);
});

test('o estoque do produto limita a soma de todas as cores dele', () => {
  const cart = createCart(); cart.clear();
  const p = { id: 'gloss', name: 'Gloss', category: 'Lábios e gloss', stock: 2, available: true };
  assert.equal(cart.add(p, 'Rosa').ok, true);
  assert.equal(cart.add(p, 'Cereja').ok, true);
  // já tem 2 unidades do produto no carrinho (1 Rosa + 1 Cereja) = no limite de estoque
  assert.equal(cart.add(p, 'Rosa').ok, false);
});

test('produto sem cor continua funcionando igual a antes (sem sufixo na linha)', () => {
  const cart = createCart(); cart.clear();
  const p = { id: 'pinceis', name: 'Kit de pincéis', category: 'Acessórios', stock: null, available: true };
  cart.add(p);
  assert.equal(cart.lines[0].id, 'pinceis');
  assert.equal(cart.lines[0].color, null);
});

test('reconcile preserva a cor e volta a achar o produto pelo productId', () => {
  const cart = createCart(); cart.clear();
  const p = { id: 'batom', name: 'Batom', category: 'c', stock: null, available: true };
  cart.add(p, 'Nude');
  cart.reconcile([{ id: 'batom', name: 'Batom 24H', category: 'c', stock: 5, available: true }]);
  assert.equal(cart.lines[0].color, 'Nude');
  assert.equal(cart.lines[0].name, 'Batom 24H');
  assert.equal(cart.lines[0].max, 5);
});

test('a mensagem do WhatsApp mostra a cor escolhida de cada item', () => {
  const settings = normalizeSettings();
  const msg = buildOrderMessage({
    lines: [
      { id: 'a::Nude', productId: 'a', name: 'Batom 24H', color: 'Nude', qty: 1 },
      { id: 'b', productId: 'b', name: 'Kit de pincéis', color: null, qty: 1 },
    ],
    settings,
  });
  assert.match(msg, /Batom 24H — cor: Nude/);
  assert.doesNotMatch(msg, /Kit de pincéis — cor/);
});

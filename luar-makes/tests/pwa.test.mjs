import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { detectInstall } from '../src/lib/pwa.js';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0 (iPhone14,2)',
  ipadDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  macDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  winChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};
const kind = (o) => detectInstall(o).kind;

test('já instalado: não mostra nada', () => {
  assert.equal(kind({ ua: UA.iphoneSafari, standalone: true }), 'installed');
  assert.equal(kind({ ua: UA.androidChrome, standalone: true, hasPrompt: true }), 'installed');
});
test('Android com convite nativo: botão Instalar app', () => {
  assert.equal(kind({ ua: UA.androidChrome, hasPrompt: true }), 'prompt');
});
test('Android sem convite: ajuda pelo menu, nunca passos de iPhone', () => {
  assert.equal(kind({ ua: UA.androidChrome }), 'android');
});
test('iPhone no Safari: Compartilhar → Adicionar à Tela de Início', () => {
  assert.equal(kind({ ua: UA.iphoneSafari, platform: 'iPhone' }), 'ios-safari');
});
test('iPhone em outro navegador/app: pede para abrir no Safari', () => {
  assert.equal(kind({ ua: UA.iphoneChrome }), 'ios-other');
  assert.equal(kind({ ua: UA.iphoneInstagram }), 'ios-other');
});
test('iPad que se apresenta como Mac é tratado como iOS; Mac de verdade não', () => {
  assert.equal(kind({ ua: UA.ipadDesktopMode, platform: 'MacIntel', maxTouchPoints: 5 }), 'ios-safari');
  assert.equal(kind({ ua: UA.macDesktop, platform: 'MacIntel', maxTouchPoints: 0 }), 'none');
});
test('computador: não mostra instalação sem convite nativo', () => {
  assert.equal(kind({ ua: UA.winChrome, platform: 'Win32' }), 'none');
  assert.equal(kind({ ua: UA.winChrome, hasPrompt: true }), 'prompt');
});
test('celular desconhecido: ajuda genérica', () => {
  assert.equal(kind({ ua: 'Mozilla/5.0 (Mobile; rv:120.0) Gecko/120.0 Firefox/120.0' }), 'mobile-other');
});

const pub = (f) => new URL(`../public/${f}`, import.meta.url);
test('manifesto válido e com ícones PNG que existem', () => {
  const m = JSON.parse(readFileSync(pub('manifest.webmanifest'), 'utf8'));
  assert.equal(m.name, 'Luar Make Up');
  assert.ok(m.short_name && m.short_name.length <= 12);
  assert.equal(m.lang, 'pt-BR');
  assert.equal(m.display, 'standalone');
  assert.ok(m.start_url.startsWith('./') && m.scope.startsWith('./'), 'caminhos relativos funcionam em qualquer domínio');
  for (const size of ['192x192', '512x512']) {
    assert.ok(m.icons.some((i) => i.sizes === size && i.purpose === 'any' && i.type === 'image/png'), `any ${size}`);
    assert.ok(m.icons.some((i) => i.sizes === size && i.purpose === 'maskable'), `maskable ${size}`);
  }
  for (const i of m.icons) {
    const f = pub(i.src);
    assert.ok(existsSync(f), i.src);
    const b = readFileSync(f);
    assert.equal(b.subarray(1, 4).toString(), 'PNG');
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    assert.equal(`${w}x${h}`, i.sizes, i.src);
  }
});
test('service worker só trata o próprio site e nunca guarda dados', () => {
  const sw = readFileSync(pub('sw.js'), 'utf8');
  assert.ok(sw.includes('__BUILD_ID__'), 'versão trocada a cada build');
  assert.ok(sw.includes("url.origin !== self.location.origin"), 'ignora endereços externos (Supabase, WhatsApp)');
  assert.ok(sw.includes("req.method !== 'GET'"), 'ignora POST/PUT/DELETE');
  assert.ok(!/supabase|wa\.me|whatsapp|localStorage|authorization/i.test(sw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'sem referência a dados sensíveis no código');
  assert.ok(existsSync(pub('offline.html')));
});

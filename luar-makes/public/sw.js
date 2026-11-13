/* Service worker da Luar Make Up.
 *
 * Regras de segurança (de propósito, o mínimo possível):
 *  - Só toca em requisições GET do MESMO site. Supabase, WhatsApp, Google Fonts, fotos de
 *    produtos e qualquer outro endereço externo passam direto pela rede, sem cache.
 *  - Páginas (navegação) vão sempre à rede primeiro, então site, login e painel nunca ficam
 *    presos numa versão antiga. Só se a rede falhar aparece a página "Sem conexão".
 *  - Só guarda em cache: a página offline, os ícones e os arquivos /assets/ (nomes com hash,
 *    públicos e imutáveis). Nada de carrinho, pedidos, login ou dados da loja.
 *  - __BUILD_ID__ é trocado a cada `npm run build`: o arquivo muda, o navegador instala a
 *    versão nova, e as caches antigas são apagadas em "activate".
 */
const BUILD_ID = '__BUILD_ID__';
const CACHE = 'luar-' + BUILD_ID;
const SCOPE = self.registration.scope;
const OFFLINE_URL = new URL('offline.html', SCOPE).href;
const PRECACHE = [OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('luar-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCacheableAsset(url) {
  const path = url.pathname.slice(new URL(SCOPE).pathname.length - 1);
  return path.startsWith('/assets/') || path.startsWith('/icons/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, WhatsApp, fontes, fotos: rede direta

  // Navegação: rede primeiro; sem rede, página "Sem conexão" (nunca finge que algo foi feito).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || new Response('Sem conexão. Tente novamente quando a internet voltar.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
    );
    return;
  }

  // Arquivos estáticos com hash: cache primeiro (nunca ficam "velhos", o nome muda a cada versão).
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((hit) => hit || fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') cache.put(req, res.clone());
          return res;
        }))
      )
    );
  }
  // qualquer outra coisa: o navegador cuida, sem service worker
});

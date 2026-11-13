import './styles.css';
import { STORE } from './config.js';
import { normalizeSettings } from './lib/settings.js';
import { hasStockInfo, isOrderable, stockState } from './lib/stock.js';
import { formatBRL, UNIT_PRICE_LABEL } from './lib/money.js';
import { createCart, lineTotalCents } from './lib/cart.js';
import { buildOrderMessage, buildWhatsAppUrl, fulfillmentOptions } from './lib/whatsapp.js';
import { createStore } from './lib/store.js';
import { friendlyError } from './lib/errors.js';
import { esc, $, $$ } from './ui/dom.js';
import { icon, brandHtml, brandAvatar } from './ui/icons.js';
import { productImageHtml, installImageFallback } from './ui/placeholder.js';
import { mountAdmin } from './ui/admin.js';

installImageFallback();

const app = document.getElementById('app');
let store; // definido em start()
const cart = createCart();
const state = { products: [], categories: [], settings: normalizeSettings(), loading: true, loadError: '', category: 'Todos', query: '', cartOpen: false, fulfillment: 'pickup', notes: '' };

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Produtos são essenciais (erro aparece na tela). Categorias e configurações têm reserva: a loja abre mesmo sem elas. */
async function loadProducts() {
  state.loading = true; state.loadError = '';
  const [prods, cats, sets] = await Promise.allSettled([store.listProducts(), store.listCategories(), store.getSettings()]);
  if (prods.status === 'fulfilled') state.products = prods.value;
  else { console.error(prods.reason); state.loadError = friendlyError(prods.reason, 'load'); }
  if (cats.status === 'fulfilled') state.categories = cats.value; else { console.warn('categorias indisponíveis', cats.reason); state.categories = []; }
  state.settings = normalizeSettings(sets.status === 'fulfilled' ? sets.value : {});
  if (sets.status === 'rejected') console.warn('configurações indisponíveis', sets.reason);
  if (!state.loadError) cart.reconcile(state.products);
  state.loading = false;
}

/* ================= Loja ================= */
let cleanup = () => {};

function modeBar() {
  if (store.mode === 'demo') return `<div class="modebar"><b>Modo demonstração.</b> O Supabase ainda não foi configurado: os produtos são exemplos e nada é salvo.</div>`;
  if (store.mode === 'prototype') return `<div class="modebar"><b>Protótipo.</b> Produtos de exemplo com ilustrações no lugar das fotos (este ambiente bloqueia imagens de outros sites). Na loja publicada, cada produto mostra a sua foto.</div>`;
  return '';
}

function sparkles() {
  const s = [[82, 8, 16], [92, 34, 12], [70, 20, 11]];
  return s.map(([x, y, z]) => `<span class="hero__sp" style="left:${x}%;top:${y}%;width:${z}px;height:${z}px">${icon.spark}</span>`).join('');
}

function storeHtml() {
  const S = state.settings;
  return `
${modeBar()}
<header class="topbar"><div class="wrap">
  <button class="brand" data-action="goto" data-target="top" aria-label="${esc(STORE.name)} — início">${brandHtml}</button>
  <nav class="nav" aria-label="Principal">
    <button data-action="goto" data-target="destaques">Destaques</button>
    <button data-action="goto" data-target="vitrine">Vitrine</button>
    <button data-action="goto" data-target="contato">Onde estamos</button>
  </nav>
  <div class="topact">
    <a class="topicon" href="${esc(S.instagram_url)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram ${esc(S.instagram_handle)}">${icon.ig}</a>
    <a class="topicon" href="${esc(S.whatsappUrl)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp ${esc(S.whatsapp_display)}">${icon.wa}</a>
    <button class="cartbtn" data-action="openCart" aria-label="Abrir carrinho">${icon.cart}<span class="cartbtn__txt">Carrinho</span><span class="badge" id="badge" hidden>0</span></button>
  </div>
</div></header>

<main id="top">
  <section class="hero" aria-labelledby="h1">
    <svg class="hero__moon" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="hm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9b9a6"/><stop offset=".5" stop-color="#fff1e8"/><stop offset="1" stop-color="#e2a48c"/></linearGradient></defs><path d="M31 22.6A13.5 13.5 0 1 1 17.4 6.6a10.5 10.5 0 0 0 13.6 16z" fill="url(#hm)"/></svg>
    ${sparkles()}
    <div class="wrap">
      <div class="hero__id">
        ${brandAvatar('avatar--hero')}
        <div class="hero__copy">
          <p class="hero__script">${esc(STORE.tagline)}</p>
          <h1 id="h1" aria-label="${esc(STORE.name)}"><span class="lockup__luar" aria-hidden="true">Luar</span><span class="lockup__mu" aria-hidden="true">Make Up</span></h1>
          <p class="lead">Makes, gloss, brincos e acessórios em ${esc(STORE.city.replace('/SC', ''))}.</p>
          <div class="hero__cta">
            <a class="btn btn-ghost btn-small" href="${esc(S.instagram_url)}" target="_blank" rel="noopener noreferrer">${icon.ig} ${esc(S.instagram_handle)}</a>
            <a class="btn btn-ghost btn-small" href="${esc(S.whatsappUrl)}" target="_blank" rel="noopener noreferrer">${icon.wa} WhatsApp</a>
          </div>
        </div>
      </div>
      <div class="plaque" role="img" aria-label="Tudo por ${UNIT_PRICE_LABEL}, cada produto">
        <span class="plaque__top" aria-hidden="true">Tudo por</span>
        <span class="plaque__price" aria-hidden="true"><small>R$</small><strong>10,00</strong></span>
        <span class="plaque__each" aria-hidden="true">cada produto</span>
      </div>
    </div>
  </section>

  <section class="section section--first" id="destaques" hidden><div class="wrap">
    <div class="section__head section__head--row"><div><p class="eyebrow">escolhidos pela loja</p><h2 class="title">Em destaque</h2></div><button class="textlink" data-action="goto" data-target="vitrine">Ver tudo ${icon.arrow || ''}</button></div>
    <div class="grid" id="featured"></div>
  </div></section>

  <section class="section" id="vitrine"><div class="wrap">
    <div class="section__head"><p class="eyebrow">brilho para o dia a dia</p><h2 class="title">Vitrine</h2><span class="pricetag">Tudo por <b>${UNIT_PRICE_LABEL}</b> · cada produto</span></div>
    <div class="toolbar">
      <div class="search"><label class="sr" for="q">Buscar produtos</label>${icon.search}<input id="q" type="search" placeholder="Buscar produtos" autocomplete="off" value="${esc(state.query)}"></div>
      <div class="pills" id="pills" role="group" aria-label="Filtrar por categoria"></div>
    </div>
    <div id="results" aria-live="polite"></div>
  </div></section>

  <section class="section" id="contato"><div class="wrap">
    <div class="section__head"><p class="eyebrow">venha nos visitar</p><h2 class="title">Onde estamos</h2></div>
    <div class="info">
      <div class="info__card"><h3>Endereço</h3>
         <div class="row">${icon.pin}<p>${esc(S.address)}</p></div>
        ${S.pickup_instructions ? `<p class="fine">${esc(S.pickup_instructions)}</p>` : ''}
        <a class="link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.address)}" target="_blank" rel="noopener noreferrer">Ver no mapa</a></div>
      <div class="info__card"><h3>Como pedir</h3>
        <ol class="steps"><li>Escolha os produtos e abra o carrinho.</li><li>Escolha retirar na loja ou consultar entrega.</li><li>Envie a mensagem pelo WhatsApp e aguarde o retorno da loja.</li></ol></div>
      <div class="info__card"><h3>Fale com a gente</h3>
        <div class="row">${icon.wa}<a class="link" href="${esc(S.whatsappUrl)}" target="_blank" rel="noopener noreferrer">${esc(S.whatsapp_display)}</a></div>
        <div class="row">${icon.ig}<a class="link" href="${esc(S.instagram_url)}" target="_blank" rel="noopener noreferrer">${esc(S.instagram_handle)}</a></div></div>
    </div>
  </div></section>
</main>

<footer class="footer"><div class="wrap">
  <div class="brand">${brandHtml}</div>
  <div>${esc(STORE.tagline)} · ${esc(STORE.city)}</div>
  <div class="footer__small">${esc(S.address)}</div>
  <div class="footer__small">© ${new Date().getFullYear()} ${esc(STORE.name)}. Todos os produtos por ${UNIT_PRICE_LABEL}.</div>
  <div class="footer__admin"><button data-action="admin">Área da loja (administração)</button><span>Para a dona da loja: o painel também abre em <b>/#admin</b>.</span></div>
</div></footer>

<div class="mbar" id="mbar" hidden><span id="mbarText"></span><button class="btn btn-gold" data-action="openCart">Ver carrinho</button></div>
<div class="scrim" id="scrim" data-action="closeCart"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Carrinho" aria-hidden="true">
  <div class="drawer__head"><h2>Seu carrinho</h2><button class="iconbtn" data-action="closeCart" aria-label="Fechar carrinho">${icon.close}</button></div>
  <div class="drawer__body" id="drawerBody"></div>
</aside>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

function cardHtml(p) {
  const ok = isOrderable(p);
  const st = stockState(p, state.settings.low_stock_threshold);
  const label = !p.available ? 'Indisponível' : 'Esgotado';
  return `<article class="card${ok ? '' : ' is-out'}">
    <div class="card__media">${productImageHtml(p, store.mode)}${p.featured && ok ? '<span class="tag">Destaque</span>' : ''}${ok ? '' : `<span class="out">${label}</span>`}</div>
    <div class="card__body">
      <span class="card__cat">${esc(p.category)}</span>
      <h3 class="card__name">${esc(p.name)}</h3>
      ${p.description ? `<p class="card__desc">${esc(p.description)}</p>` : ''}
      ${ok && st === 'low' ? `<p class="card__stock">${p.stock === 1 ? 'Última unidade' : `Restam ${p.stock} unidades`}</p>` : ''}
      <div class="card__foot">
        <span class="price"><small>R$</small>10,00</span>
        <button class="btn btn-add" data-action="add" data-id="${esc(p.id)}" ${ok ? '' : 'disabled'}>${ok ? 'Adicionar ao carrinho' : label}</button>
      </div>
    </div></article>`;
}

function categoriesInUse() {
  const used = new Set(state.products.map((p) => p.category));
  const known = state.categories.map((c) => c.name);
  const ordered = known.filter((c) => used.has(c));
  const extra = [...used].filter((c) => !known.includes(c)).sort();
  return [...ordered, ...extra];
}

function filtered() {
  const q = norm(state.query.trim());
  return state.products.filter((p) => (state.category === 'Todos' || p.category === state.category)
    && (!q || norm(`${p.name} ${p.description} ${p.category}`).includes(q)));
}

function fillCategories(root) {
  const cats = categoriesInUse();
  $('#pills', root).innerHTML = ['Todos', ...cats].map((c) => `<button class="pill" data-action="filter" data-cat="${esc(c)}" aria-pressed="${state.category === c}">${esc(c)}</button>`).join('');
}

function fillFeatured(root) {
  const feat = state.products.filter((p) => p.featured && p.available).slice(0, 8);
  const sec = $('#destaques', root);
  sec.hidden = feat.length === 0;
  $('#featured', root).innerHTML = feat.map(cardHtml).join('');
}

function fillResults(root) {
  const box = $('#results', root);
  if (state.loading) { box.innerHTML = `<div class="grid">${'<div class="skeleton"></div>'.repeat(8)}</div>`; return; }
  if (state.loadError) {
    box.innerHTML = `<div class="alert alert--error" role="alert"><span>${esc(state.loadError)}</span><button class="btn btn-small btn-primary" data-action="retry">Tentar de novo</button></div>`;
    return;
  }
  const list = filtered();
  if (!state.products.length) { box.innerHTML = `<div class="empty">${icon.moon}<h3>A vitrine está sendo preparada</h3><p>Volte em breve ou chame a loja no WhatsApp.</p></div>`; return; }
  if (!list.length) { box.innerHTML = `<div class="empty">${icon.search}<h3>Nenhum produto encontrado</h3><p>Tente outra palavra ou veja todos os produtos.</p><p><button class="btn btn-ghost btn-small" data-action="filter" data-cat="Todos" data-clear="1">Limpar filtros</button></p></div>`; return; }
  box.innerHTML = `<div class="grid">${list.map(cardHtml).join('')}</div>`;
}

function fillAll(root) {
  fillCategories(root); fillFeatured(root); fillResults(root);
}

/* ---------- Carrinho ---------- */
function lineHtml(l) {
  const atMax = l.max !== null && l.qty >= l.max;
  return `<li class="line">
    <div class="line__img">${productImageHtml(l, store.mode)}</div>
    <div>
      <p class="line__name">${esc(l.name)}</p>
      <div class="line__row">
        <div class="qty" role="group" aria-label="Quantidade de ${esc(l.name)}">
          <button data-action="dec" data-id="${esc(l.id)}" aria-label="Diminuir quantidade">${icon.minus}</button>
          <output aria-live="polite">${l.qty}</output>
          <button data-action="inc" data-id="${esc(l.id)}" aria-label="Aumentar quantidade" ${atMax ? 'disabled' : ''}>${icon.plus}</button>
        </div>
        <span class="line__total">${l.qty} × ${UNIT_PRICE_LABEL} = ${formatBRL(lineTotalCents(l))}</span>
      </div>
      ${atMax ? `<p class="line__max">Limite do estoque: ${l.max} ${l.max === 1 ? 'unidade' : 'unidades'}.</p>` : ''}
      <button class="line__rm" data-action="remove" data-id="${esc(l.id)}">${icon.trash} Remover</button>
    </div></li>`;
}

function orderMessage() {
  return buildOrderMessage({ lines: cart.lines, fulfillment: state.fulfillment, notes: state.notes, settings: state.settings });
}

function drawerBodyHtml() {
  if (!cart.lines.length) {
    return `<div class="cartempty">${icon.moon}<h3>Seu carrinho está vazio</h3><p class="fine">Tudo por ${UNIT_PRICE_LABEL}. Escolha seus favoritos na vitrine.</p><p><button class="btn btn-primary" data-action="goto" data-target="vitrine">Ver a vitrine</button></p></div>`;
  }
  const t = cart.totals();
  const msg = orderMessage();
  return `
  <ul class="lines">${cart.lines.map(lineHtml).join('')}</ul>
  <div class="sum" aria-label="Resumo do pedido">
    <div><span>Itens</span><span>${t.count}</span></div>
    <div><span>Preço de cada item</span><span>${UNIT_PRICE_LABEL}</span></div>
    <div><span>Subtotal</span><span>${formatBRL(t.subtotalCents)}</span></div>
    <div class="total"><span>Total</span><span>${formatBRL(t.totalCents)}</span></div>
    <small>Na entrega, o valor do frete (se houver) é combinado com a loja e não entra neste total.</small>
  </div>
  <fieldset class="opts"><legend>Como você quer receber?</legend>
    ${Object.values(fulfillmentOptions(state.settings)).map((o) => `<label class="opt"><input type="radio" name="fulfillment" value="${o.id}" ${state.fulfillment === o.id ? 'checked' : ''}><span><b>${esc(o.label)}</b><small>${esc(o.hint)}</small></span></label>`).join('')}
  </fieldset>
  <div class="field"><label for="notes">Observações <span class="hint">(opcional)</span></label>
    <textarea id="notes" maxlength="400" placeholder="Ex.: cor preferida, bairro para a entrega, horário para retirar">${esc(state.notes)}</textarea></div>
  <div class="field">
    <a class="btn btn-wa btn-wide" id="waLink" href="${esc(buildWhatsAppUrl(msg, state.settings))}" target="_blank" rel="noopener noreferrer">${icon.wa} Finalizar pedido no WhatsApp</a>
    <p class="fine"><b>O pedido só é enviado quando você tocar em “Enviar” dentro do WhatsApp.</b> Ele abre com a mensagem pronta para você revisar. O pedido só é confirmado quando a loja responder.</p>
  </div>
  <details class="preview"><summary>Ver a mensagem que será enviada</summary><pre id="msgPreview">${esc(msg)}</pre></details>
  <div class="line__row"><button class="btn btn-ghost btn-small" data-action="copyMsg">Copiar mensagem</button><button class="line__rm" data-action="clearCart">Limpar carrinho</button></div>`;
}

function updateOrderLink(root) {
  const a = $('#waLink', root); const pre = $('#msgPreview', root);
  if (!a) return;
  const msg = orderMessage();
  a.href = buildWhatsAppUrl(msg, state.settings);
  if (pre) pre.textContent = msg;
}

function updateCartUI(root) {
  const t = cart.totals();
  const badge = $('#badge', root);
  badge.textContent = t.count; badge.hidden = t.count === 0;
  const mbar = $('#mbar', root);
  mbar.hidden = t.count === 0 || state.cartOpen;
  $('#mbarText', root).textContent = `${t.count} ${t.count === 1 ? 'item' : 'itens'} · ${formatBRL(t.totalCents)}`;
  $('#drawerBody', root).innerHTML = drawerBodyHtml();
}

function setCartOpen(root, open) {
  state.cartOpen = open;
  $('#drawer', root).classList.toggle('open', open);
  $('#drawer', root).setAttribute('aria-hidden', String(!open));
  $('#scrim', root).classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) $('#toast', root).classList.remove('show');
  updateCartUI(root);
  if (open) $('#drawer .iconbtn', root)?.focus();
}

let toastTimer;
function showToast(root, text, withCart = true) {
  const el = $('#toast', root);
  el.innerHTML = `${icon.check}<span>${esc(text)}</span>${withCart ? '<button data-action="openCart">Ver carrinho</button>' : ''}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function renderStore() {
  const root = document.createElement('div');
  app.replaceChildren(root);
  root.innerHTML = storeHtml();
  fillAll(root);
  updateCartUI(root);
  const unsub = cart.subscribe(() => updateCartUI(root));

  const onKey = (e) => { if (e.key === 'Escape' && state.cartOpen) setCartOpen(root, false); };
  document.addEventListener('keydown', onKey);

  root.addEventListener('input', (e) => {
    if (e.target.id === 'q') { state.query = e.target.value; fillResults(root); }
    if (e.target.id === 'notes') { state.notes = e.target.value; updateOrderLink(root); }
  });
  root.addEventListener('change', (e) => {
    if (e.target.name === 'fulfillment') { state.fulfillment = e.target.value; updateOrderLink(root); }
  });
  root.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, id } = el.dataset;
    if (action === 'add') {
      const p = state.products.find((x) => x.id === id);
      if (!p || !isOrderable(p)) return;
      const r = cart.add(p);
      if (!r.ok) { showToast(root, `Você já tem ${r.max === 1 ? 'a única unidade' : `as ${r.max} unidades`} em estoque no carrinho`); return; }
      el.classList.add('is-added'); el.textContent = 'Adicionado ✓';
      setTimeout(() => { el.classList.remove('is-added'); el.textContent = 'Adicionar ao carrinho'; }, 1300);
      showToast(root, 'Adicionado ao carrinho');
    } else if (action === 'inc') { const l = cart.lines.find((x) => x.id === id); if (l) cart.setQty(id, l.qty + 1); }
    else if (action === 'dec') { const l = cart.lines.find((x) => x.id === id); if (l) cart.setQty(id, l.qty - 1); }
    else if (action === 'remove') cart.remove(id);
    else if (action === 'clearCart') cart.clear();
    else if (action === 'openCart') setCartOpen(root, true);
    else if (action === 'closeCart') setCartOpen(root, false);
    else if (action === 'filter') {
      state.category = el.dataset.cat;
      if (el.dataset.clear) { state.query = ''; $('#q', root).value = ''; }
      fillCategories(root); fillResults(root);
      if (el.classList.contains('cat')) $('#vitrine', root).scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'goto') {
      if (state.cartOpen) setCartOpen(root, false);
      const t = el.dataset.target === 'top' ? root : $('#' + el.dataset.target, root);
      t?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action === 'retry') { state.loading = true; fillResults(root); await loadProducts(); fillAll(root); updateCartUI(root); }
    else if (action === 'copyMsg') {
      try { await navigator.clipboard.writeText(orderMessage()); showToast(root, 'Mensagem copiada', false); }
      catch { showToast(root, 'Não foi possível copiar. Abra "Ver a mensagem" e copie o texto.', false); }
    } else if (action === 'admin') location.hash = 'admin';
  });

  return () => { unsub(); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; clearTimeout(toastTimer); };
}

/* ================= Rotas ================= */
async function route() {
  cleanup();
  window.scrollTo(0, 0);
  if (location.hash === '#admin') {
    const root = document.createElement('div');
    app.replaceChildren(root);
    cleanup = mountAdmin(root, {
      store, state, loadProducts,
      goStore: () => { location.hash = ''; },
    });
  } else {
    cleanup = renderStore();
    if (state.loading) {
      await loadProducts();
      // pode ter mudado de rota enquanto carregava
      if (location.hash !== '#admin') { cleanup(); cleanup = renderStore(); }
    }
  }
}
window.addEventListener('hashchange', route);

async function start() {
  try {
    store = await createStore();
  } catch (e) {
    console.error(e);
    app.innerHTML = '<div class="wrap" style="padding:40px 16px"><div class="alert alert--error" role="alert"><span>Não foi possível iniciar a loja. Recarregue a página ou chame a Luar Make Up no WhatsApp: (48) 98505-5020.</span></div></div>';
    return;
  }
  route();
}
start();

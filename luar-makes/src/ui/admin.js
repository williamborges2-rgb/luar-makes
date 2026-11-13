import { STORE } from '../config.js';
import { UNIT_PRICE_LABEL } from '../lib/money.js';
import { friendlyError } from '../lib/errors.js';
import { parsePhone, parseInstagram } from '../lib/settings.js';
import { hasStockInfo, isLowStock } from '../lib/stock.js';
import { esc, $ } from './dom.js';
import { icon, icon2, brandHtml } from './icons.js';
import { productImageHtml, placeholderHtml } from './placeholder.js';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

/**
 * Painel da loja (#admin): produtos, estoque, categorias e configurações.
 * O preço NÃO é um campo: é sempre R$ 10,00 (e o banco também exige isso).
 */
export function mountAdmin(root, ctx) {
  const { store } = ctx;
  const st = {
    user: null, checking: true, flash: null, modal: null, loginError: '', tab: 'produtos',
    f: { q: '', cat: '', avail: '', featured: false, low: false, sort: 'name' },
  };
  let alive = true;

  const products = () => ctx.state.products;
  const categories = () => ctx.state.categories;
  const settings = () => ctx.state.settings;
  const catNames = () => {
    const known = categories().map((c) => c.name);
    return [...known, ...[...new Set(products().map((p) => p.category))].filter((c) => !known.includes(c))];
  };
  const reload = async () => { await ctx.loadProducts(); if (alive) renderTab(); };
  const flash = (type, msg) => { st.flash = { type, msg }; const el = $('#flash', root); if (el) el.innerHTML = flashHtml(); };
  const flashHtml = () => st.flash
    ? `<div class="alert alert--${st.flash.type}" role="${st.flash.type === 'error' ? 'alert' : 'status'}"><span>${esc(st.flash.msg)}</span><button class="btn btn-small btn-ghost" data-action="dismiss">Ok</button></div>` : '';

  /* ---------- Entrada ---------- */
  function loginHtml() {
    const preview = store.mode !== 'supabase';
    return `<div class="admin"><div class="admin__bar"><div class="wrap"><div class="brand">${brandHtml}</div><button class="btn btn-small btn-ghost" data-action="back">${icon.back} Voltar à loja</button></div></div>
    <div class="wrap"><div class="login">
      <div><h1>Área da loja</h1><p class="fine">Produtos, estoque, categorias e configurações.</p></div>
      ${preview ? `
        <div class="alert alert--info" role="note"><span>${store.mode === 'prototype'
          ? '<b>Prévia do painel.</b> Aqui os dados ficam só nesta aba e somem ao recarregar. Na versão publicada, o painel pede e-mail e senha e salva tudo no Supabase.'
          : '<b>Supabase não configurado.</b> Para entrar com e-mail e senha e salvar de verdade, siga o passo a passo do README. Enquanto isso, a prévia abaixo não salva nada.'}</span></div>
        <button class="btn btn-primary btn-wide" data-action="preview">Abrir prévia do painel</button>`
      : `<form id="loginForm" class="admin__form" novalidate style="display:grid;gap:14px">
          <div id="loginMsg">${st.loginError ? `<div class="alert alert--error" role="alert"><span>${esc(st.loginError)}</span></div>` : ''}</div>
          <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" required></div>
          <div class="field"><label for="password">Senha</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary btn-wide" type="submit" id="loginBtn">Entrar</button>
        </form>`}
    </div></div></div>`;
  }

  /* ---------- Produtos ---------- */
  function visibleProducts() {
    const { q, cat, avail, featured, low, sort } = st.f;
    const th = settings().low_stock_threshold;
    const nq = norm(q.trim());
    const list = products().filter((p) =>
      (!nq || norm(`${p.name} ${p.description} ${p.category}`).includes(nq))
      && (!cat || p.category === cat)
      && (avail === '' || (avail === 'yes' ? p.available : !p.available))
      && (!featured || p.featured)
      && (!low || isLowStock(p, th)));
    const byName = (a, b) => collator.compare(a.name, b.name);
    if (sort === 'category') list.sort((a, b) => collator.compare(a.category, b.category) || byName(a, b));
    else if (sort === 'stock-asc' || sort === 'stock-desc') {
      const dir = sort === 'stock-asc' ? 1 : -1;
      // produtos sem estoque informado ficam sempre no fim
      list.sort((a, b) => {
        const ai = hasStockInfo(a), bi = hasStockInfo(b);
        if (ai !== bi) return ai ? -1 : 1;
        return ((a.stock ?? 0) - (b.stock ?? 0)) * dir || byName(a, b);
      });
    } else list.sort(byName);
    return list;
  }

  function stockChip(p) {
    const th = settings().low_stock_threshold;
    if (!hasStockInfo(p)) return '<span class="chip">Estoque não informado</span>';
    if (p.stock === 0) return '<span class="chip chip--out">Estoque: 0 · esgotado</span>';
    if (isLowStock(p, th)) return `<span class="chip chip--low">Estoque baixo: ${p.stock}</span>`;
    return `<span class="chip">Estoque: ${p.stock}</span>`;
  }

  function rowHtml(p) {
    return `<article class="arow${p.available ? '' : ' is-out'}">
      <div class="arow__img">${productImageHtml(p, store.mode)}</div>
      <div class="arow__main">
        <div class="arow__name">${esc(p.name)}</div>
        <div class="arow__meta"><span class="chip">${esc(p.category)}</span><span>${UNIT_PRICE_LABEL}</span>${stockChip(p)}${p.featured ? '<span class="chip">Destaque</span>' : ''}${p.is_demo ? '<span class="chip chip--demo">Exemplo</span>' : ''}${p.available ? '' : '<span class="chip chip--out">Indisponível</span>'}</div>
      </div>
      <div class="arow__actions">
        <label class="switch"><input type="checkbox" data-action="toggle" data-id="${esc(p.id)}" ${p.available ? 'checked' : ''}><i></i><span>${p.available ? 'Disponível' : 'Indisponível'}</span></label>
        <button class="btn btn-small btn-ghost" data-action="edit" data-id="${esc(p.id)}">${icon.edit} Editar</button>
        <button class="btn btn-small btn-ghost" data-action="askDelete" data-id="${esc(p.id)}" style="color:var(--danger);border-color:var(--danger)">${icon.trash} Remover</button>
      </div></article>`;
  }

  function listHtml() {
    if (ctx.state.loadError) return `<div class="alert alert--error" role="alert"><span>${esc(ctx.state.loadError)}</span><button class="btn btn-small btn-primary" data-action="reload">Tentar de novo</button></div>`;
    if (!products().length) return `<div class="empty">${icon.moon}<h3>Nenhum produto ainda</h3><p>Toque em “Novo produto” para cadastrar o primeiro.</p></div>`;
    const list = visibleProducts();
    if (!list.length) return `<div class="empty"><h3>Nenhum produto com esses filtros</h3><p><button class="btn btn-small btn-ghost" data-action="clearFilters">Limpar filtros</button></p></div>`;
    return `<div class="alist">${list.map(rowHtml).join('')}</div>`;
  }

  function productsTabHtml() {
    const f = st.f; const th = settings().low_stock_threshold;
    const lowCount = products().filter((p) => isLowStock(p, th)).length;
    return `
      <div class="adminhead"><div><h1>Produtos</h1><span class="fine" id="count"></span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-small" id="demoBtn" data-action="askDemo" hidden>Remover produtos de exemplo</button><button class="btn btn-primary" data-action="new">${icon.plus} Novo produto</button></div></div>
      <div class="priceLock">${icon.lock}<div>Preço fixo: ${UNIT_PRICE_LABEL} em todos os produtos<small>O preço não pode ser alterado por produto.</small></div></div>
      ${lowCount ? `<div class="alert alert--warn" role="status"><span><b>${lowCount} ${lowCount === 1 ? 'produto com estoque baixo ou zerado' : 'produtos com estoque baixo ou zerado'}</b> (limite: ${th}).</span><button class="btn btn-small btn-ghost" data-action="showLow">Ver</button></div>` : ''}
      <div class="alert alert--info" role="note"><span>O estoque <b>não diminui sozinho</b> quando a cliente abre o WhatsApp, porque a mensagem ainda não é uma venda confirmada. Atualize o estoque aqui depois de confirmar cada pedido.</span></div>
      <div class="filters">
        <div class="search"><label class="sr" for="a_q">Buscar no painel</label>${icon.search}<input id="a_q" type="search" placeholder="Buscar produto" autocomplete="off" value="${esc(f.q)}"></div>
        <div class="filters__row">
          <label class="sr" for="a_cat">Categoria</label>
          <select id="a_cat"><option value="">Todas as categorias</option>${catNames().map((c) => `<option ${f.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <label class="sr" for="a_avail">Disponibilidade</label>
          <select id="a_avail"><option value="">Disponíveis e não</option><option value="yes" ${f.avail === 'yes' ? 'selected' : ''}>Só disponíveis</option><option value="no" ${f.avail === 'no' ? 'selected' : ''}>Só indisponíveis</option></select>
          <label class="sr" for="a_sort">Ordenar</label>
          <select id="a_sort"><option value="name" ${f.sort === 'name' ? 'selected' : ''}>Ordenar: nome (A–Z)</option><option value="category" ${f.sort === 'category' ? 'selected' : ''}>Ordenar: categoria</option><option value="stock-asc" ${f.sort === 'stock-asc' ? 'selected' : ''}>Ordenar: menor estoque</option><option value="stock-desc" ${f.sort === 'stock-desc' ? 'selected' : ''}>Ordenar: maior estoque</option></select>
        </div>
        <div class="togglechips"><button class="tchip" data-action="toggleFeatured" aria-pressed="${f.featured}">Só destaques</button><button class="tchip" data-action="toggleLow" aria-pressed="${f.low}">Só estoque baixo</button></div>
      </div>
      <div id="alist"></div>`;
  }

  function renderList() {
    const el = $('#alist', root);
    if (el) el.innerHTML = listHtml();
    const n = $('#count', root);
    if (n) {
      const shown = visibleProducts().length; const total = products().length;
      n.textContent = shown === total ? `${total} ${total === 1 ? 'produto' : 'produtos'}` : `${shown} de ${total} produtos`;
    }
    const demoBtn = $('#demoBtn', root);
    if (demoBtn) demoBtn.hidden = !products().some((p) => p.is_demo);
  }

  /* ---------- Categorias ---------- */
  function categoriesTabHtml() {
    const cats = categories();
    const count = (name) => products().filter((p) => p.category === name).length;
    return `
      <div class="adminhead"><div><h1>Categorias</h1><span class="fine">${cats.length} ${cats.length === 1 ? 'categoria' : 'categorias'}</span></div></div>
      <div class="panel">
        <form id="catForm" class="addcat" novalidate>
          <div class="field"><label for="c_name">Nova categoria</label><input id="c_name" name="name" type="text" maxlength="40" placeholder="Ex.: Perfumes"></div>
          <button class="btn btn-primary" type="submit">${icon.plus} Adicionar</button>
        </form>
        <div id="catMsg"></div>
        ${cats.length ? `<div class="alist" role="list">${cats.map((c, i) => `
          <div class="crow" role="listitem">
            <div class="crow__name">${esc(c.name)}<small>${count(c.name)} ${count(c.name) === 1 ? 'produto' : 'produtos'}</small></div>
            <div class="crow__btns">
              <button class="iconbtn" data-action="catUp" data-id="${esc(c.id)}" aria-label="Subir ${esc(c.name)}" ${i === 0 ? 'disabled' : ''}>${icon2.up}</button>
              <button class="iconbtn" data-action="catDown" data-id="${esc(c.id)}" aria-label="Descer ${esc(c.name)}" ${i === cats.length - 1 ? 'disabled' : ''}>${icon2.down}</button>
              <button class="iconbtn" data-action="catEdit" data-id="${esc(c.id)}" aria-label="Renomear ${esc(c.name)}">${icon.edit}</button>
              <button class="iconbtn" data-action="catAskDelete" data-id="${esc(c.id)}" aria-label="Remover ${esc(c.name)}" style="color:var(--danger)">${icon.trash}</button>
            </div>
          </div>`).join('')}</div>` : '<p class="fine">Nenhuma categoria cadastrada ainda.</p>'}
        <p class="fine">A ordem daqui é a ordem em que as categorias aparecem na loja. Categorias sem produtos não aparecem para as clientes. Para remover uma categoria, mude antes os produtos dela para outra.</p>
      </div>`;
  }

  /* ---------- Configurações ---------- */
  function settingsTabHtml() {
    const s = settings();
    return `
      <div class="adminhead"><div><h1>Configurações</h1><span class="fine">Contatos, endereço e avisos da loja</span></div></div>
      <form id="setForm" class="panel" novalidate>
        <div id="setMsg"></div>
        <div class="field"><label for="s_wa">WhatsApp da loja <span class="hint">(com DDD)</span></label><input id="s_wa" name="wa" type="tel" inputmode="tel" value="${esc(s.whatsapp_display)}" placeholder="(48) 98505-5020"><span class="fine">Os pedidos das clientes abrem a conversa com este número.</span></div>
        <div class="field"><label for="s_ig">Instagram <span class="hint">(@usuario ou link do perfil)</span></label><input id="s_ig" name="ig" type="text" value="${esc(s.instagram_url)}" placeholder="@luarmakeup10"></div>
        <div class="field"><label for="s_addr">Endereço da loja</label><input id="s_addr" name="address" type="text" maxlength="200" value="${esc(s.address)}"></div>
        <div class="field"><label for="s_pick">Instruções de retirada <span class="hint">(opcional)</span></label><textarea id="s_pick" name="pickup" maxlength="300" placeholder="Ex.: toque a campainha do bloco 8, fundos.">${esc(s.pickup_instructions)}</textarea><span class="fine">Não prometa horários que a loja não possa cumprir.</span></div>
        <div class="field"><label for="s_del">Instruções de entrega <span class="hint">(aparece em “Consultar entrega”)</span></label><textarea id="s_del" name="delivery" maxlength="300">${esc(s.delivery_instructions)}</textarea></div>
        <div class="field"><label for="s_low">Alerta de estoque baixo <span class="hint">(a partir de quantas unidades)</span></label><input id="s_low" name="low" type="number" inputmode="numeric" min="0" max="999" step="1" value="${esc(s.low_stock_threshold)}"></div>
        <button class="btn btn-primary" type="submit" id="setBtn">Salvar configurações</button>
      </form>`;
  }

  /* ---------- Estrutura ---------- */
  const TABS = [['produtos', 'Produtos', icon2.box], ['categorias', 'Categorias', icon2.tag], ['config', 'Configurações', icon2.settings]];
  function panelHtml() {
    return `<div class="admin"><div class="admin__bar"><div class="wrap">
      <div class="brand">${brandHtml}<small>&nbsp;· administração</small></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><small>${esc(st.user?.email || '')}</small>
        <button class="btn btn-small btn-ghost" data-action="back">${icon.back} Ver a loja</button>
        <button class="btn btn-small btn-gold" data-action="logout">Sair</button></div>
    </div></div>
    <div class="wrap admin__main">
      ${store.mode !== 'supabase' ? `<div class="alert alert--info" role="note"><span><b>Prévia.</b> Alterações ficam só nesta aba e somem ao recarregar. ${store.mode === 'demo' ? 'Configure o Supabase para salvar de verdade (veja o README).' : 'Na versão publicada, tudo é salvo no Supabase.'}</span></div>` : ''}
      <div class="tabs" role="tablist" aria-label="Seções do painel">${TABS.map(([id, label, ic]) => `<button class="tab" role="tab" data-action="tab" data-tab="${id}" aria-selected="${st.tab === id}">${ic}<span>${label}</span></button>`).join('')}</div>
      <div id="flash">${flashHtml()}</div>
      <div id="tabBody" style="display:grid;gap:16px;min-width:0"></div>
    </div>
    <div id="modalRoot"></div></div>`;
  }

  function renderTab() {
    const body = $('#tabBody', root);
    if (!body) return;
    body.innerHTML = st.tab === 'categorias' ? categoriesTabHtml() : st.tab === 'config' ? settingsTabHtml() : productsTabHtml();
    if (st.tab === 'produtos') renderList();
  }

  /* ---------- Modais ---------- */
  function formHtml(p) {
    const isNew = !p.id;
    const cats = [...new Set([...catNames(), p.category].filter(Boolean))];
    const sel = p.category || cats[0] || '';
    return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="fTitle" data-action="modalBg"><form class="modal__box" id="pform" novalidate>
      <h2 id="fTitle">${isNew ? 'Novo produto' : 'Editar produto'}</h2>
      <div id="formMsg"></div>
      <div class="field"><label for="f_name">Nome</label><input id="f_name" name="name" type="text" maxlength="120" required value="${esc(p.name || '')}"></div>
      <div class="field"><label for="f_desc">Descrição curta <span class="hint">(opcional, até 140 letras)</span></label><input id="f_desc" name="description" type="text" maxlength="140" value="${esc(p.description || '')}"></div>
      <div class="field"><label for="f_cat">Categoria</label><select id="f_cat" name="category">${cats.map((c) => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="field stockbox"><label for="f_stock">Unidades em estoque <span class="hint">(opcional)</span></label>
        <input id="f_stock" name="stock" type="number" inputmode="numeric" min="0" max="99999" step="1" placeholder="Deixe vazio se não controla" value="${hasStockInfo(p) ? esc(p.stock) : ''}">
        <span class="fine">Com um número informado, a cliente não consegue pedir mais do que isso. Zero = esgotado.</span></div>
      <div class="field"><label for="f_file">Foto do produto</label>
        <div class="imgpick"><div class="imgpick__prev" id="prev">${p.image_url ? productImageHtml(p, store.mode) : placeholderHtml(p.category, p.name)}</div>
          <div style="display:grid;gap:8px"><input id="f_file" type="file" accept="image/jpeg,image/png,image/webp"><span class="fine">Tire a foto agora ou escolha da galeria. JPG, PNG ou WebP; ela é reduzida automaticamente.</span></div></div></div>
      <div class="field"><label for="f_url">Ou cole o link de uma imagem <span class="hint">(opcional)</span></label><input id="f_url" name="image_url" type="url" inputmode="url" placeholder="https://" value="${esc(p.image_url || '')}"></div>
      <label class="check"><input type="checkbox" name="available" ${p.available === false ? '' : 'checked'}> Disponível para compra</label>
      <label class="check"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Mostrar em destaque na página inicial</label>
      <div class="priceLock">${icon.lock}<div>Preço: ${UNIT_PRICE_LABEL}<small>Fixo para todos os produtos.</small></div></div>
      <div class="modal__actions"><button type="button" class="btn btn-ghost" data-action="closeModal">Cancelar</button><button type="submit" class="btn btn-primary" id="saveBtn">Salvar produto</button></div>
    </form></div>`;
  }

  function catFormHtml(c) {
    return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="cfTitle" data-action="modalBg"><form class="modal__box" id="catEditForm" novalidate>
      <h2 id="cfTitle">Renomear categoria</h2><div id="formMsg"></div>
      <div class="field"><label for="ce_name">Nome</label><input id="ce_name" name="name" type="text" maxlength="40" required value="${esc(c.name)}"></div>
      <p class="fine">Os produtos desta categoria passam a usar o novo nome automaticamente.</p>
      <div class="modal__actions"><button type="button" class="btn btn-ghost" data-action="closeModal">Cancelar</button><button type="submit" class="btn btn-primary" id="saveBtn">Salvar</button></div>
    </form></div>`;
  }

  function confirmHtml({ title, text, action, label }) {
    return `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="cTitle" data-action="modalBg"><div class="modal__box">
      <h2 id="cTitle">${esc(title)}</h2><p style="margin:0">${text}</p><div id="formMsg"></div>
      <div class="modal__actions"><button class="btn btn-ghost" data-action="closeModal">Cancelar</button><button class="btn btn-danger" id="confirmBtn" data-action="${action}">${esc(label)}</button></div></div></div>`;
  }

  function openModal(html) { $('#modalRoot', root).innerHTML = html; const f = $('#modalRoot input, #modalRoot .btn', root); f?.focus(); }
  function closeModal() { const m = $('#modalRoot', root); if (m) m.innerHTML = ''; st.modal = null; }
  const modalMsg = (msg) => { const el = $('#formMsg', root); if (el) el.innerHTML = msg ? `<div class="alert alert--error" role="alert"><span>${esc(msg)}</span></div>` : ''; };
  const byId = (id) => products().find((p) => p.id === id);
  const catById = (id) => categories().find((c) => c.id === id);

  /* ---------- Telas ---------- */
  async function enter(user) {
    st.user = user; st.loginError = '';
    await ctx.loadProducts();
    if (alive) show();
  }

  function show() {
    if (st.checking) { root.innerHTML = `<div class="admin"><div class="wrap"><div class="login"><p>Verificando acesso…</p></div></div></div>`; return; }
    if (!st.user) { root.innerHTML = loginHtml(); $('#email', root)?.focus(); return; }
    root.innerHTML = panelHtml();
    renderTab();
  }

  async function refreshUser() {
    try { st.user = await store.getAdmin(); } catch (e) { console.error(e); st.user = null; st.loginError = friendlyError(e, 'login'); }
    st.checking = false;
    if (alive) show();
  }

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = e.target.id;
    if (id === 'loginForm') {
      const email = e.target.email.value.trim(); const password = e.target.password.value;
      const msg = $('#loginMsg', root);
      if (!email || !password) { msg.innerHTML = '<div class="alert alert--error" role="alert"><span>Preencha o e-mail e a senha.</span></div>'; return; }
      const btn = $('#loginBtn', root); btn.disabled = true; btn.textContent = 'Entrando…';
      try { await enter(await store.signIn(email, password)); }
      catch (err) {
        console.error(err);
        btn.disabled = false; btn.textContent = 'Entrar';
        msg.innerHTML = `<div class="alert alert--error" role="alert"><span>${esc(friendlyError(err, 'login'))}</span></div>`;
      }
    } else if (id === 'pform') await submitProduct(e.target);
    else if (id === 'catForm') await submitNewCategory(e.target);
    else if (id === 'catEditForm') await submitRenameCategory(e.target);
    else if (id === 'setForm') await submitSettings(e.target);
  });

  async function submitProduct(form) {
    const editing = st.modal && st.modal.id ? st.modal : null;
    const name = form.name.value.trim();
    const description = form.description.value.trim();
    const category = form.category.value;
    const image_url = form.image_url.value.trim();
    const stockRaw = form.stock.value.trim();
    if (name.length < 2) { modalMsg('Escreva o nome do produto (mínimo de 2 letras).'); form.name.focus(); return; }
    if (!category) { modalMsg('Cadastre uma categoria na aba Categorias antes de salvar o produto.'); return; }
    if (image_url && !/^(https?:\/\/|blob:)/i.test(image_url)) { modalMsg('O link da imagem precisa começar com https://'); form.image_url.focus(); return; }
    let stock = null;
    if (stockRaw !== '') {
      if (!/^\d+$/.test(stockRaw)) { modalMsg('O estoque deve ser um número inteiro, zero ou maior. Deixe vazio se não controla.'); form.stock.focus(); return; }
      stock = Number(stockRaw);
    }
    const btn = $('#saveBtn', root); btn.disabled = true; btn.textContent = 'Salvando…'; modalMsg('');
    try {
      await store.saveProduct({
        id: editing?.id, name, description, category, image_url, stock,
        available: form.available.checked, featured: form.featured.checked,
        _oldImage: editing?.image_url || '',
      });
      closeModal(); await reload(); flash('ok', 'Produto salvo.');
    } catch (err) {
      console.error(err); btn.disabled = false; btn.textContent = 'Salvar produto'; modalMsg(friendlyError(err, 'save'));
    }
  }

  const catMsg = (type, msg) => { const el = $('#catMsg', root); if (el) el.innerHTML = msg ? `<div class="alert alert--${type}" role="${type === 'error' ? 'alert' : 'status'}"><span>${esc(msg)}</span></div>` : ''; };

  async function submitNewCategory(form) {
    const name = form.name.value.trim();
    if (!name) { catMsg('error', 'Escreva o nome da categoria.'); form.name.focus(); return; }
    try { await store.saveCategory({ name }); await reload(); flash('ok', 'Categoria adicionada.'); }
    catch (err) { console.error(err); catMsg('error', friendlyError(err, 'category')); }
  }
  async function submitRenameCategory(form) {
    const c = st.modal; const name = form.name.value.trim();
    if (!name) { modalMsg('Escreva o nome da categoria.'); return; }
    const btn = $('#saveBtn', root); btn.disabled = true; btn.textContent = 'Salvando…';
    try { await store.saveCategory({ id: c.id, name }); closeModal(); await reload(); flash('ok', 'Categoria renomeada.'); }
    catch (err) { console.error(err); btn.disabled = false; btn.textContent = 'Salvar'; modalMsg(friendlyError(err, 'category')); }
  }
  async function moveCategory(id, delta) {
    const ids = categories().map((c) => c.id); const i = ids.indexOf(id); const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await store.reorderCategories(ids); await reload(); }
    catch (err) { console.error(err); flash('error', friendlyError(err, 'category')); }
  }

  async function submitSettings(form) {
    const msg = (type, t) => { const el = $('#setMsg', root); if (el) el.innerHTML = t ? `<div class="alert alert--${type}" role="${type === 'error' ? 'alert' : 'status'}"><span>${esc(t)}</span></div>` : ''; };
    const phone = parsePhone(form.wa.value);
    if (!phone) { msg('error', 'Número de WhatsApp inválido. Use o DDD e o número, por exemplo (48) 98505-5020.'); form.wa.focus(); return; }
    const ig = parseInstagram(form.ig.value);
    if (!ig) { msg('error', 'Instagram inválido. Use @usuario ou o link do perfil (https://www.instagram.com/usuario/).'); form.ig.focus(); return; }
    const address = form.address.value.trim();
    if (address.length < 5) { msg('error', 'Escreva o endereço da loja.'); form.address.focus(); return; }
    const lowRaw = form.low.value.trim();
    if (!/^\d{1,3}$/.test(lowRaw)) { msg('error', 'O alerta de estoque baixo deve ser um número entre 0 e 999.'); form.low.focus(); return; }
    const btn = $('#setBtn', root); btn.disabled = true; btn.textContent = 'Salvando…'; msg('', '');
    try {
      await store.saveSettings({
        whatsapp_number: phone, whatsapp_display: form.wa.value.trim(),
        instagram_url: ig.url, instagram_handle: ig.handle, address,
        pickup_instructions: form.pickup.value.trim(), delivery_instructions: form.delivery.value.trim(),
        low_stock_threshold: Number(lowRaw),
      });
      await ctx.loadProducts(); if (!alive) return;
      renderTab(); flash('ok', 'Configurações salvas. A loja já usa os novos dados.');
    } catch (err) { console.error(err); btn.disabled = false; btn.textContent = 'Salvar configurações'; msg('error', friendlyError(err, 'settings')); }
  }

  root.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.id === 'a_cat') { st.f.cat = t.value; renderList(); }
    if (t.id === 'a_avail') { st.f.avail = t.value; renderList(); }
    if (t.id === 'a_sort') { st.f.sort = t.value; renderList(); }
    if (t.matches('[data-action="toggle"]')) {
      const p = byId(t.dataset.id); if (!p) return;
      const next = t.checked; t.disabled = true;
      try { await store.setAvailable(p.id, next); await reload(); flash('ok', next ? 'Produto disponível na vitrine.' : 'Produto marcado como indisponível.'); }
      catch (err) { console.error(err); t.checked = !next; t.disabled = false; flash('error', friendlyError(err, 'save')); }
    }
    if (t.id === 'f_file' && t.files && t.files[0]) {
      const file = t.files[0]; modalMsg('');
      const prev = $('#prev', root); const url = $('#f_url', root); const save = $('#saveBtn', root);
      save.disabled = true; prev.innerHTML = '<div class="ph"><span>Enviando…</span></div>';
      try {
        const link = await store.uploadImage(file);
        url.value = link;
        prev.innerHTML = `<img src="${esc(link)}" alt="Prévia da foto">`;
      } catch (err) {
        console.error(err); modalMsg(friendlyError(err, 'upload')); prev.innerHTML = placeholderHtml('');
      }
      save.disabled = false;
    }
  });
  root.addEventListener('input', (e) => {
    if (e.target.id === 'a_q') { st.f.q = e.target.value; renderList(); }
    if (e.target.id === 'f_url') {
      const v = e.target.value.trim(); const prev = $('#prev', root);
      if (prev) prev.innerHTML = /^(https?:\/\/|blob:)/i.test(v) ? `<img src="${esc(v)}" alt="Prévia da foto" data-cat="" data-name="">` : placeholderHtml('');
    }
  });

  root.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'modalBg') { if (e.target === el) closeModal(); return; }
    if (a === 'toggle') return;
    if (a === 'back') ctx.goStore();
    else if (a === 'tab') { st.tab = el.dataset.tab; st.flash = null; root.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === st.tab))); $('#flash', root).innerHTML = ''; renderTab(); }
    else if (a === 'preview') { try { await enter(await store.signIn()); } catch (err) { console.error(err); } }
    else if (a === 'logout') { try { await store.signOut(); } catch (err) { console.error(err); } st.user = null; show(); }
    else if (a === 'dismiss') { st.flash = null; $('#flash', root).innerHTML = ''; }
    else if (a === 'reload') { await reload(); }
    else if (a === 'clearFilters') { st.f = { q: '', cat: '', avail: '', featured: false, low: false, sort: st.f.sort }; renderTab(); }
    else if (a === 'toggleFeatured') { st.f.featured = !st.f.featured; el.setAttribute('aria-pressed', String(st.f.featured)); renderList(); }
    else if (a === 'toggleLow') { st.f.low = !st.f.low; el.setAttribute('aria-pressed', String(st.f.low)); renderList(); }
    else if (a === 'showLow') { st.f.low = true; renderTab(); }
    else if (a === 'new') { st.modal = {}; openModal(formHtml({ available: true })); }
    else if (a === 'edit') { const p = byId(el.dataset.id); if (p) { st.modal = p; openModal(formHtml(p)); } }
    else if (a === 'closeModal') closeModal();
    else if (a === 'askDelete') {
      const p = byId(el.dataset.id); if (!p) return;
      st.modal = p;
      openModal(confirmHtml({ title: 'Remover produto?', text: `“${esc(p.name)}” será removido da vitrine e não pode ser recuperado. Se quiser só esconder, marque como indisponível.`, action: 'doDelete', label: 'Remover' }));
    } else if (a === 'doDelete') {
      const p = st.modal; if (!p) return;
      el.disabled = true; el.textContent = 'Removendo…'; modalMsg('');
      try { await store.deleteProduct(p.id, p.image_url); closeModal(); await reload(); flash('ok', 'Produto removido.'); }
      catch (err) { console.error(err); el.disabled = false; el.textContent = 'Remover'; modalMsg(friendlyError(err, 'delete')); }
    } else if (a === 'askDemo') {
      const n = products().filter((p) => p.is_demo).length;
      st.modal = { demo: true };
      openModal(confirmHtml({ title: 'Remover os produtos de exemplo?', text: `${n} ${n === 1 ? 'produto de exemplo será removido' : 'produtos de exemplo serão removidos'}. Os produtos que você cadastrou continuam na vitrine.`, action: 'doDemo', label: 'Remover exemplos' }));
    } else if (a === 'doDemo') {
      el.disabled = true; el.textContent = 'Removendo…'; modalMsg('');
      try { await store.deleteDemoProducts(); closeModal(); await reload(); flash('ok', 'Produtos de exemplo removidos.'); }
      catch (err) { console.error(err); el.disabled = false; el.textContent = 'Remover exemplos'; modalMsg(friendlyError(err, 'delete')); }
    } else if (a === 'catUp') await moveCategory(el.dataset.id, -1);
    else if (a === 'catDown') await moveCategory(el.dataset.id, 1);
    else if (a === 'catEdit') { const c = catById(el.dataset.id); if (c) { st.modal = c; openModal(catFormHtml(c)); } }
    else if (a === 'catAskDelete') {
      const c = catById(el.dataset.id); if (!c) return;
      const n = products().filter((p) => p.category === c.name).length;
      if (n) { flash('error', `A categoria “${c.name}” ainda tem ${n} ${n === 1 ? 'produto' : 'produtos'}. Mude esses produtos de categoria antes de removê-la.`); return; }
      st.modal = c;
      openModal(confirmHtml({ title: 'Remover categoria?', text: `A categoria “${esc(c.name)}” será removida. Ela não tem produtos.`, action: 'doCatDelete', label: 'Remover' }));
    } else if (a === 'doCatDelete') {
      const c = st.modal; if (!c) return;
      el.disabled = true; el.textContent = 'Removendo…';
      try { await store.deleteCategory(c.id); closeModal(); await reload(); flash('ok', 'Categoria removida.'); }
      catch (err) { console.error(err); el.disabled = false; el.textContent = 'Remover'; modalMsg(friendlyError(err, 'category')); }
    }
  });

  const onKey = (e) => { if (e.key === 'Escape' && st.modal) closeModal(); };
  document.addEventListener('keydown', onKey);
  const unsubAuth = store.onAuthChange(async () => {
    const before = st.user?.email;
    try { st.user = await store.getAdmin(); } catch { st.user = null; }
    if (alive && (st.user?.email || '') !== (before || '') && !st.checking) show();
  });

  refreshUser().then(async () => { if (st.user) { await ctx.loadProducts(); if (alive) renderTab(); } });

  return () => { alive = false; document.removeEventListener('keydown', onKey); unsubAuth && unsubAuth(); };
}

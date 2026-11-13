import { detectInstall } from '../lib/pwa.js';

/**
 * "Instalar app": botão fixo no cabeçalho (#installBtn). A instalação é opcional.
 *  - Android com convite nativo: o botão abre o convite do navegador.
 *  - Demais casos: o botão abre uma janelinha com as instruções certas para o aparelho.
 *  - App já instalado: o botão some.
 * As instruções só abrem quando a pessoa toca no botão; nada reabre sozinho.
 */
let deferred = null;
let installed = false;
let sheet = null;
let lastFocus = null;

const shareIcon = '<svg class="ico ico-inline" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M8.5 7.5 12 4l3.5 3.5"/><path d="M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-1"/></svg>';
const downloadIcon = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/></svg>';

function isStandalone() {
  try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch { return false; }
}

function currentKind() {
  return detectInstall({
    ua: navigator.userAgent || '',
    platform: navigator.platform || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    standalone: installed || isStandalone(),
    hasPrompt: !!deferred,
  }).kind;
}

/** Botão do cabeçalho: ícone + "Instalar app" (em tela muito estreita, "Instalar"). */
export function installButtonHtml() {
  return `<button class="installbtn" id="installBtn" type="button" data-install aria-label="Instalar app da Luar Make Up" hidden>${downloadIcon}<span class="installbtn__long">Instalar app</span><span class="installbtn__short" aria-hidden="true">Instalar</span></button>`;
}

const CONTENT = {
  'ios-safari': {
    title: 'Instalar no iPhone',
    html: `<ol class="sheet__steps"><li>Toque em <b>Compartilhar</b> ${shareIcon} na barra do Safari.</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>.</li></ol><p class="sheet__note">O ícone da Luar Make Up aparece na tela inicial.</p>`,
  },
  'ios-other': {
    title: 'Abra no Safari para instalar',
    html: `<p>No iPhone, a instalação é feita pelo <b>Safari</b>. Abra este endereço no Safari e siga:</p><ol class="sheet__steps"><li>Toque em <b>Compartilhar</b> ${shareIcon}.</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>.</li></ol>`,
    copy: true,
  },
  'inapp-ios': {
    title: 'Abra no Safari para instalar',
    html: `<p>Você está no navegador de dentro de outro app (como o Instagram), que não instala aplicativos.</p><ol class="sheet__steps"><li>Toque nos três pontinhos (<b>⋯</b>) ou no ícone de bússola e escolha <b>Abrir no Safari</b>. Se não achar, copie o link abaixo e cole no Safari.</li><li>No Safari, toque em <b>Compartilhar</b> ${shareIcon}.</li><li>Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li></ol>`,
    copy: true,
  },
  'inapp-android': {
    title: 'Abra no Chrome para instalar',
    html: `<p>Você está no navegador de dentro de outro app (como o Instagram), que não instala aplicativos.</p><ol class="sheet__steps"><li>Toque nos três pontinhos (<b>⋮</b>) e escolha <b>Abrir no Chrome</b> (ou <b>Abrir no navegador</b>). Se não achar, copie o link abaixo e cole no Chrome.</li><li>No Chrome, toque em <b>Instalar app</b> aqui no topo da loja ou no menu <b>⋮ → Instalar app</b>.</li></ol>`,
    copy: true,
  },
  android: {
    title: 'Instalar no Android',
    html: `<ol class="sheet__steps"><li>Toque no menu do navegador (<b>⋮</b>).</li><li>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme. O nome da opção pode variar conforme o navegador.</li></ol>`,
  },
  'mobile-other': {
    title: 'Instalar a loja no celular',
    html: `<p>No menu do navegador ou no botão de compartilhar, procure <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>. O caminho depende do navegador.</p><p class="sheet__note">Se for o iPhone, use o Safari: <b>Compartilhar → Adicionar à Tela de Início → Adicionar</b>.</p>`,
  },
};

/** Mostra ou esconde o botão do cabeçalho conforme o aparelho. */
export function refreshInstall() {
  const btn = document.getElementById('installBtn');
  if (!btn) return;
  const kind = currentKind();
  const show = kind !== 'installed' && kind !== 'none';
  btn.hidden = !show;
  btn.setAttribute('aria-haspopup', kind === 'prompt' ? 'false' : 'dialog');
  if (!show && sheet) closeSheet();
}

function closeSheet() {
  if (!sheet) return;
  sheet.remove(); sheet = null;
  document.removeEventListener('keydown', onSheetKey, true);
  document.body.style.overflow = '';
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  lastFocus = null;
}

function onSheetKey(e) {
  if (!sheet) return;
  if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
  if (e.key === 'Tab') {
    const f = [...sheet.querySelectorAll('button, a[href]')];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function openSheet(kind) {
  const c = CONTENT[kind];
  if (!c || sheet) return;
  lastFocus = document.activeElement;
  sheet = document.createElement('div');
  sheet.className = 'sheetwrap';
  sheet.innerHTML = `<div class="sheet__scrim" data-sheet-close></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
    <h2 id="sheetTitle">${c.title}</h2>
    <div class="sheet__body">${c.html}</div>
    <div class="sheet__actions">${c.copy ? '<button class="btn btn-ghost btn-small" type="button" data-sheet-copy>Copiar link da loja</button>' : ''}<button class="btn btn-primary btn-small" type="button" data-sheet-close>Entendi</button></div>
    <p class="sheet__msg" id="sheetMsg" role="status" aria-live="polite"></p>
  </div>`;
  document.body.appendChild(sheet);
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onSheetKey, true);
  sheet.querySelector('[data-sheet-close].btn')?.focus();
}

async function copyLink() {
  const msg = document.getElementById('sheetMsg');
  const url = location.origin + location.pathname;
  try { await navigator.clipboard.writeText(url); if (msg) msg.textContent = 'Link copiado. Cole no navegador.'; }
  catch { if (msg) msg.textContent = `Não foi possível copiar. O endereço é: ${url}`; }
}

async function onInstallClick() {
  const kind = currentKind();
  if (kind === 'prompt' && deferred) {
    const ev = deferred;
    deferred = null; // o convite só pode ser usado uma vez
    try {
      ev.prompt();
      const { outcome } = await ev.userChoice;
      if (outcome === 'accepted') installed = true;
    } catch (e) { console.warn('instalação', e); }
    refreshInstall();
    return;
  }
  openSheet(kind);
}

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; refreshInstall(); });
  window.addEventListener('appinstalled', () => { installed = true; deferred = null; refreshInstall(); });
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t.closest) return;
    if (t.closest('[data-install]')) onInstallClick();
    else if (t.closest('[data-sheet-copy]')) copyLink();
    else if (t.closest('[data-sheet-close]')) closeSheet();
  });
  try { window.matchMedia('(display-mode: standalone)').addEventListener('change', refreshInstall); } catch { /* navegador antigo */ }
}

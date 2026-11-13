import { detectInstall } from '../lib/pwa.js';
import { esc } from './dom.js';

/**
 * Bloco opcional "Instalar app" no fim da página. A loja funciona normalmente sem instalar.
 * Estado fica neste módulo; o convite nativo (beforeinstallprompt) pode chegar depois da página pronta.
 */
let deferred = null;
let installed = false;

const shareIcon = '<svg class="ico ico-inline" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M8.5 7.5 12 4l3.5 3.5"/><path d="M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-1"/></svg>';

function isStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch { return false; }
}

export function installHtml() {
  return `<section class="install" id="install" hidden aria-label="Instalar o app da Luar Make Up"></section>`;
}

function bodyFor(kind) {
  const head = (t) => `<h3>${t}</h3>`;
  switch (kind) {
    case 'prompt':
      return { html: `${head('Instale o app da Luar Make Up')}<p>Acesse a loja direto da tela inicial do celular, sem precisar digitar o endereço.</p>`, button: true };
    case 'ios-safari':
      return { html: `${head('Coloque a Luar Make Up na tela inicial')}<ol class="install__steps"><li>Toque em <b>Compartilhar</b> ${shareIcon} na barra do Safari.</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>.</li></ol>` };
    case 'ios-other':
      return { html: `${head('Coloque a Luar Make Up na tela inicial')}<p>No iPhone, isso é feito pelo <b>Safari</b>. Abra este endereço no Safari, toque em <b>Compartilhar</b> ${shareIcon} e depois em <b>Adicionar à Tela de Início</b>.</p>` };
    case 'android':
      return { html: `${head('Instale o app da Luar Make Up')}<p>Abra o menu do navegador (<b>⋮</b>) e toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>. O nome da opção depende do navegador.</p>` };
    case 'mobile-other':
      return { html: `${head('Instale o app da Luar Make Up')}<p>No menu do navegador ou no botão de compartilhar, procure <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>. O caminho depende do navegador.</p>` };
    default:
      return null;
  }
}

/** Atualiza o bloco (se estiver na tela) conforme o que o aparelho permite. */
export function refreshInstall() {
  const el = document.getElementById('install');
  if (!el) return;
  const { kind } = detectInstall({
    ua: navigator.userAgent || '',
    platform: navigator.platform || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    standalone: installed || isStandalone(),
    hasPrompt: !!deferred,
  });
  const b = bodyFor(kind);
  if (!b) { el.hidden = true; el.innerHTML = ''; return; }
  el.innerHTML = `<div class="wrap"><div class="install__card"><div class="install__text">${b.html}</div>${b.button ? `<button class="btn btn-primary" type="button" data-install>Instalar app</button>` : ''}</div></div>`;
  el.hidden = false;
}

async function onInstallClick() {
  if (!deferred) return;
  const ev = deferred;
  deferred = null; // o convite só pode ser usado uma vez
  try {
    ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === 'accepted') installed = true;
  } catch (e) { console.warn('instalação', e); }
  refreshInstall();
}

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; refreshInstall(); });
  window.addEventListener('appinstalled', () => { installed = true; deferred = null; refreshInstall(); });
  document.addEventListener('click', (e) => { if (e.target.closest?.('[data-install]')) onInstallClick(); });
  try { window.matchMedia('(display-mode: standalone)').addEventListener('change', refreshInstall); } catch { /* navegador antigo */ }
}

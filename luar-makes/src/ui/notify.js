import { isPushSupported, isIOSStandaloneNeeded, notificationPermission, enablePush } from '../lib/push.js';
import { icon, icon2 } from './icons.js';

/**
 * Banner automático convidando a cliente a ativar notificações (produto novo/reforço).
 * Aparece sozinho (sem precisar procurar nenhum botão escondido), mas ela pode fechar quando
 * quiser — e, se fechar sem decidir, só volta a aparecer depois de um tempo, não toda visita.
 */
const DISMISS_KEY = 'luar-makes-notify-dismissed-until';

function isDismissed() {
  try { return Date.now() < Number(localStorage.getItem(DISMISS_KEY) || 0); } catch { return false; }
}
function dismiss(days) {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86400000)); } catch { /* sem storage: sem problema */ }
}

function shouldShow() {
  if (!isPushSupported()) return false;
  const p = notificationPermission();
  if (p === 'granted' || p === 'denied' || p === 'unsupported') return false;
  if (isDismissed()) return false;
  return true;
}

/** Container fixo no topo da loja — sempre presente no HTML, atualizado por refreshNotifyBar(). */
export function notifyBarContainerHtml() {
  return `<div id="notifyBar"></div>`;
}

function barHtml() {
  if (!shouldShow()) return '';
  if (isIOSStandaloneNeeded()) {
    return `<div class="notifybar" role="note">
      <span>${icon2.bell} <b>Quer saber quando chegar produto novo?</b> No iPhone, instale o app primeiro (botão "Instalar" aqui no topo) para poder ativar as notificações.</span>
      <button class="iconbtn" type="button" data-notify-dismiss aria-label="Fechar aviso">${icon.close}</button>
    </div>`;
  }
  return `<div class="notifybar" role="note">
    <span>${icon2.bell} <b>Quer saber quando chegar produto novo?</b> Ative as notificações e receba um aviso no celular.</span>
    <button class="btn btn-small btn-primary" type="button" data-notify-enable>Ativar notificações</button>
    <button class="iconbtn" type="button" data-notify-dismiss aria-label="Fechar aviso">${icon.close}</button>
  </div>`;
}

/** Chame de novo sempre que o estado puder ter mudado (início, ativou, fechou, permissão negada). */
export function refreshNotifyBar(root = document) {
  const el = root.querySelector ? root.querySelector('#notifyBar') : document.getElementById('notifyBar');
  if (el) el.innerHTML = barHtml();
}

export function initNotifyBanner(store, root = document) {
  root.addEventListener('click', async (e) => {
    const t = e.target;
    if (!t.closest) return;
    if (t.closest('[data-notify-dismiss]')) { dismiss(14); refreshNotifyBar(root); return; }
    const enableBtn = t.closest('[data-notify-enable]');
    if (!enableBtn) return;
    enableBtn.disabled = true; enableBtn.textContent = 'Ativando…';
    const r = await enablePush(store);
    if (r.ok) { refreshNotifyBar(root); return; }
    if (r.reason === 'denied') { dismiss(3650); refreshNotifyBar(root); return; } // bloqueou no navegador: não insiste mais
    enableBtn.disabled = false; enableBtn.textContent = 'Ativar notificações'; // erro passageiro: deixa tentar de novo
    // DEBUG TEMPORÁRIO: mostra o erro real pra diagnosticar. Remover depois.
    if (r.reason === 'error') {
      const dbg = document.createElement('div');
      dbg.style.cssText = 'background:#fee;color:#900;padding:8px;font-size:12px;word-break:break-all;';
      dbg.textContent = 'DEBUG: ' + (r.message || 'erro desconhecido');
      enableBtn.closest('.notifybar')?.appendChild(dbg);
    }
  });
}

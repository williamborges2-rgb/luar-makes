// Notificações push (Web Push). Tudo opcional: sem VAPID_PUBLIC_KEY configurado (variável de
// ambiente VITE_VAPID_PUBLIC_KEY), o recurso fica invisível — nenhuma função aqui faz nada.
import { VAPID_PUBLIC_KEY } from '../config.js';

/** O navegador/celular da cliente suporta notificações push? (iOS exige o app instalado — ver isIOSStandaloneNeeded). */
export function isPushSupported() {
  return !!VAPID_PUBLIC_KEY && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Função pura (testada em tests/push.test.mjs): no iPhone/iPad, notificação só funciona com o
 * site instalado na tela de início primeiro — diz se é esse o caso. */
export function detectIOSStandaloneNeeded({ ua = '', platform = '', maxTouchPoints = 0, standalone = false } = {}) {
  const isIpadOs = platform === 'MacIntel' && maxTouchPoints > 1; // iPad novo se apresenta como Mac
  const isIos = /iphone|ipad|ipod/i.test(ua) || isIpadOs;
  return isIos && !standalone;
}

/** No iPhone/iPad, notificação só funciona com o site instalado na tela de início primeiro. */
export function isIOSStandaloneNeeded() {
  return detectIOSStandaloneNeeded({
    ua: navigator.userAgent || '',
    platform: navigator.platform || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    standalone: window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true,
  });
}

export function notificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/** Função pura (testada em tests/push.test.mjs): o navegador exige a chave VAPID como bytes. */
export function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function toSubscriptionRow(sub) {
  const json = sub.toJSON();
  return { endpoint: json.endpoint, p256dh: json.keys?.p256dh || '', auth: json.keys?.auth || '' };
}

/**
 * Pede permissão (se preciso), assina o Push Manager e salva no Supabase via store.subscribePush.
 * Retorna { ok:true } ou { ok:false, reason: 'unsupported'|'ios'|'denied'|'error' }.
 */
export async function enablePush(store) {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (isIOSStandaloneNeeded()) return { ok: false, reason: 'ios' };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await store.subscribePush(toSubscriptionRow(sub));
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'error', message: (err && (err.message || err.error_description || err.code)) ? String(err.message || err.error_description || err.code) : String(err) };
  }
}

/** Se já havia uma assinatura ativa (ex.: outra sessão), garante que ela está salva no banco.
 * Se a permissão já foi concedida mas a inscrição técnica se perdeu (ex.: dados do navegador
 * foram limpos), cria uma nova sozinho — sem isso, como o banner só aparece com permissão
 * "indefinida", a cliente ficaria permitida mas nunca de fato inscrita. */
export async function resyncPushIfSubscribed(store) {
  if (!isPushSupported() || notificationPermission() !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await store.subscribePush(toSubscriptionRow(sub));
  } catch { /* melhor esforço: sem internet ou sem service worker pronto ainda */ }
}

export async function disablePush(store) {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await store.unsubscribePush(endpoint);
    }
  } catch { /* melhor esforço */ }
}

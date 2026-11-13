/**
 * Decide qual caminho de instalação oferecer. Função pura (testada em tests/pwa.test.mjs).
 *
 * `kind`:
 *  - 'installed'     já está aberto como app: não oferece nada
 *  - 'prompt'        o navegador ofereceu o convite nativo (Android/Chrome e similares)
 *  - 'ios-safari'    iPhone/iPad no Safari: Compartilhar → Adicionar à Tela de Início → Adicionar
 *  - 'ios-other'     iPhone/iPad em outro navegador (Chrome, Firefox...): abrir no Safari
 *  - 'inapp-ios'     navegador interno de outro app no iPhone (Instagram, Facebook...): abrir no Safari
 *  - 'inapp-android' navegador interno de outro app no Android: abrir no Chrome
 *  - 'android'       Android sem convite nativo: menu do navegador
 *  - 'mobile-other'  celular não identificado com segurança: ajuda genérica
 *  - 'none'          computador sem convite: sem botão
 */
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|MicroMessenger|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest|LinkedInApp|Twitter|GSA\/|; wv\)/i;

export function detectInstall({ ua = '', platform = '', maxTouchPoints = 0, standalone = false, hasPrompt = false } = {}) {
  if (standalone) return { kind: 'installed' };
  if (hasPrompt) return { kind: 'prompt' };
  const isIpadOs = platform === 'MacIntel' && maxTouchPoints > 1; // iPad novo se apresenta como Mac
  const isIos = /iPhone|iPad|iPod/.test(ua) || isIpadOs;
  if (isIos) {
    // WebView do iOS não traz "Safari/" na identificação
    if (IN_APP.test(ua) || !/Safari\//.test(ua)) return { kind: 'inapp-ios' };
    const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo/i.test(ua);
    return { kind: !otherBrowser && /Version\//.test(ua) ? 'ios-safari' : 'ios-other' };
  }
  if (/Android/.test(ua)) return { kind: IN_APP.test(ua) ? 'inapp-android' : 'android' };
  if (/Mobi/.test(ua)) return { kind: 'mobile-other' };
  return { kind: 'none' };
}

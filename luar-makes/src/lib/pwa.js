/**
 * Decide qual ajuda de instalação mostrar. Função pura (testada em tests/pwa.test.mjs).
 *
 * Retorna `kind`:
 *  - 'installed'    já está aberto como app: não mostra nada
 *  - 'prompt'       o navegador ofereceu o convite nativo (Android/Chrome e similares): botão "Instalar app"
 *  - 'ios-safari'   iPhone/iPad no Safari: Compartilhar → Adicionar à Tela de Início
 *  - 'ios-other'    iPhone/iPad em outro navegador ou dentro de outro app: abrir no Safari
 *  - 'android'      Android sem convite nativo: ajuda pelo menu do navegador
 *  - 'mobile-other' celular não identificado com segurança: ajuda genérica
 *  - 'none'         computador ou sem suporte: não mostra nada
 */
export function detectInstall({ ua = '', platform = '', maxTouchPoints = 0, standalone = false, hasPrompt = false } = {}) {
  if (standalone) return { kind: 'installed' };
  if (hasPrompt) return { kind: 'prompt' };
  const isIpadOs = platform === 'MacIntel' && maxTouchPoints > 1; // iPad novo se apresenta como Mac
  const isIos = /iPhone|iPad|iPod/.test(ua) || isIpadOs;
  if (isIos) {
    const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo|Instagram|FBAN|FBAV|FB_IAB|Line\/|MicroMessenger|TikTok|Snapchat/i.test(ua);
    const safari = /Safari\//.test(ua) && /Version\//.test(ua) && !otherBrowser;
    return { kind: safari ? 'ios-safari' : 'ios-other' };
  }
  if (/Android/.test(ua)) return { kind: 'android' };
  if (/Mobi/.test(ua)) return { kind: 'mobile-other' };
  return { kind: 'none' };
}

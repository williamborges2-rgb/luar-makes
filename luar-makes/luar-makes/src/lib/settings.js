import { DEFAULT_SETTINGS } from '../config.js';

/** Junta o que veio do banco com os valores iniciais e calcula o link do WhatsApp. */
export function normalizeSettings(raw = {}) {
  const s = { ...DEFAULT_SETTINGS };
  for (const k of Object.keys(DEFAULT_SETTINGS)) if (raw[k] !== undefined && raw[k] !== null) s[k] = raw[k];
  s.low_stock_threshold = Math.max(0, Math.floor(Number(s.low_stock_threshold)) || 0);
  s.whatsappUrl = `https://wa.me/${s.whatsapp_number}`;
  return s;
}

/** "(48) 98505-5020" -> "5548985055020". Devolve '' se não parecer um telefone. */
export function parsePhone(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return /^55\d{10,11}$/.test(d) ? d : '';
}

/** Aceita "@usuario" ou o link do perfil. Devolve { url, handle } ou null. */
export function parseInstagram(input) {
  const v = String(input || '').trim();
  if (!v) return null;
  const user = /^@?([A-Za-z0-9._]{1,30})$/.exec(v);
  if (user) return { url: `https://www.instagram.com/${user[1]}/`, handle: `@${user[1]}` };
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || !/(^|\.)instagram\.com$/i.test(u.hostname)) return null;
    const name = u.pathname.split('/').filter(Boolean)[0];
    if (!name || !/^[A-Za-z0-9._]{1,30}$/.test(name)) return null;
    return { url: `https://www.instagram.com/${name}/`, handle: `@${name}` };
  } catch { return null; }
}

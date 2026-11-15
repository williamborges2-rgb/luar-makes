// Edge Function: envia uma notificação push (Web Push) para quem ativou no site, avisando sobre
// um produto. Só a dona da loja (administradora) pode chamar isso — quem chama precisa estar
// logada no painel.
//
// Sem nenhuma dependência externa (nem npm, nem jsr): só `fetch` e Web Crypto, que já vêm prontos
// no Deno. Isso evita depender de bibliotecas Node (como a "web-push") que nem sempre funcionam
// bem nesse tipo de ambiente. A criptografia usada aqui (RFC 8291 + RFC 8292, o padrão "Web Push")
// foi conferida byte a byte contra a biblioteca "web-push" antes de publicar — ver o README.
//
// Variáveis de ambiente necessárias (ver README, seção "Notificações push"):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  -> geradas uma única vez, nunca mudam depois.
//   VAPID_SUBJECT                        -> "mailto:seu-email@exemplo.com" (contato da loja).
//   SITE_URL (opcional)                  -> endereço da loja publicada; sem isso, ao tocar na
//                                            notificação a cliente é levada para onde o app dela
//                                            já está instalado, que normalmente já é a loja certa.
// Já vêm prontas automaticamente (o Supabase sempre fornece): SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

// ---------- base64url ----------
function b64uEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concatBytes(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
const te = new TextEncoder();
// Só para o verificador de tipos: em tempo de execução é sempre o mesmo Uint8Array, sem cópia.
function bs(u: Uint8Array): BufferSource { return u as unknown as BufferSource; }

// ---------- VAPID (RFC 8292): JWT assinado (ES256) que identifica a loja perante o serviço de push ----------
async function vapidPrivateKeyFromRaw(publicKeyRaw: Uint8Array, privateKeyB64u: string): Promise<CryptoKey> {
  const x = publicKeyRaw.slice(1, 33), y = publicKeyRaw.slice(33, 65);
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: b64uEncode(x), y: b64uEncode(y), d: privateKeyB64u, ext: true, key_ops: ['sign'] },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}
async function buildVapidHeader(endpoint: string, vapidPublicKey: string, vapidPrivateKey: string, subject: string) {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header = b64uEncode(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64uEncode(te.encode(JSON.stringify({ aud, exp, sub: subject })));
  const unsigned = `${header}.${payload}`;
  const key = await vapidPrivateKeyFromRaw(b64uDecode(vapidPublicKey), vapidPrivateKey);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(unsigned)));
  const jwt = `${unsigned}.${b64uEncode(sig)}`;
  return `vapid t=${jwt}, k=${vapidPublicKey}`;
}

// ---------- Criptografia da mensagem (RFC 8291, "aes128gcm") ----------
async function hmac(keyBytes: Uint8Array, msgBytes: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', bs(keyBytes), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, bs(msgBytes)));
}

async function encryptPayload(p256dhB64u: string, authB64u: string, payloadObj: unknown) {
  const uaPublicRaw = b64uDecode(p256dhB64u); // chave pública do navegador da cliente (65 bytes)
  const authRaw = b64uDecode(authB64u);
  const saltRaw = crypto.getRandomValues(new Uint8Array(16));

  // Par de chaves efêmero "do servidor", um novo a cada mensagem (nunca reaproveitado).
  const asKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));

  const uaPublicKey = await crypto.subtle.importKey('raw', bs(uaPublicRaw), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPublicKey }, asKeyPair.privateKey, 256));

  // RFC 8291 §3.1 — combina o segredo ECDH com o "auth secret" que a inscrição trouxe.
  const keyInfo = concatBytes(te.encode('WebPush: info\0'), uaPublicRaw, asPublicRaw);
  const ikm = (await hmac(await hmac(authRaw, sharedSecret), concatBytes(keyInfo, new Uint8Array([1])))).slice(0, 32);

  // RFC 8188 (aes128gcm) — deriva a chave de conteúdo (CEK) e o nonce a partir do salt + IKM.
  const prk = await hmac(saltRaw, ikm);
  const cek = (await hmac(prk, concatBytes(te.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concatBytes(te.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);

  const plaintext = concatBytes(te.encode(JSON.stringify(payloadObj)), new Uint8Array([2])); // 2 = único/último registro
  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(nonce), tagLength: 128 }, cekKey, bs(plaintext)));

  // Cabeçalho do content-coding: salt(16) + record-size(4, BE, 4096) + tamanho do keyid(1) + keyid (chave pública efêmera).
  const rs = new Uint8Array([0, 0, 0x10, 0x00]); // 4096 em 4 bytes big-endian
  const header = concatBytes(saltRaw, rs, new Uint8Array([asPublicRaw.length]), asPublicRaw);
  return concatBytes(header, encrypted);
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payloadObj: unknown, vapid: { pub: string; priv: string; subject: string }) {
  const body = await encryptPayload(sub.p256dh, sub.auth, payloadObj);
  const authHeader = await buildVapidHeader(sub.endpoint, vapid.pub, vapid.priv, vapid.subject);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '604800', // 7 dias: se o celular ficar sem internet, o push ainda chega depois
      Authorization: authHeader,
    },
    body: body as unknown as BodyInit,
  });
  return res;
}

// ---------- Handler ----------
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
  const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT');
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return json({ error: 'missing_supabase_env' }, 500);
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return json({ error: 'missing_vapid_env', message: 'Faltam as variáveis VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY ou VAPID_SUBJECT. Veja o README.' }, 500);
  }

  // Só quem está logada como administradora pode disparar notificações.
  const authHeader = req.headers.get('Authorization') || '';
  const userClientHeaders = { apikey: ANON_KEY, Authorization: authHeader, 'Content-Type': 'application/json' };
  const isAdminRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: 'POST', headers: userClientHeaders, body: '{}' });
  const isAdmin = isAdminRes.ok && (await isAdminRes.json()) === true;
  if (!isAdmin) return json({ error: 'not_admin' }, 403);

  let productId: string | undefined;
  try { ({ productId } = await req.json()); } catch { /* corpo vazio/ inválido: cai no erro abaixo */ }
  if (!productId) return json({ error: 'missing_product_id' }, 400);

  const serviceHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=id,name`, { headers: serviceHeaders });
  const prodRows = prodRes.ok ? await prodRes.json() : [];
  const product = prodRows[0];
  if (!product) return json({ error: 'product_not_found' }, 404);

  const subsRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth`, { headers: serviceHeaders });
  if (!subsRes.ok) return json({ error: 'subscriptions_fetch_failed' }, 500);
  const subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> = await subsRes.json();

  // "url": opcional. Sem a variável SITE_URL configurada, o service worker da cliente usa o
  // próprio endereço onde ele está rodando (sempre correto) — ver public/sw.js.
  const payloadObj: Record<string, string> = {
    title: 'Luar Make Up',
    body: `Chegou: ${product.name}! Por R$ 10,00.`,
    tag: `product-${product.id}`,
  };
  const siteUrl = Deno.env.get('SITE_URL');
  if (siteUrl) payloadObj.url = siteUrl;

  const vapid = { pub: VAPID_PUBLIC_KEY, priv: VAPID_PRIVATE_KEY, subject: VAPID_SUBJECT };
  let sent = 0;
  const toRemove: string[] = [];

  await Promise.all(subs.map(async (sub) => {
    try {
      const res = await sendPush(sub, payloadObj, vapid);
      if (res.ok) sent++;
      else if (res.status === 404 || res.status === 410) toRemove.push(sub.id); // inscrição expirada/cancelada
    } catch (err) {
      console.error('push falhou', sub.id, err);
    }
  }));

  if (toRemove.length) {
    await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=in.(${toRemove.join(',')})`, { method: 'DELETE', headers: serviceHeaders });
  }
  await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
    method: 'PATCH', headers: serviceHeaders, body: JSON.stringify({ last_notified_at: new Date().toISOString() }),
  });

  return json({ sent, removed: toRemove.length });
});

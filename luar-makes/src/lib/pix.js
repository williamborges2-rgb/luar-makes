import QRCode from 'qrcode';

// Pagamento via Pix: gera o código "copia e cola" (o mesmo que vira QR Code) a partir da
// chave Pix da loja. Isto é só o padrão público do Banco Central (EMV/BR Code) — não depende
// de nenhum serviço externo nem de senha/token de banco, por isso dá pra montar o código aqui
// mesmo, sem backend. A loja NÃO recebe confirmação automática de pagamento (isso exigiria
// contratar um serviço de cobrança com o banco); o que dá pra fazer é mostrar a chave/QR Code
// certos e deixar registrado no pedido que a cliente diz ter pago.

export const PIX_KEY_TYPES = [
  { id: 'cpf', label: 'CPF' },
  { id: 'cnpj', label: 'CNPJ' },
  { id: 'email', label: 'E-mail' },
  { id: 'celular', label: 'Celular' },
  { id: 'aleatoria', label: 'Chave aleatória' },
];

/** "123.456.789-09" -> "12345678909" (só dígitos). */
function onlyDigits(v) { return String(v || '').replace(/\D/g, ''); }

/**
 * Valida e normaliza a chave Pix conforme o tipo escolhido, no formato que o Banco Central
 * espera dentro do QR Code (ex.: celular precisa do "+55" na frente). Devolve
 * { ok: true, value } ou { ok: false, error }.
 */
export function normalizePixKey(type, raw) {
  const v = String(raw || '').trim();
  if (!v) return { ok: false, error: 'Informe a chave Pix.' };
  if (type === 'cpf') {
    const d = onlyDigits(v);
    return d.length === 11 ? { ok: true, value: d } : { ok: false, error: 'CPF inválido: digite os 11 números do CPF.' };
  }
  if (type === 'cnpj') {
    const d = onlyDigits(v);
    return d.length === 14 ? { ok: true, value: d } : { ok: false, error: 'CNPJ inválido: digite os 14 números do CNPJ.' };
  }
  if (type === 'email') {
    const email = v.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { ok: true, value: email } : { ok: false, error: 'E-mail inválido.' };
  }
  if (type === 'celular') {
    let d = onlyDigits(v);
    if (d.length === 10 || d.length === 11) d = '55' + d;
    return /^55\d{10,11}$/.test(d) ? { ok: true, value: `+${d}` } : { ok: false, error: 'Celular inválido. Use o DDD, por exemplo (48) 98505-5020.' };
  }
  // chave aleatória (EVP): formato de UUID, com ou sem hífens.
  const compact = v.replace(/-/g, '').toLowerCase();
  if (/^[0-9a-f]{32}$/.test(compact)) {
    const u = `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
    return { ok: true, value: u };
  }
  return { ok: false, error: 'Chave aleatória inválida. Copie exatamente como aparece no app do banco (ex.: 123e4567-e89b-12d3-a456-426614174000).' };
}

/** Só pra mostrar na tela do painel, de um jeito mais fácil de ler (não é o valor salvo). */
export function formatPixKeyForDisplay(type, value) {
  if (!value) return '';
  if (type === 'cpf') return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (type === 'cnpj') return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (type === 'celular') return value.replace(/^\+55(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3');
  return value;
}

/** Remove acento e qualquer caractere fora do padrão aceito pelos campos do BR Code. */
function pixAscii(s, max) {
  const noAccents = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ascii = noAccents.replace(/[^A-Za-z0-9 ]/g, '').trim().toUpperCase();
  return (ascii || '').slice(0, max);
}

function emv(id, value) {
  const v = String(value);
  return `${id}${String(v.length).padStart(2, '0')}${v}`;
}

/** CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — exigido no final do código Pix. */
function crc16ccitt(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Monta o código Pix "copia e cola" (padrão BR Code do Banco Central). `amountCents` é opcional:
 * com ele, o código já vem com o valor do pedido preenchido; sem ele, é uma chave genérica.
 */
export function buildPixPayload({ key, receiverName, city, amountCents, txid = 'LUARMAKES' } = {}) {
  const merchantName = pixAscii(receiverName, 25) || 'LUAR MAKE UP';
  const merchantCity = pixAscii(city, 15) || 'FLORIANOPOLIS';
  const refLabel = pixAscii(txid, 25).replace(/\s+/g, '') || '***';
  const hasAmount = Number.isFinite(amountCents) && amountCents > 0;

  let p = '';
  p += emv('00', '01'); // Payload Format Indicator
  p += emv('01', hasAmount ? '12' : '11'); // Point of Initiation Method
  p += emv('26', emv('00', 'BR.GOV.BCB.PIX') + emv('01', key));
  p += emv('52', '0000'); // Merchant Category Code (genérico)
  p += emv('53', '986'); // Moeda: Real (ISO 4217)
  if (hasAmount) p += emv('54', (amountCents / 100).toFixed(2));
  p += emv('58', 'BR');
  p += emv('59', merchantName);
  p += emv('60', merchantCity);
  p += emv('62', emv('05', refLabel));
  p += '6304';
  return p + crc16ccitt(p);
}

/** SVG pronto do QR Code (string), gerado 100% no navegador — sem chamar nenhum serviço externo. */
export async function pixQrSvg(payload) {
  return QRCode.toString(payload, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
}

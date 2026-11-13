/** Reduz a imagem no navegador (lado maior 1200 px, JPEG) antes de enviar. */
export async function shrinkImage(file, maxSide = 1200, quality = 0.85) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('mime type not supported');
  if (file.size > 15 * 1024 * 1024) throw new Error('payload too large');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // PNG transparente vira fundo branco
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('could not encode image');
  return blob;
}

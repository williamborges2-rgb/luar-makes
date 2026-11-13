// Baixa as fotos dos produtos de exemplo para dentro do projeto (public/products/)
// e troca os links em src/data/demo-products.json pelos arquivos locais.
// Assim o site publicado não depende do site do fornecedor para mostrar as fotos.
//
// Uso:   npm run images        (precisa de internet; leva alguns segundos)
//        npm run seed:sql      (regenera supabase/seed.sql com os novos caminhos)
//
// Opções (para testes): --file caminho/do.json  --out pasta/de/saida
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : fallback; };
const jsonPath = resolve(arg('--file', join(root, 'src/data/demo-products.json')));
const outDir = resolve(arg('--out', join(root, 'public/products')));
mkdirSync(outDir, { recursive: true });

const products = JSON.parse(readFileSync(jsonPath, 'utf8'));
const OK_TYPES = ['image/webp', 'image/jpeg', 'image/png'];
let done = 0, skipped = 0; const failed = [];

for (const p of products) {
  const url = p.image_url || '';
  if (!/^https?:\/\//i.test(url)) { skipped++; continue; }
  const ext = (extname(new URL(url).pathname) || '.webp').toLowerCase();
  const slug = p.id.replace(/^demo-/, '');
  const file = `${slug}${ext}`;
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'luar-makes-setup/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!OK_TYPES.includes(type)) throw new Error(`tipo inesperado: ${type || 'desconhecido'}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) throw new Error('arquivo pequeno demais');
    writeFileSync(join(outDir, file), buf);
    p.image_url = `/products/${file}`;
    done++;
    console.log(`ok     ${p.name}`);
  } catch (e) {
    failed.push(p.name);
    console.warn(`falhou ${p.name}: ${e.message} (o link original foi mantido)`);
  }
}

writeFileSync(jsonPath, JSON.stringify(products, null, 2) + '\n');
console.log(`\n${done} foto(s) baixada(s), ${skipped} já local/sem foto, ${failed.length} com falha.`);
if (failed.length) { console.log('Rode "npm run images" de novo mais tarde para tentar os que falharam.'); process.exitCode = 1; }
else console.log('Agora rode: npm run seed:sql   (e depois npm run build)');

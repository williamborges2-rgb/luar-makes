// Gera supabase/seed.sql a partir de src/data/demo-products.json.
// Uso: npm run seed:sql   (rode de novo depois de "npm run images", para apontar para as fotos locais)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const products = JSON.parse(readFileSync(join(root, 'src/data/demo-products.json'), 'utf8'));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const rows = products.map((p, i) =>
  `  (${q(p.name)}, ${q(p.description || '')}, ${q(p.category)}, ${p.image_url ? q(p.image_url) : 'null'}, ${p.available !== false}, ${!!p.featured}, ${p.stock === null || p.stock === undefined ? 'null::integer' : p.stock}, true, ${p.sort_order ?? i})`);

const sql = `-- =====================================================================
-- Produtos de EXEMPLO da Luar Makes (gerado por scripts/make-seed.mjs)
-- Rode DEPOIS de schema.sql. Só insere se a tabela products estiver vazia,
-- então é seguro rodar de novo. Todos ficam marcados como is_demo = true.
-- Para remover todos de uma vez:
--   delete from public.products where is_demo;
-- (ou use o botão "Remover produtos de exemplo" no painel #admin)
--
-- Nomes e fotos vêm do catálogo do fornecedor RS Makes, só como demonstração da vitrine.
-- A Luar Makes não é afiliada nem patrocinada pela RS Makes. Substitua por produtos
-- e fotos reais da loja. O preço não é informado: o banco aplica R$ 10,00 a todos.
-- Estoque nulo = não informado (sem limite no carrinho): a loja ainda não registrou quantidades.
-- =====================================================================
insert into public.products (name, description, category, image_url, available, featured, stock, is_demo, sort_order)
select v.*
from (values
${rows.join(',\n')}
) as v(name, description, category, image_url, available, featured, stock, is_demo, sort_order)
where not exists (select 1 from public.products);
`;
writeFileSync(join(root, 'supabase/seed.sql'), sql);
console.log(`supabase/seed.sql gerado com ${products.length} produtos de exemplo.`);

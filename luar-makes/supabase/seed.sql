-- =====================================================================
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
insert into public.products (name, description, category, image_url, available, featured, stock, is_demo, sort_order, colors)
select v.*
from (values
  ('Gloss Labial - Vivai Good Girl', '', 'Lábios e gloss', 'https://arquivos.facilzap.app.br/produtos/1786865930_8cebbbd8c19f2c8ab09b.webp', true, true, null::integer, true, 0, '[{"name":"Nude","hex":"#d8a488"},{"name":"Rosa","hex":"#e9a4b0"},{"name":"Cereja","hex":"#b4283f"}]'::jsonb),
  ('Lip Oil - Lua e Neve', '', 'Lábios e gloss', 'https://arquivos.facilzap.app.br/produtos/1786883558_d0bd6bc5403eef8602c2.webp', true, false, null::integer, true, 1, '[{"name":"Natural","hex":"#e3b89a"},{"name":"Rosa","hex":"#e9a4b0"}]'::jsonb),
  ('Mini Batom Princesa - Vivai', '', 'Lábios e gloss', 'https://arquivos.facilzap.app.br/produtos/1789689352_dd2e25325c24e5ea4bc3.webp', true, true, null::integer, true, 2, '[]'::jsonb),
  ('Batom 24H - Miamake', '', 'Lábios e gloss', 'https://arquivos.facilzap.app.br/produtos/1789314609_efc7e20c46f1d842dd2e.webp', true, false, null::integer, true, 3, '[{"name":"Nude","hex":"#d8a488"},{"name":"Rosa","hex":"#e9a4b0"},{"name":"Coral","hex":"#e8775c"},{"name":"Vinho","hex":"#6e2a3a"}]'::jsonb),
  ('Brilho Labial Cheirinho de Morango - Vivai', '', 'Lábios e gloss', 'https://arquivos.facilzap.app.br/produtos/1788386564_acf813b8a1b349f29495.webp', true, false, null::integer, true, 4, '[]'::jsonb),
  ('Lip Gloss Teddy - Vivai', '', 'Lábios e gloss', 'https://arquivos.facilzap.app.br/produtos/1786883027_02f7f1cef34979ad79b7.webp', true, true, null::integer, true, 5, '[{"name":"Nude","hex":"#d8a488"},{"name":"Rosa","hex":"#e9a4b0"},{"name":"Cereja","hex":"#b4283f"}]'::jsonb),
  ('Gloss espiral - We candy', '', 'Lábios e gloss', 'https://arquivos.facilzap.app.br/produtos/1790806346_095d5b9d74bdbef2e97e.webp', true, false, null::integer, true, 6, '[{"name":"Nude","hex":"#d8a488"},{"name":"Rosa","hex":"#e9a4b0"},{"name":"Cereja","hex":"#b4283f"}]'::jsonb),
  ('Bloomy Gloss - Vivai', '', 'Lábios e gloss', 'https://arquivos.facilzap.app.br/produtos/1786865940_8eb3930ccbd2495dc03c.webp', true, true, null::integer, true, 7, '[{"name":"Nude","hex":"#d8a488"},{"name":"Rosa","hex":"#e9a4b0"},{"name":"Cereja","hex":"#b4283f"}]'::jsonb),
  ('Oh My Blush Líquido - Vivai', '', 'Rosto', 'https://arquivos.facilzap.app.br/produtos/1786883547_c3c6837770d3115f37b0.webp', true, true, null::integer, true, 8, '[{"name":"Rosa","hex":"#e9a4b0"},{"name":"Pêssego","hex":"#f0b28b"},{"name":"Coral","hex":"#e8775c"}]'::jsonb),
  ('Contorno em bastão - Pink 21', '', 'Rosto', 'https://arquivos.facilzap.app.br/produtos/1789689441_450530fe68d16ffe7ed8.webp', true, false, null::integer, true, 9, '[{"name":"Claro","hex":"#e8c9a9"},{"name":"Médio","hex":"#c99a6e"}]'::jsonb),
  ('Iluminador líquido com aplicador - Vivai', '', 'Rosto', 'https://arquivos.facilzap.app.br/produtos/1794151755_3e04122597166639396f.webp', true, true, null::integer, true, 10, '[{"name":"Dourado","hex":"#d9a441"},{"name":"Rosé","hex":"#e3b1a3"}]'::jsonb),
  ('Pó compacto Pure skin - Vivai', '', 'Rosto', 'https://arquivos.facilzap.app.br/produtos/1793551671_e063cfb5f6f4e7b8fbe7.webp', true, false, null::integer, true, 11, '[{"name":"Claro","hex":"#e8c9a9"},{"name":"Médio","hex":"#c99a6e"},{"name":"Escuro","hex":"#8a5a3a"}]'::jsonb),
  ('Delineador super black - Vivai', '', 'Olhos e sobrancelhas', 'https://arquivos.facilzap.app.br/produtos/1794494812_a2aa6b7d54b77eca10e2.webp', true, false, null::integer, true, 12, '[]'::jsonb),
  ('Máscara de cílios Max Volume - Vivai', '', 'Olhos e sobrancelhas', 'https://arquivos.facilzap.app.br/produtos/1794151870_8cdfb4b6db768a960e3b.webp', true, true, null::integer, true, 13, '[]'::jsonb),
  ('Lapiseira pra sobrancelhas - Miamake', '', 'Olhos e sobrancelhas', 'https://arquivos.facilzap.app.br/produtos/1788030349_9c0aefd4032f18dbd5ba.webp', true, false, null::integer, true, 14, '[{"name":"Louro","hex":"#c9a15a"},{"name":"Castanho","hex":"#6b4226"},{"name":"Preto","hex":"#2a1713"}]'::jsonb),
  ('Paleta de Sombras Encanto - Miamake', '', 'Olhos e sobrancelhas', 'https://arquivos.facilzap.app.br/produtos/1789314856_61aa964d3e4e42152b8e.webp', true, false, null::integer, true, 15, '[]'::jsonb),
  ('Pacote com 12 Esponjas de Maquiagem - Jummy jui', '', 'Acessórios', 'https://arquivos.facilzap.app.br/produtos/1787253521_a92c137d2bb4026ded83.webp', true, false, null::integer, true, 16, '[]'::jsonb),
  ('Kit 4 esponjas pra maquiagem', '', 'Acessórios', 'https://arquivos.facilzap.app.br/produtos/1788297957_a4e2eda6f1a3b640e70b.webp', true, false, null::integer, true, 17, '[]'::jsonb),
  ('Kit de pincéis', '', 'Acessórios', 'https://arquivos.facilzap.app.br/produtos/1789313868_ca7f210e5edeb6bc0931.webp', true, true, null::integer, true, 18, '[]'::jsonb),
  ('Conjunto de Pincéis', '', 'Acessórios', 'https://arquivos.facilzap.app.br/produtos/1787255593_b3650cae10129b8618b4.webp', true, false, null::integer, true, 19, '[]'::jsonb),
  ('Touca de cetim', '', 'Acessórios', 'https://arquivos.facilzap.app.br/produtos/1789313964_b51d433b6701a8f706b0.webp', true, false, null::integer, true, 20, '[{"name":"Preta","hex":"#2a1713"},{"name":"Rosa","hex":"#e9a4b0"},{"name":"Estampada","hex":null}]'::jsonb),
  ('Faixa de cabelo para maquiagem', '', 'Acessórios', 'https://arquivos.facilzap.app.br/produtos/1789313836_39c266be845df6374f88.webp', true, false, null::integer, true, 21, '[{"name":"Preta","hex":"#2a1713"},{"name":"Rosa","hex":"#e9a4b0"},{"name":"Branca","hex":"#faf6f1"}]'::jsonb)
) as v(name, description, category, image_url, available, featured, stock, is_demo, sort_order, colors)
where not exists (select 1 from public.products);

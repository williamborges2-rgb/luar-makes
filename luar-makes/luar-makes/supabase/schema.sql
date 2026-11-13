-- =====================================================================
-- Luar Makes — banco de dados, políticas de acesso e armazenamento de imagens
-- Como usar: Supabase > SQL Editor > New query > cole TUDO > Run.
-- Pode ser executado de novo sem problemas (é idempotente).
-- =====================================================================

-- 1) Administradoras -------------------------------------------------
-- Só quem está nesta tabela pode alterar produtos e imagens.
-- Ninguém lê nem grava aqui pelo site; a inclusão é feita no SQL Editor (first-admin.sql).
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- (sem políticas = tabela fechada para anon/authenticated)

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Produtos --------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text    not null check (char_length(btrim(name)) between 2 and 120),
  description text    not null default '' check (char_length(description) <= 140),
  category    text    not null check (char_length(category) between 1 and 40),
  image_url   text,
  -- PREÇO FIXO: o banco só aceita R$ 10,00. Nem pela API nem pelo painel dá para mudar.
  price       numeric(10,2) not null default 10.00 check (price = 10.00),
  available   boolean not null default true,
  featured    boolean not null default false,
  -- ESTOQUE: null = a dona não informou (sem limite no carrinho); número = unidades disponíveis.
  stock       integer          check (stock is null or stock >= 0),
  is_demo     boolean not null default false,   -- marca os produtos de exemplo
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Bancos criados pela versão anterior deste arquivo: acrescenta o que faltava (seguro repetir).
alter table public.products add column if not exists stock integer check (stock is null or stock >= 0);
-- Aceita link https:// ou caminho do próprio site (ex.: /products/gloss.webp, quando as fotos ficam na pasta public).
alter table public.products drop constraint if exists products_image_url_check;
alter table public.products add constraint products_image_url_check
  check (image_url is null or image_url ~* '^(https?://|/)');

create index if not exists products_category_idx on public.products (category);
create index if not exists products_order_idx on public.products (sort_order, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- 2b) Categorias ----------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(btrim(name)) between 1 and 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists categories_name_ci_key on public.categories (lower(name));

-- Categorias iniciais (só se a tabela estiver vazia, para não recriar as que a dona apagou).
insert into public.categories (name, sort_order)
select v.name, v.sort_order
from (values ('Lábios e gloss', 0), ('Rosto', 1), ('Olhos e sobrancelhas', 2), ('Acessórios', 3), ('Brincos', 4), ('Outros', 5))
  as v(name, sort_order)
where not exists (select 1 from public.categories);

-- Produtos já existentes ganham a categoria que usam (caso ela não exista ainda).
insert into public.categories (name, sort_order)
select distinct p.category, 100 from public.products p
where not exists (select 1 from public.categories c where c.name = p.category)
on conflict do nothing;

-- Produto -> categoria: renomear a categoria atualiza os produtos; apagar uma categoria em uso é bloqueado.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_category_fkey') then
    alter table public.products
      add constraint products_category_fkey foreign key (category)
      references public.categories (name) on update cascade on delete restrict;
  end if;
end $$;

-- 2c) Configurações da loja (uma única linha) ------------------------
create table if not exists public.store_settings (
  id                    boolean primary key default true check (id),
  whatsapp_number       text not null default '5548985055020' check (whatsapp_number ~ '^55[0-9]{10,11}$'),
  whatsapp_display      text not null default '(48) 98505-5020' check (char_length(btrim(whatsapp_display)) between 8 and 30),
  instagram_url         text not null default 'https://www.instagram.com/luarmakeup10/' check (instagram_url ~* '^https://([a-z0-9-]+\.)*instagram\.com/'),
  instagram_handle      text not null default '@luarmakeup10' check (char_length(btrim(instagram_handle)) between 2 and 31),
  address               text not null default 'Rua Congonhas, 172, Bloco 8 – Fundos, Monte Verde, Florianópolis/SC' check (char_length(btrim(address)) between 5 and 200),
  pickup_instructions   text not null default '' check (char_length(pickup_instructions) <= 300),
  delivery_instructions text not null default 'Disponibilidade, valor e prazo são combinados com a loja pelo WhatsApp.' check (char_length(delivery_instructions) <= 300),
  low_stock_threshold   integer not null default 3 check (low_stock_threshold between 0 and 999),
  updated_at            timestamptz not null default now()
);
insert into public.store_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- 3) Políticas de acesso (RLS) --------------------------------------
alter table public.products enable row level security;

revoke insert, update, delete on public.products from anon;

drop policy if exists "vitrine: qualquer pessoa pode ver" on public.products;
create policy "vitrine: qualquer pessoa pode ver"
  on public.products for select to anon, authenticated
  using (true);

drop policy if exists "admin: cadastrar produtos" on public.products;
create policy "admin: cadastrar produtos"
  on public.products for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admin: editar produtos" on public.products;
create policy "admin: editar produtos"
  on public.products for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin: remover produtos" on public.products;
create policy "admin: remover produtos"
  on public.products for delete to authenticated
  using (public.is_admin());

-- Categorias: qualquer pessoa vê; só administradora altera.
alter table public.categories enable row level security;
revoke insert, update, delete on public.categories from anon;
drop policy if exists "categorias: qualquer pessoa pode ver" on public.categories;
create policy "categorias: qualquer pessoa pode ver" on public.categories for select to anon, authenticated using (true);
drop policy if exists "categorias: admin cadastra" on public.categories;
create policy "categorias: admin cadastra" on public.categories for insert to authenticated with check (public.is_admin());
drop policy if exists "categorias: admin edita" on public.categories;
create policy "categorias: admin edita" on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "categorias: admin remove" on public.categories;
create policy "categorias: admin remove" on public.categories for delete to authenticated using (public.is_admin());

-- Configurações: qualquer pessoa lê (o site precisa do WhatsApp e do endereço); só administradora grava.
alter table public.store_settings enable row level security;
revoke insert, update, delete on public.store_settings from anon;
drop policy if exists "config: qualquer pessoa pode ver" on public.store_settings;
create policy "config: qualquer pessoa pode ver" on public.store_settings for select to anon, authenticated using (true);
drop policy if exists "config: admin cadastra" on public.store_settings;
create policy "config: admin cadastra" on public.store_settings for insert to authenticated with check (public.is_admin());
drop policy if exists "config: admin edita" on public.store_settings;
create policy "config: admin edita" on public.store_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4) Imagens (Storage) ----------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "imagens: leitura publica" on storage.objects;
create policy "imagens: leitura publica"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "imagens: admin envia" on storage.objects;
create policy "imagens: admin envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "imagens: admin troca" on storage.objects;
create policy "imagens: admin troca"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "imagens: admin remove" on storage.objects;
create policy "imagens: admin remove"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

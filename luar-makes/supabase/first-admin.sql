-- =====================================================================
-- Primeira administradora
-- 1) No Supabase: Authentication > Users > Add user > Create new user
--    (informe e-mail e senha e marque "Auto Confirm User").
-- 2) Troque o e-mail abaixo pelo MESMO e-mail do usuário criado e rode no SQL Editor.
-- =====================================================================
insert into public.admins (user_id)
select id from auth.users where lower(email) = lower('paginasdavidareal2@gmail.com')
on conflict (user_id) do nothing;

-- Conferência: deve listar 1 linha com o e-mail da dona.
select a.user_id, u.email, a.created_at
from public.admins a join auth.users u on u.id = a.user_id;

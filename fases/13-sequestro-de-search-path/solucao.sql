-- Conserto de referência da fase 13: a função fixa o próprio search_path, chama tudo com
-- o nome completo, e ninguém mais cria objetos em public.

alter table public.pedidos enable row level security;
alter table public.pedidos force row level security;

create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create function public.relatorio_de_pedidos() returns setof public.pedidos
  language sql stable
  security definer
  set search_path = ''
as $$
  select * from public.pedidos where app.pode_ver(user_id) order by id
$$;

revoke create on schema public from relatorios;

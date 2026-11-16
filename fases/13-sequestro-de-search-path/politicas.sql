-- O banco do app usa este search_path: primeiro public, depois o schema do app.
set search_path = public, app;

alter table public.pedidos enable row level security;
alter table public.pedidos force row level security;

create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- O backend dos relatórios não lê a tabela direto: passa por esta função,
-- que decide o que cada cliente pode ver.
create function public.relatorio_de_pedidos() returns setof public.pedidos
  language sql stable
  security definer
as $$
  select * from public.pedidos where pode_ver(user_id) order by id
$$;

-- Sobrou do tempo em que qualquer um criava coisas em public.
grant create on schema public to relatorios;

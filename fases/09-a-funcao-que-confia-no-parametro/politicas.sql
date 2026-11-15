alter table public.pedidos enable row level security;

-- Cada cliente mexe só nos próprios pedidos.
create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.avaliacoes enable row level security;

-- Avaliação é pública: qualquer um lê.
create policy avaliacoes_publicas on public.avaliacoes
  for select
  using (true);

-- O histórico de pedidos de um cliente, para a tela "Meus pedidos".
create function public.pedidos_do_usuario(uid uuid) returns setof public.pedidos
  language sql stable
  security definer
  set search_path = ''
as $$
  select * from public.pedidos where user_id = uid order by id
$$;

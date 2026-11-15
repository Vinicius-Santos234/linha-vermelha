-- Conserto de referência da fase 9: a função deixa de rodar como o dono dela.
-- Com SECURITY INVOKER, o RLS de quem chamou volta a valer dentro da função.

alter table public.pedidos enable row level security;

-- Cada cliente mexe só nos próprios pedidos.
create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.avaliacoes enable row level security;

create policy avaliacoes_publicas on public.avaliacoes
  for select
  using (true);

create function public.pedidos_do_usuario(uid uuid) returns setof public.pedidos
  language sql stable
  security invoker
  set search_path = ''
as $$
  select * from public.pedidos where user_id = uid order by id
$$;

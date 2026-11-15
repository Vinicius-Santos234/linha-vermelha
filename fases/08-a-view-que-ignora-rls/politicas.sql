alter table public.pedidos enable row level security;

-- Cada cliente mexe só nos próprios pedidos.
create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A view public.pedidos_resumo já existe. Ela foi criada assim:
--
--   create view public.pedidos_resumo as
--     select id, user_id, itens, total from public.pedidos;

alter table public.pedidos enable row level security;

-- Cada cliente mexe só nos próprios pedidos. Vale para qualquer papel.
create policy pedidos_do_dono on public.pedidos
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Quem é o dono da tabela public.pedidos: o papel "relatorios",
-- o mesmo com que o backend dos relatórios se conecta.

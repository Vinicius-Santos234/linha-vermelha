alter table public.pedidos enable row level security;

-- Pedido de visitante não tem dono: o user_id fica vazio.
-- Por isso a política aceita também as linhas sem dono.
create policy pedidos_do_dono on public.pedidos
  for all
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid());

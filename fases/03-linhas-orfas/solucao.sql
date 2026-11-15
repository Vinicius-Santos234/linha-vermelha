-- Conserto de referência da fase 3: linha sem dono não é de todo mundo, é de ninguém.
-- O pedido de visitante é gravado e lido pelo servidor, fora do alcance da API.

alter table public.pedidos enable row level security;

create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

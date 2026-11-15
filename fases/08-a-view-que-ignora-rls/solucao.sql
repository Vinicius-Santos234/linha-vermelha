-- Conserto de referência da fase 8: a view passa a rodar com as permissões de quem
-- consulta, e não com as de quem a criou.

alter table public.pedidos enable row level security;

-- Cada cliente mexe só nos próprios pedidos.
create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter view public.pedidos_resumo set (security_invoker = true);

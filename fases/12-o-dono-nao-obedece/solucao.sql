-- Conserto de referência da fase 12: o dono da tabela também passa a obedecer ao RLS.

alter table public.pedidos enable row level security;
alter table public.pedidos force row level security;

create policy pedidos_do_dono on public.pedidos
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Conserto de referência da fase 11: o código deixa de ser único na padaria inteira e
-- passa a ser único por cliente. O erro de repetição para de contar o que há nas
-- linhas dos outros.

alter table public.cupons enable row level security;

create policy cupons_do_dono on public.cupons
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.cupons drop constraint cupons_codigo_key;
alter table public.cupons add constraint cupons_codigo_por_cliente unique (user_id, codigo);

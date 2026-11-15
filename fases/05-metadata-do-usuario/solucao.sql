-- Conserto de referência da fase 5: ler o papel do app_metadata, que só o servidor escreve.

alter table public.pedidos enable row level security;

create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy gerente_ve_tudo on public.pedidos
  for select to authenticated
  using (auth.jwt() -> 'app_metadata' ->> 'papel' = 'gerente');

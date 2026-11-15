-- Conserto de referência da fase 4: as políticas ficam como estavam, e a coluna
-- is_admin sai do alcance do cliente com um grant por coluna.

alter table public.perfis  enable row level security;
alter table public.pedidos enable row level security;

create policy perfil_ver on public.perfis
  for select to authenticated
  using (id = auth.uid());

create policy perfil_editar on public.perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy pedidos_admin_ve_tudo on public.pedidos
  for select to authenticated
  using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.is_admin));

-- O RLS decide QUAIS LINHAS. Quem decide QUAIS COLUNAS é o grant.
revoke update on public.perfis from anon, authenticated;
grant update (nome) on public.perfis to authenticated;

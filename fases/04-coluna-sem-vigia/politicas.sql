alter table public.perfis  enable row level security;
alter table public.pedidos enable row level security;

-- Perfis: cada pessoa vê e edita o próprio.
create policy perfil_ver on public.perfis
  for select to authenticated
  using (id = auth.uid());

create policy perfil_editar on public.perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Pedidos: o dono mexe nos seus, e quem é admin vê todos.
create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy pedidos_admin_ve_tudo on public.pedidos
  for select to authenticated
  using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.is_admin));

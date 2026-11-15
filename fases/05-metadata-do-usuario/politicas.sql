alter table public.pedidos enable row level security;

-- O dono mexe nos seus pedidos.
create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A gerente vê todos. O papel vem do token de login.
create policy gerente_ve_tudo on public.pedidos
  for select to authenticated
  using (auth.jwt() -> 'user_metadata' ->> 'papel' = 'gerente');

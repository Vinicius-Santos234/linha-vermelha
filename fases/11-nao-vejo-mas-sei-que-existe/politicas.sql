alter table public.cupons enable row level security;

-- Cada cliente vê e cria só os próprios cupons.
create policy cupons_do_dono on public.cupons
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A tabela public.cupons tem esta restrição, criada junto com ela:
--
--   constraint cupons_codigo_key unique (codigo)

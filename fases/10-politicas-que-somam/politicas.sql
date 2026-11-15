alter table public.laudos enable row level security;

-- Cada paciente mexe nos próprios laudos.
create policy laudos_do_dono on public.laudos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Reforço de segurança: laudo só para conta com verificação em duas etapas.
create policy so_verificados on public.laudos
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'verificado')::boolean);

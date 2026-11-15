-- Conserto de referência da fase 10: a restrição tem de ser RESTRICTIVE.
-- Política permissiva soma com OU. Só a restritiva soma com E.

alter table public.laudos enable row level security;

create policy laudos_do_dono on public.laudos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy so_verificados on public.laudos
  as restrictive
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'verificado')::boolean);

-- Conserto de referência da fase 2: a política provisória dá lugar à política por dono.

alter table public.fichas enable row level security;

create policy fichas_do_dono on public.fichas
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

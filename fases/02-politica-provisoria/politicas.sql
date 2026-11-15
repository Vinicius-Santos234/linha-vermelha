alter table public.fichas enable row level security;

-- TODO: provisória, só para o protótipo funcionar. Trocar antes de publicar.
create policy provisoria on public.fichas
  for all to authenticated
  using (true)
  with check (true);

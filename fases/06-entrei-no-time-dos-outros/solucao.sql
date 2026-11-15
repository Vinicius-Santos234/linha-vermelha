-- Conserto de referência da fase 6: só o dono do time adiciona membros.

alter table public.times    enable row level security;
alter table public.membros  enable row level security;
alter table public.projetos enable row level security;

create policy times_ver on public.times
  for select to authenticated
  using (true);

create policy membros_ver on public.membros
  for select to authenticated
  using (user_id = auth.uid());

create policy membros_entrar on public.membros
  for insert to authenticated
  with check (exists (select 1 from public.times t where t.id = time_id and t.dono = auth.uid()));

create policy projetos_do_time on public.projetos
  for select to authenticated
  using (exists (select 1 from public.membros m where m.time_id = projetos.time_id and m.user_id = auth.uid()));

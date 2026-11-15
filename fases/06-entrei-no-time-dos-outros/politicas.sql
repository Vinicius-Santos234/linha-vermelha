alter table public.times    enable row level security;
alter table public.membros  enable row level security;
alter table public.projetos enable row level security;

-- A lista de times é pública para quem está logado.
create policy times_ver on public.times
  for select to authenticated
  using (true);

-- Cada pessoa vê as próprias participações.
create policy membros_ver on public.membros
  for select to authenticated
  using (user_id = auth.uid());

-- O dono adiciona gente ao time, e cada pessoa confirma a própria entrada.
create policy membros_entrar on public.membros
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.times t where t.id = time_id and t.dono = auth.uid())
  );

-- Projeto é de quem faz parte do time.
create policy projetos_do_time on public.projetos
  for select to authenticated
  using (exists (select 1 from public.membros m where m.time_id = projetos.time_id and m.user_id = auth.uid()));

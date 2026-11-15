alter table public.fornecedores enable row level security;

-- Área interna: só a equipe, que é quem tem e-mail da padaria.
create policy so_a_equipe on public.fornecedores
  for select to authenticated
  using (auth.jwt() ->> 'email' like '%@padaria.com.br');

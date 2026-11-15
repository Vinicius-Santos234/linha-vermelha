-- Conserto de referência da fase 7: e-mail qualquer um escolhe ao se cadastrar.
-- Quem é da equipe é quem o servidor marcou como da equipe.

alter table public.fornecedores enable row level security;

create policy so_a_equipe on public.fornecedores
  for select to authenticated
  using (auth.jwt() -> 'app_metadata' ->> 'papel' = 'funcionario');

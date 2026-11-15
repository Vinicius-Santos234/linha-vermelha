-- Conserto de referência da fase 1: ligar o RLS e criar política por dono.

alter table public.pedidos enable row level security;

create policy pedidos_do_dono on public.pedidos
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

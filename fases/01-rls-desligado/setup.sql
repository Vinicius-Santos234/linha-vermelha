-- Fase 1: RLS desligado. Os pedidos da Padaria do Zé.
-- A falha: a tabela nunca recebeu ENABLE ROW LEVEL SECURITY.

insert into auth.users (id, email, senha, email_confirmed_at) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now()),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now());

create table public.pedidos (
  id       int primary key,
  user_id  uuid not null references auth.users (id),
  itens    text not null,
  endereco text not null,
  total    numeric(8, 2) not null,
  status   text not null default 'recebido'
);

insert into public.pedidos (id, user_id, itens, endereco, total) values
  (1, 'a11ce000-0000-4000-8000-000000000001', '6 pães franceses',          'Rua das Acácias, 12',   4.50),
  (2, 'a11ce000-0000-4000-8000-000000000001', '1 bolo de fubá',            'Rua das Acácias, 12',  18.00),
  (5, 'b0b00000-0000-4000-8000-000000000002', '2 sonhos de creme',         'Av. Central, 400 ap 31', 9.00),
  (7, 'b0b00000-0000-4000-8000-000000000002', '1 torta de limão (surpresa de aniversário)', 'Av. Central, 400 ap 31', 62.00);

-- Fase 8: A view que ignora RLS. Um resumo dos pedidos para a tela inicial do app.
-- Aqui ficam as tabelas, os dados e a view. As políticas estão em politicas.sql.

insert into auth.users (id, email, senha, email_confirmed_at, raw_app_meta_data) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now(), '{}'),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now(), '{}'),
  ('ca51a000-0000-4000-8000-000000000003', 'carla@padaria.com.br', 'Zx8$mNp2@wQ5', now(), '{}');

create table public.pedidos (
  id       int primary key,
  user_id  uuid not null references auth.users (id),
  itens    text not null,
  endereco text not null,
  total    numeric(8, 2) not null
);

insert into public.pedidos (id, user_id, itens, endereco, total) values
  (81, 'a11ce000-0000-4000-8000-000000000001', '2 baguetes',                 'Rua das Acácias, 12',     16.00),
  (82, 'b0b00000-0000-4000-8000-000000000002', '1 cesta de café da manhã (pedido de desculpas para a Lia)', 'Av. Central, 400 ap 31', 120.00),
  (83, 'b0b00000-0000-4000-8000-000000000002', '1 pão de centeio',           'Av. Central, 400 ap 31',  13.00),
  (84, 'a11ce000-0000-4000-8000-000000000001', '1 torta de maçã',            'Rua das Acácias, 12',     48.00);

-- O resumo que a tela inicial do app consulta.
create view public.pedidos_resumo as
  select id, user_id, itens, total from public.pedidos;

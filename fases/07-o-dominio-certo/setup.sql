-- Fase 7: O domínio certo. A padaria abriu uma área interna com os fornecedores.
-- Aqui ficam só as tabelas e os dados. As políticas (furadas) estão em politicas.sql.

-- A Carla é da equipe: o servidor marcou isso no app_metadata dela.
insert into auth.users (id, email, senha, email_confirmed_at, raw_app_meta_data) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now(), '{}'),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now(), '{}'),
  ('ca51a000-0000-4000-8000-000000000003', 'carla@padaria.com.br', 'Zx8$mNp2@wQ5', now(), '{"papel": "funcionario"}');

create table public.fornecedores (
  id              int primary key,
  nome            text not null,
  preco_combinado text not null,
  contato         text not null
);

insert into public.fornecedores (id, nome, preco_combinado, contato) values
  (71, 'Moinho Santa Clara',  'farinha a R$ 3,10 o quilo',                   'Sr. Olavo'),
  (72, 'Laticínios Boa Vista', 'manteiga a R$ 28 o quilo; preço fechado só para nós, não comentar', 'Dona Rute'),
  (73, 'Granja do Vale',      'ovos a R$ 14 a bandeja',                       'Tiago');

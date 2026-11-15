-- Fase 6: Entrei no time dos outros. Um quadro de projetos compartilhado por times.
-- Aqui ficam só as tabelas e os dados. As políticas (furadas) estão em politicas.sql.

insert into auth.users (id, email, senha, email_confirmed_at, raw_app_meta_data) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now(), '{}'),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now(), '{}'),
  ('ca51a000-0000-4000-8000-000000000003', 'carla@padaria.com.br', 'Zx8$mNp2@wQ5', now(), '{}');

create table public.times (
  id   int primary key,
  nome text not null,
  dono uuid not null references auth.users (id)
);

create table public.membros (
  id      int primary key,
  time_id int not null references public.times (id),
  user_id uuid not null references auth.users (id),
  unique (time_id, user_id)
);

create table public.projetos (
  id       int primary key,
  time_id  int not null references public.times (id),
  nome     text not null,
  anotacao text not null
);

insert into public.times (id, nome, dono) values
  (1, 'Padaria do Zé',   'a11ce000-0000-4000-8000-000000000001'),
  (2, 'Confeitaria Lia', 'b0b00000-0000-4000-8000-000000000002');

insert into public.membros (id, time_id, user_id) values
  (1, 1, 'a11ce000-0000-4000-8000-000000000001'),
  (2, 2, 'b0b00000-0000-4000-8000-000000000002'),
  (3, 2, 'ca51a000-0000-4000-8000-000000000003');

insert into public.projetos (id, time_id, nome, anotacao) values
  (61, 1, 'Cardápio de inverno',          'testar a sopa de mandioquinha'),
  (62, 2, 'Receita do brigadeiro da casa', 'o segredo é o leite condensado feito aqui; não passar para ninguém'),
  (63, 2, 'Lista de fornecedores',         'renegociar o chocolate em dezembro');

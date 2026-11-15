-- Fase 2: A política provisória. As fichas de treino da academia Ferro & Fôlego.
-- Aqui ficam só as tabelas e os dados. As políticas (furadas) estão em politicas.sql.

insert into auth.users (id, email, senha, email_confirmed_at, raw_app_meta_data) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now(), '{}'),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now(), '{}'),
  ('ca51a000-0000-4000-8000-000000000003', 'carla@padaria.com.br', 'Zx8$mNp2@wQ5', now(), '{}');

create table public.fichas (
  id         int primary key,
  user_id    uuid not null references auth.users (id),
  objetivo   text not null,
  observacao text not null
);

insert into public.fichas (id, user_id, objetivo, observacao) values
  (31, 'a11ce000-0000-4000-8000-000000000001', 'Hipertrofia',            'treino A/B, quatro vezes por semana'),
  (32, 'a11ce000-0000-4000-8000-000000000001', 'Corrida de 10 km',       'prova em março'),
  (33, 'b0b00000-0000-4000-8000-000000000002', 'Recuperação do joelho',  'cirurgia em janeiro; não contar para o time de futebol'),
  (34, 'b0b00000-0000-4000-8000-000000000002', 'Mobilidade',             'alongamento antes do trabalho');

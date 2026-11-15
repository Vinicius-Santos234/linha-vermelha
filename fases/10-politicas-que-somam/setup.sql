-- Fase 10: Políticas que somam. Os laudos de exame da Clínica Vida.
-- Aqui ficam só as tabelas e os dados. As políticas (furadas) estão em politicas.sql.

-- Alice e Bruno ativaram a verificação em duas etapas. A Carla ainda não.
insert into auth.users (id, email, senha, email_confirmed_at, raw_app_meta_data) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now(), '{"verificado": true}'),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now(), '{"verificado": true}'),
  ('ca51a000-0000-4000-8000-000000000003', 'carla@padaria.com.br', 'Zx8$mNp2@wQ5', now(), '{"verificado": false}');

create table public.laudos (
  id        int primary key,
  user_id   uuid not null references auth.users (id),
  exame     text not null,
  resultado text not null
);

insert into public.laudos (id, user_id, exame, resultado) values
  (51, 'a11ce000-0000-4000-8000-000000000001', 'Hemograma',         'dentro do esperado'),
  (52, 'b0b00000-0000-4000-8000-000000000002', 'Teste de paternidade', 'compatível; entregar só ao paciente, em mãos'),
  (53, 'ca51a000-0000-4000-8000-000000000003', 'Glicemia',          'repetir em jejum'),
  (54, 'a11ce000-0000-4000-8000-000000000001', 'Vitamina D',        'baixa; suplementar');

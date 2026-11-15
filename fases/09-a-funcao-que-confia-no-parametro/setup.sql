-- Fase 9: A função que confia no parâmetro. O histórico de pedidos virou uma função.
-- Aqui ficam só as tabelas e os dados. As políticas e a função estão em politicas.sql.

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
  (91, 'a11ce000-0000-4000-8000-000000000001', '1 pão de milho',             'Rua das Acácias, 12',     9.00),
  (92, 'b0b00000-0000-4000-8000-000000000002', '1 bolo de casamento, três andares (data ainda em segredo: 14/02)', 'Av. Central, 400 ap 31', 890.00),
  (93, 'b0b00000-0000-4000-8000-000000000002', '6 brioches',                 'Av. Central, 400 ap 31',  27.00),
  (94, 'a11ce000-0000-4000-8000-000000000001', '1 focaccia',                 'Rua das Acácias, 12',     22.00);

-- As avaliações são públicas de propósito, e mostram quem avaliou.
create table public.avaliacoes (
  id      int primary key,
  user_id uuid not null references auth.users (id),
  nome    text not null,
  texto   text not null
);

insert into public.avaliacoes (id, user_id, nome, texto) values
  (1, 'a11ce000-0000-4000-8000-000000000001', 'Alice', 'O melhor pão de milho da cidade.'),
  (2, 'b0b00000-0000-4000-8000-000000000002', 'Bruno', 'Atendimento nota dez. Vou encomendar o bolo aqui.');

-- Fase 3: Linhas órfãs. A padaria passou a aceitar pedido de visitante, sem conta.
-- Aqui ficam só as tabelas e os dados. As políticas (furadas) estão em politicas.sql.

insert into auth.users (id, email, senha, email_confirmed_at, raw_app_meta_data) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now(), '{}'),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now(), '{}'),
  ('ca51a000-0000-4000-8000-000000000003', 'carla@padaria.com.br', 'Zx8$mNp2@wQ5', now(), '{}');

create table public.pedidos (
  id       int primary key,
  user_id  uuid references auth.users (id),   -- vazio quando o pedido é de visitante
  itens    text not null,
  endereco text not null,
  contato  text
);

insert into public.pedidos (id, user_id, itens, endereco, contato) values
  (41, 'a11ce000-0000-4000-8000-000000000001', '1 pão de azeitona',   'Rua das Acácias, 12',     null),
  (42, 'b0b00000-0000-4000-8000-000000000002', '3 croissants',        'Av. Central, 400 ap 31',  null),
  (43, null,       '1 bolo de aniversário (60 anos da Dona Ivone)', 'Rua do Lago, 88; deixar com o porteiro às 6h', '(11) 90000-0043'),
  (44, null,       '12 pães de queijo',   'Praça da Matriz, 5',      '(11) 90000-0044');

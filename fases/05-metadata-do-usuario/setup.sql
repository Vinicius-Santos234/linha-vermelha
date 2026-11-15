-- Fase 5: Metadata do usuário. O papel de gerente agora vem do token de login.
-- Aqui ficam só as tabelas e os dados. As políticas (furadas) estão em politicas.sql.

insert into auth.users (id, email, senha, email_confirmed_at, raw_user_meta_data, raw_app_meta_data) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now(),
   '{"apelido": "Alice", "papel": "cliente"}', '{"papel": "cliente"}'),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now(),
   '{"apelido": "Bruno", "papel": "cliente"}', '{"papel": "cliente"}'),
  ('ca51a000-0000-4000-8000-000000000003', 'carla@padaria.com.br', 'Zx8$mNp2@wQ5', now(),
   '{"apelido": "Carla", "papel": "gerente"}', '{"papel": "gerente"}');

create table public.pedidos (
  id       int primary key,
  user_id  uuid not null references auth.users (id),
  itens    text not null,
  endereco text not null,
  total    numeric(8, 2) not null,
  status   text not null default 'recebido'
);

insert into public.pedidos (id, user_id, itens, endereco, total) values
  (21, 'a11ce000-0000-4000-8000-000000000001', '1 cuca de banana',            'Rua das Acácias, 12',     24.00),
  (22, 'a11ce000-0000-4000-8000-000000000001', '4 pães franceses',            'Rua das Acácias, 12',      3.00),
  (23, 'b0b00000-0000-4000-8000-000000000002', '1 bolo de pedido de casamento (escrever: "Quer casar comigo, Lia?")', 'Av. Central, 400 ap 31', 95.00),
  (24, 'b0b00000-0000-4000-8000-000000000002', '1 pão integral',              'Av. Central, 400 ap 31',  14.00);

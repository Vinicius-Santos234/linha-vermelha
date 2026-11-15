-- Fase 4: Coluna sem vigia. A padaria ganhou perfil de cliente e um painel para a gerente.
-- Aqui ficam só as tabelas e os dados. As políticas (furadas) estão em politicas.sql.

insert into auth.users (id, email, senha, email_confirmed_at) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now()),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now()),
  ('ca51a000-0000-4000-8000-000000000003', 'carla@padaria.com.br', 'Zx8$mNp2@wQ5', now());

create table public.perfis (
  id       uuid primary key references auth.users (id),
  nome     text not null,
  is_admin boolean not null default false
);

insert into public.perfis (id, nome, is_admin) values
  ('a11ce000-0000-4000-8000-000000000001', 'Alice', false),
  ('b0b00000-0000-4000-8000-000000000002', 'Bruno', false),
  ('ca51a000-0000-4000-8000-000000000003', 'Carla (gerente)', true);

create table public.pedidos (
  id       int primary key,
  user_id  uuid not null references auth.users (id),
  itens    text not null,
  endereco text not null,
  total    numeric(8, 2) not null,
  status   text not null default 'recebido'
);

insert into public.pedidos (id, user_id, itens, endereco, total) values
  (11, 'a11ce000-0000-4000-8000-000000000001', '1 pão de fermentação natural', 'Rua das Acácias, 12',     19.00),
  (12, 'b0b00000-0000-4000-8000-000000000002', '40 coxinhas (despedida da chefe, ela não sabe)', 'Av. Central, 400 ap 31', 180.00),
  (13, 'b0b00000-0000-4000-8000-000000000002', '2 cafés coados',               'Av. Central, 400 ap 31',  12.00),
  (14, 'a11ce000-0000-4000-8000-000000000001', '6 pães de queijo',             'Rua das Acácias, 12',     15.00);

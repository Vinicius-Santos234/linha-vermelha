-- Fase 12: O dono não obedece. A padaria ganhou relatórios em SQL.
-- Aqui ficam só as tabelas e os dados. As políticas estão em politicas.sql.

insert into auth.users (id, email, senha, email_confirmed_at) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now()),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now());

-- A conexão do backend dos relatórios. O motor do jogo a assume para rodar o seu SQL.
create role relatorios nologin;
grant relatorios to jogador;
grant usage on schema auth to relatorios;

create table public.pedidos (
  id       int primary key,
  user_id  uuid not null references auth.users (id),
  itens    text not null,
  total    numeric(8, 2) not null
);

insert into public.pedidos (id, user_id, itens, total) values
  (121, 'a11ce000-0000-4000-8000-000000000001', '2 pães de fermentação natural',  38.00),
  (122, 'b0b00000-0000-4000-8000-000000000002', '300 salgados para a festa de demissão do sócio (ele ainda não sabe)', 540.00),
  (123, 'b0b00000-0000-4000-8000-000000000002', '1 café coado',                   6.00),
  (124, 'a11ce000-0000-4000-8000-000000000001', '1 rosca de coco',               21.00);

-- As tabelas do app pertencem ao papel do backend: foi ele quem as criou.
alter table public.pedidos owner to relatorios;

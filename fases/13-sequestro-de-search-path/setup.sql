-- Fase 13: Sequestro de search_path. Os relatórios agora passam por uma função.
-- Aqui ficam as tabelas, os dados e o schema do app. O resto está em politicas.sql.

insert into auth.users (id, email, senha, email_confirmed_at) values
  ('a11ce000-0000-4000-8000-000000000001', 'alice@exemplo.com', 'paodequeijo', now()),
  ('b0b00000-0000-4000-8000-000000000002', 'bruno@exemplo.com', 'tR7#kq9!vLx2', now());

-- A conexão do backend dos relatórios. O motor do jogo a assume para rodar o seu SQL.
create role relatorios nologin;
grant relatorios to jogador;
grant usage on schema auth to relatorios;

-- As regras de negócio do app moram num schema próprio.
create schema app;
grant usage on schema app to public;

create function app.pode_ver(dono uuid) returns boolean language sql stable as $$
  select dono = auth.uid()
$$;

create table public.pedidos (
  id       int primary key,
  user_id  uuid not null references auth.users (id),
  itens    text not null,
  total    numeric(8, 2) not null
);

insert into public.pedidos (id, user_id, itens, total) values
  (131, 'a11ce000-0000-4000-8000-000000000001', '1 pão sovado',                  11.00),
  (132, 'b0b00000-0000-4000-8000-000000000002', '1 bolo com a frase: "Parabéns pela aprovação, doutora" (surpresa para a Lia)', 130.00),
  (133, 'b0b00000-0000-4000-8000-000000000002', '4 pães de leite',                9.00),
  (134, 'a11ce000-0000-4000-8000-000000000001', '1 quiche de alho-poró',         34.00);

-- O console de relatórios desta fase aceita comandos além de SELECT, mas de DDL só
-- deixa criar função. É uma regra do jogo, e não parte da falha.
create function motor.so_funcao() returns event_trigger language plpgsql as $$
begin
  if current_user <> 'postgres' and tg_tag <> 'CREATE FUNCTION' then
    raise exception 'Neste console, de DDL só é permitido CREATE FUNCTION (veio %).', tg_tag using errcode = '42501';
  end if;
end $$;

create event trigger so_funcao on ddl_command_start execute function motor.so_funcao();

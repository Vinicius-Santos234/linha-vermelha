-- Supabase de mentira. Roda uma vez por sessão, como superusuário, antes de qualquer fase.
-- Imita o Supabase do jeito que o próprio Supabase faz: papéis anon/authenticated,
-- schema auth e identidade lida de request.jwt.claims.

create role anon nologin;
create role authenticated nologin;

-- Papel da sessão do jogador: não é superusuário e não é dono de nada.
-- Só consegue virar anon ou authenticated (risco 2 do projeto).
create role jogador login noinherit;
grant anon, authenticated to jogador;

-- Schema do motor do jogo. O jogador só executa o que o motor liberar aqui
-- (hoje, a função que responde sim/não para "o objetivo foi atingido?").
create schema motor;
grant usage on schema motor to jogador;

create schema auth;

create table auth.users (
  id uuid primary key,
  email text unique,
  senha text,                              -- de mentira, em texto puro: é um jogo
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb default '{}',   -- o usuário edita (updateUser)
  raw_app_meta_data  jsonb default '{}'    -- só o "servidor" edita
);

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

grant usage on schema public, auth to anon, authenticated;

-- Igual ao Supabase: toda tabela nova em public já nasce acessível pela API.
-- É por isso que "RLS desligado" vira vazamento.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- O "servidor de Auth" de mentira. A sessão do jogador não enxerga auth.users; o motor
-- entra, cadastra e relê o usuário por estas funções. Nos níveis 1 a 3 o jogador não as
-- alcança: o cliente falso só fala com o schema public.
create function motor.usuario_json(u auth.users) returns jsonb language sql immutable as $$
  select to_jsonb(u) - 'senha'
$$;

create function motor.entrar(p_email text, p_senha text) returns jsonb
  language sql stable security definer set search_path = '' as $$
  select motor.usuario_json(u) from auth.users u
   where u.email = p_email and u.senha is not null and u.senha = p_senha
$$;

create function motor.usuario(p_id uuid) returns jsonb
  language sql stable security definer set search_path = '' as $$
  select motor.usuario_json(u) from auth.users u where u.id = p_id
$$;

-- Como no Supabase com a confirmação de e-mail desligada: cadastrou, já pode entrar.
create function motor.cadastrar(p_email text, p_senha text, p_dados jsonb) returns jsonb
  language sql security definer set search_path = '' as $$
  insert into auth.users as u (id, email, senha, raw_user_meta_data)
  values (gen_random_uuid(), p_email, p_senha, coalesce(p_dados, '{}'))
  returning motor.usuario_json(u)
$$;

-- updateUser({ data }): o usuário escreve no próprio user_metadata, e só nele.
create function motor.atualizar_usuario(p_id uuid, p_dados jsonb) returns jsonb
  language sql security definer set search_path = '' as $$
  update auth.users as u
     set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}') || coalesce(p_dados, '{}')
   where u.id = p_id
  returning motor.usuario_json(u)
$$;

revoke all on all functions in schema motor from public;
grant execute on all functions in schema motor to jogador;

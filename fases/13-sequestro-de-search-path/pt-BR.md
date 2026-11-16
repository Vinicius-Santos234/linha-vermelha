# Sequestro de search_path

## Resumo
A função confere quem pode ver. Mas confere com qual função?

## Briefing do ataque
Depois do último susto, a padaria fechou tudo: a tabela obedece ao RLS até para o dono, e o backend dos relatórios nem tem mais permissão de lê-la. Os relatórios agora saem de uma **função**, que roda com privilégio e devolve só o que cada cliente pode ver.

Você é a Alice, no painel de relatórios. Desta vez o console aceita mais do que consulta. O Bruno encomendou um bolo de surpresa para a Lia. É o **pedido #132**.

**Objetivo:** fazer o pedido #132 aparecer no resultado. Um comando por vez.

## Briefing da defesa
A função `relatorio_de_pedidos` roda com o privilégio de quem a criou e chama outra função pelo nome curto. Quem decide qual função é chamada é o `search_path` de quem está usando o banco. Conserte **sem quebrar o app**: o relatório de cada cliente continua trazendo os pedidos dele.

A grade não acusa nada. É a bateria que repete o ataque.

## Dicas do ataque
1. Leia o código da função do relatório: `select prosrc from pg_proc where proname = 'relatorio_de_pedidos'`. Ela chama outra função. Com ou sem o nome do schema?

2. Esta dica revela as políticas e as funções. A função é `SECURITY DEFINER` e não fixa o `search_path`. Veja o seu: `show search_path`. O schema `public` vem antes do `app`, e você pode criar coisas nele.

3. Uma função com o mesmo nome em `public` é achada primeiro. São dois comandos, um de cada vez:

```sql
create function public.pode_ver(uuid) returns boolean language sql as 'select true'
```

```sql
select * from relatorio_de_pedidos()
```

## Dicas da defesa
1. Uma função `SECURITY DEFINER` precisa decidir sozinha onde procurar as coisas. Hoje ela herda o `search_path` de quem a chama.

2. São três providências: `SET search_path = ''` na função, chamar `app.pode_ver` com o nome completo, e tirar de quem não precisa o direito de criar em `public`.

3. Recrie a função e revogue a criação:

```sql
create function public.relatorio_de_pedidos() returns setof public.pedidos
  language sql stable
  security definer
  set search_path = ''
as $$
  select * from public.pedidos where app.pode_ver(user_id) order by id
$$;

revoke create on schema public from relatorios;
```

## Explicação
Quando o Postgres encontra um nome sem schema, ele procura nos schemas do `search_path`, em ordem, e fica com o primeiro que achar. Uma função `SECURITY DEFINER` que não fixa o próprio `search_path` roda com o privilégio do dono, mas com o caminho de busca de quem a chamou.

Bastou existir uma função de mesmo nome num schema que vem antes, e onde o atacante podia criar objetos. A função privilegiada passou a obedecer ao código dele.

É por isso que a recomendação é sempre a mesma: toda função `SECURITY DEFINER` leva `SET search_path = ''` e nomes completos. E o schema `public` não deve ser lugar onde qualquer papel cria coisas.

# Linhas órfãs

## Resumo
A padaria passou a aceitar pedido de quem não tem conta. De quem é uma linha sem dono?

## Briefing do ataque
A Padaria do Zé agora anota pedidos de **visitantes**: gente que liga ou passa no balcão, sem cadastro. Esses pedidos ficam na mesma tabela, com o `user_id` vazio, e levam endereço e telefone.

A política por dono está lá, bem escrita. Só ganhou um remendo para os pedidos de visitante não sumirem.

O **pedido #43** é de uma visitante e traz o endereço da festa surpresa de uma senhora de 60 anos.

**Objetivo:** fazer o pedido #43 aparecer numa resposta do seu console.

## Briefing da defesa
Os pedidos de visitante estão vazando, com endereço e telefone. Conserte **sem quebrar o app**: cada cliente continua mexendo só nos próprios pedidos.

Pedido sem dono não pode aparecer para ninguém pela API. Quem cuida dele é o balcão, pelo servidor.

## Dicas do ataque
1. Procure os pedidos que não são de ninguém. O cliente tem um filtro para valor vazio: `.is('coluna', null)`.

2. Esta dica revela as políticas. Repare no `OR`. Agora pense no que `auth.uid()` devolve para quem não fez login.

3. Nem precisa de conta. Sem login, a segunda metade do `OR` libera todos os pedidos de visitante:

```js
console.log(await supabase.from('pedidos').select().is('user_id', null))
```

## Dicas da defesa
1. O `OR user_id IS NULL` foi posto para os pedidos de visitante "funcionarem". Pergunte para quem eles precisam funcionar.

2. Tire o `OR`. Uma linha sem dono fica invisível para a API, que é o certo: o servidor, com a chave de serviço, não passa pelo RLS.

3. A política volta a ser só a do dono, e só para quem está logado:

```sql
alter table public.pedidos enable row level security;

create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

## Explicação
`OR user_id IS NULL` parece inofensivo: "se não tem dono, deixa passar". Só que a política não sabe a diferença entre "sem dono" e "de todo mundo". Para o Postgres, a condição ficou verdadeira para qualquer pessoa, logada ou não.

É o padrão de todo dado que nasce fora do fluxo normal: importação, pedido de visitante, registro criado pelo sistema.

O conserto é separar os fluxos. O que não tem dono é responsabilidade do servidor, e a política da API volta a falar só de quem tem conta.

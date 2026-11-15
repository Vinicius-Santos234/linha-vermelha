# A função que confia no parâmetro

## Resumo
A tela "Meus pedidos" chama uma função. A função pergunta de quem são os pedidos. Para quem?

## Briefing do ataque
A tabela `pedidos` está bem protegida. Para montar a tela "Meus pedidos", a equipe escreveu uma **função** no banco, chamada pelo app com `supabase.rpc`. O app sempre manda o id de quem está logado.

Você não é o app. Você tem o console.

O Bruno encomendou um bolo de casamento, e a data ainda é segredo. É o **pedido #92**.

**Objetivo:** fazer o pedido #92 aparecer numa resposta do seu console.

## Briefing da defesa
As políticas estão certas. O furo é a função `pedidos_do_usuario`, que passa por cima delas. Conserte **sem quebrar o app**: a função continua existindo, e cada cliente continua vendo o próprio histórico por ela.

A grade não acusa nada, porque ela olha as tabelas. É a bateria que chama a função.

## Dicas do ataque
1. O schema mostra uma função além das tabelas. Ela recebe um argumento. Quem escolhe o valor dele?

2. Esta dica revela as políticas e o código da função. Repare em `SECURITY DEFINER`, e em de onde vem o `uid` do `WHERE`. Para achar o id de outra pessoa, procure uma tabela pública que o mostre.

3. A função devolve os pedidos de quem o argumento disser, e as avaliações públicas entregam o id do Bruno:

```js
await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
const { data } = await supabase.from('avaliacoes').select('user_id').eq('nome', 'Bruno').single()
console.log(await supabase.rpc('pedidos_do_usuario', { uid: data.user_id }))
```

## Dicas da defesa
1. `SECURITY DEFINER` faz a função rodar com as permissões de quem a criou. Dentro dela, o RLS de quem chamou não vale.

2. Há dois caminhos: a função usar `auth.uid()` em vez de confiar no argumento, ou virar `SECURITY INVOKER`, para o RLS voltar a valer dentro dela.

3. Recriar a função como `SECURITY INVOKER` resolve sem mudar o app:

```sql
create function public.pedidos_do_usuario(uid uuid) returns setof public.pedidos
  language sql stable
  security invoker
  set search_path = ''
as $$
  select * from public.pedidos where user_id = uid order by id
$$;
```

## Explicação
Uma função `SECURITY DEFINER` é uma porta que abre com a chave do dono. Ela existe para os casos em que o usuário precisa fazer algo que as políticas não deixam, e por isso tem de conferir sozinha quem está chamando.

Esta não conferia nada: recebia um id e devolvia os pedidos dele. O app mandava sempre o id certo, e isso bastou para ninguém notar. Só que o app não é o único que consegue chamar a função.

Regra prática: argumento vindo do cliente nunca decide **de quem** são os dados. Isso vem de `auth.uid()`.

# A view que ignora RLS

## Resumo
A tabela está trancada. O resumo que alguém montou em cima dela, não.

## Briefing do ataque
Os pedidos da padaria estão protegidos como manda o figurino: RLS ligado, política por dono. Consultar `pedidos` devolve só o que é seu.

Para a tela inicial do app, alguém criou um **resumo** dos pedidos. É outra porta para os mesmos dados.

O Bruno encomendou uma cesta com um recado que não era para ninguém ler. É o **pedido #82**.

**Objetivo:** fazer o pedido #82 aparecer numa resposta do seu console, pela tabela ou pelo resumo.

## Briefing da defesa
As políticas de `pedidos` estão certas, e não é nelas que você vai mexer. O vazamento vem da view `pedidos_resumo`. Conserte **sem quebrar o app**: o resumo continua existindo e mostra a cada cliente os próprios pedidos.

A grade tem duas tabelas agora. Uma delas está toda em vermelho.

## Dicas do ataque
1. Olhe o schema com atenção: há mais de uma coisa para consultar. O cliente lê uma view do mesmo jeito que lê uma tabela.

2. Esta dica revela as políticas e como a view foi criada. Repare no que **não** aparece na definição dela: nenhuma opção dizendo com as permissões de quem ela roda.

3. A view roda com as permissões de quem a criou, e para ele o RLS não vale:

```js
await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
console.log(await supabase.from('pedidos_resumo').select())
```

## Dicas da defesa
1. Por padrão, uma view do Postgres consulta as tabelas com as permissões de quem a criou. O RLS que vale é o do criador, e não o de quem está consultando.

2. Desde o Postgres 15 existe uma opção de view para inverter isso: `security_invoker`.

3. Uma linha resolve, sem recriar nada:

```sql
alter view public.pedidos_resumo set (security_invoker = true);
```

## Explicação
RLS se aplica a **quem consulta a tabela**. Quando a consulta passa por uma view comum, quem consulta a tabela é o dono da view. Se o dono é o papel que criou o banco, as políticas simplesmente não se aplicam a ele.

É uma das falhas mais fáceis de criar no Supabase: a tabela foi auditada, e a view nasceu depois, num dia de pressa.

Com `security_invoker = true`, a view passa a consultar com as permissões de quem a chamou, e as políticas da tabela voltam a valer.

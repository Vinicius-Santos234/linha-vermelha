# RLS desligado

## Resumo
A Padaria do Zé guarda os pedidos numa tabela que ninguém protegeu.

## Briefing do ataque
A **Padaria do Zé** lançou um app de encomendas feito em um fim de semana. Você é a Alice, uma cliente comum, e tem o mesmo que qualquer pessoa com o site aberto: o cliente `supabase` e a chave pública.

O Bruno, outro cliente, encomendou algo para uma festa surpresa. É o **pedido #7**.

**Objetivo:** fazer o pedido #7 aparecer numa resposta do seu console.

## Briefing da defesa
O vazamento foi parar no grupo do bairro e o Zé pediu sua ajuda. Conserte a tabela `pedidos` **sem quebrar o app**: cada cliente continua vendo, alterando e cancelando os próprios pedidos, e ninguém mais.

A grade ao lado mostra quem enxerga cada pedido. O que estiver em vermelho diverge do que deveria ser.

## Dicas do ataque
1. Olhe para a tabela `pedidos` e para a operação mais simples que existe: ler. Você precisa mesmo estar logada?

2. Esta dica revela as políticas da tabela. Repare no que **não** está lá: uma tabela com o RLS desligado não filtra linha nenhuma, e no Supabase toda tabela nova em `public` já nasce acessível pela API.

Chave pública no código do site não é a falha. Ela é pública por design, e quem protege os dados são as regras do banco. Vale igual para a chave de API do Firebase, protegida pelas Rules: este jogo guarda o seu progresso assim.

3. Sem login e sem filtro, a chave pública lê a tabela inteira:

```js
const { data } = await supabase.from('pedidos').select()
console.log(data)
```

## Dicas da defesa
1. São duas coisas: ligar o RLS na tabela e dizer quem pode o quê. Só ligar o RLS tranca todo mundo para fora, inclusive os donos dos pedidos.

2. A política precisa comparar a coluna `user_id` com quem está fazendo a chamada, que é `auth.uid()`. O `USING` decide quais linhas a pessoa enxerga e mexe; o `WITH CHECK` decide o que ela pode gravar.

3. Liga o RLS e cria uma política só, por dono, para todas as operações:

```sql
alter table public.pedidos enable row level security;

create policy pedidos_do_dono on public.pedidos
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

## Explicação
No Supabase, a chave `anon` vai junto com o site: qualquer visitante a tem. Quem decide o que essa chave alcança é o **Row Level Security**. Com o RLS desligado, o Postgres não filtra nada, e os privilégios padrão do Supabase deixam a API ler e gravar a tabela inteira.

É a falha mais comum de todas, porque nada avisa: o app funciona perfeitamente para quem o usa do jeito esperado.

Repare que esconder a chave não resolveria nada. A chave `anon` do Supabase e a chave de API do Firebase são públicas por design: qualquer pessoa as lê no código do site. A proteção tem de estar nas regras do banco, o RLS num caso e as Rules no outro.

O conserto tem duas metades. `ENABLE ROW LEVEL SECURITY` passa a negar tudo, e a política devolve a cada pessoa só o que é dela. Uma sem a outra dá em vazamento ou em app quebrado.

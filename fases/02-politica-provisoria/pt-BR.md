# A política provisória

## Resumo
A academia ligou o RLS. E deixou uma política que diz sim para tudo.

## Briefing do ataque
A academia **Ferro & Fôlego** guarda as fichas de treino dos alunos num app. Desta vez alguém se lembrou de ligar o RLS: sem login, a tabela não devolve nada.

Você é a Alice, aluna comum, com a sua conta. O Bruno treina no mesmo horário e anda escondendo alguma coisa do time de futebol. É a **ficha #33**.

**Objetivo:** fazer a ficha #33 aparecer numa resposta do seu console.

## Briefing da defesa
O RLS está ligado, e mesmo assim todo aluno lê a ficha de todo mundo. Conserte **sem quebrar o app**: cada aluno continua vendo, alterando e apagando as próprias fichas, e mais ninguém.

O editor já traz a política atual. Leia o que ela diz de verdade.

## Dicas do ataque
1. RLS ligado não quer dizer RLS certo. O que muda quando você faz login antes de consultar `fichas`?

2. Esta dica revela as políticas. Leia a condição do `USING`: ela compara alguma coisa com quem está fazendo a chamada?

3. A política vale para qualquer pessoa logada, sem condição nenhuma:

```js
await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
console.log(await supabase.from('fichas').select())
```

## Dicas da defesa
1. O problema é uma palavra só: `true`. Uma condição que é sempre verdadeira não filtra linha nenhuma.

2. Troque o `true` por uma comparação entre a coluna `user_id` e quem está chamando, que é `auth.uid()`. Vale para o `USING` e para o `WITH CHECK`.

3. Apague a política provisória do editor e escreva a de verdade:

```sql
alter table public.fichas enable row level security;

create policy fichas_do_dono on public.fichas
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

## Explicação
`USING (true)` é a política que se escreve às pressas para o protótipo funcionar, com a promessa de voltar depois. Ela passa por qualquer revisão apressada, porque o painel mostra o RLS ligado e uma política criada.

O efeito é o mesmo do RLS desligado para quem está logado, e criar uma conta costuma ser grátis.

O conserto é a política dizer o que a regra de negócio diz: cada linha pertence a quem está na coluna `user_id`.

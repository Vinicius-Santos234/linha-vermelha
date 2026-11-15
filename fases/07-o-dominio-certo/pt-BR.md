# O domínio certo

## Resumo
A área interna é só para quem tem e-mail da padaria. E quem confere o e-mail?

## Briefing do ataque
A Padaria do Zé abriu uma **área interna** no app, com os fornecedores e os preços combinados com cada um. A regra é simples: só entra quem tem e-mail `@padaria.com.br`.

Você é a Alice, cliente, com um e-mail comum. O preço da manteiga foi fechado em segredo. É o **fornecedor #72**.

**Objetivo:** fazer o fornecedor #72 aparecer numa resposta do seu console.

## Briefing da defesa
A política confere o e-mail de quem chama, e o e-mail é a própria pessoa quem informa ao se cadastrar. Conserte **sem quebrar o app**: a Carla, que é funcionária de verdade, continua vendo os fornecedores.

A grade parece certa: quem já tem conta está onde devia. O ataque cria uma conta nova, e é a bateria que o reproduz.

## Dicas do ataque
1. A sua conta não serve. Mas ninguém disse que você só pode ter uma. Veja `supabase.auth.signUp` na ajuda.

2. Esta dica revela as políticas. A condição olha o **texto** do e-mail. Este app pede que você prove que o e-mail é seu antes de deixar entrar?

3. O cadastro não confirma e-mail. Qualquer um abre uma conta com o domínio da padaria:

```js
await supabase.auth.signUp({ email: 'alice@padaria.com.br', password: 'qualquercoisa' })
console.log(await supabase.from('fornecedores').select())
```

## Dicas da defesa
1. O e-mail é um dado que o usuário escolhe. Procure, no token, um dado que só o servidor escreve.

2. O `app_metadata` só o servidor altera, e a Carla já tem `papel: funcionario` lá.

3. A política passa a ler o papel, e não o e-mail:

```sql
create policy so_a_equipe on public.fornecedores
  for select to authenticated
  using (auth.jwt() -> 'app_metadata' ->> 'papel' = 'funcionario');
```

## Explicação
Um e-mail só prova alguma coisa depois de confirmado. Com a confirmação desligada, que é como muitos projetos ficam durante o desenvolvimento, o e-mail é só um texto que a pessoa digitou.

Mesmo com confirmação, liberar acesso pelo domínio é frágil: ex-funcionários, apelidos de e-mail e domínios parecidos entram na conta.

O conserto é a permissão vir de algo que o servidor decide: um papel no `app_metadata` ou uma tabela de equipe em que só o servidor escreve.

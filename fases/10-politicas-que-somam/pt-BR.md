# Políticas que somam

## Resumo
A clínica acrescentou uma política para restringir. Ela liberou.

## Briefing do ataque
A **Clínica Vida** entrega laudos de exame pelo app. Depois de uma auditoria, veio um reforço: laudo só aparece para conta com **verificação em duas etapas**. A equipe acrescentou uma política nova, ao lado da política por dono que já existia.

Você é a Alice, paciente, com a verificação ativada. O Bruno fez um exame que pediu para receber só em mãos. É o **laudo #52**.

**Objetivo:** fazer o laudo #52 aparecer numa resposta do seu console.

## Briefing da defesa
As duas políticas estão certas quando lidas sozinhas. O problema é como o Postgres **junta** as duas. Conserte **sem quebrar o app**: cada paciente vê só os próprios laudos, e só se a conta for verificada.

A Carla ainda não ativou a verificação: os laudos dela não podem aparecer nem para ela.

## Dicas do ataque
1. Não precisa de truque. Entre com a sua conta, que é verificada, e leia a tabela inteira.

2. Esta dica revela as políticas. São duas, e as duas são permissivas. Quando há mais de uma política permissiva, o Postgres exige que **todas** passem, ou que **alguma** passe?

3. Políticas permissivas se somam com OU. A segunda diz "verificada vê", e a Alice é verificada:

```js
await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
console.log(await supabase.from('laudos').select())
```

## Dicas da defesa
1. A segunda política foi escrita para restringir. Existe uma palavra no `CREATE POLICY` que diz ao Postgres que uma política restringe em vez de liberar.

2. `AS RESTRICTIVE`. Uma política restritiva tem de passar **junto** com alguma permissiva. É ela que soma com E.

3. Mantenha a política por dono e recrie a outra como restritiva:

```sql
create policy so_verificados on public.laudos
  as restrictive
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'verificado')::boolean);
```

## Explicação
Toda política nasce `PERMISSIVE`, e políticas permissivas se combinam com **OU**: basta uma passar. Acrescentar uma política permissiva nunca tira acesso de ninguém. Só dá.

A equipe quis dizer "dono **e** verificado". O que escreveu foi "dono **ou** verificado": qualquer conta verificada passou a ler os laudos de todos os pacientes.

Para restringir, a política precisa ser `AS RESTRICTIVE`. Ela não libera nada sozinha: funciona como um filtro a mais em cima do que as permissivas já deixaram passar.

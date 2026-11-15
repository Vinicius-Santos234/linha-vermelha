# Entrei no time dos outros

## Resumo
Os projetos são só de quem faz parte do time. E quem decide quem faz parte?

## Briefing do ataque
Padarias e confeitarias da cidade usam o mesmo quadro de projetos. Cada **time** tem um dono e seus membros, e um projeto só aparece para quem faz parte do time dele.

Você é a Alice, dona do time "Padaria do Zé". A concorrente, "Confeitaria Lia", é do Bruno, e guarda lá a receita mais famosa do bairro. É o **projeto #62**.

**Objetivo:** fazer o projeto #62 aparecer numa resposta do seu console.

## Briefing da defesa
A leitura dos projetos está certa: só membro vê. O furo está em **como alguém vira membro**. Conserte **sem quebrar o app**: o dono de um time continua adicionando gente a ele.

A grade não acusa nada, porque ninguém entrou onde não devia ainda. É a bateria que testa o ataque e o uso legítimo.

## Dicas do ataque
1. Você não lê os projetos do Bruno porque não é do time dele. Olhe para a tabela que diz quem é de qual time, e para o que você pode **inserir** nela.

2. Esta dica revela as políticas. Leia o `WITH CHECK` de `membros_entrar`: são duas condições ligadas por `OR`. Uma delas depende de convite?

3. A política aceita qualquer pessoa que se inscreva com o próprio id, em qualquer time:

```js
const { data } = await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
await supabase.from('membros').insert({ id: 90, time_id: 2, user_id: data.user.id })
console.log(await supabase.from('projetos').select())
```

## Dicas da defesa
1. O `WITH CHECK` de `membros_entrar` responde "esta linha pode ser criada?". Hoje ele aceita quem se inscreve sozinho. Quem deveria poder pôr alguém num time?

2. Tire a metade `user_id = auth.uid()` do `OR`. Sobra a condição certa: quem insere é o dono do time.

3. Só a política de entrada muda:

```sql
create policy membros_entrar on public.membros
  for insert to authenticated
  with check (exists (select 1 from public.times t where t.id = time_id and t.dono = auth.uid()));
```

## Explicação
Conferir `user_id = auth.uid()` num INSERT garante que ninguém se passa por outra pessoa. Não garante que a pessoa **pode** estar ali. Numa tabela de participação, a linha em si é a permissão: quem consegue criá-la se dá acesso sozinho.

A política de leitura dos projetos estava certa o tempo todo. Ela confiava na tabela de membros, e era a tabela de membros que aceitava qualquer um.

O conserto é a entrada no time exigir alguém com autoridade sobre ele: o dono, ou um convite que só o dono cria.

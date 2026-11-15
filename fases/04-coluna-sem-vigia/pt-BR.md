# Coluna sem vigia

## Resumo
A padaria ganhou um painel para a gerente. Quem decide quem é gerente?

## Briefing do ataque
Depois do susto, o Zé contratou alguém para fazer direito. Agora o RLS está ligado, cada cliente tem um **perfil**, e a gerente Carla enxerga todos os pedidos pelo painel dela.

Você continua sendo a Alice, cliente comum. O Bruno está organizando a despedida da chefe dele: é o **pedido #12**.

**Objetivo:** fazer o pedido #12 aparecer numa resposta do seu console.

## Briefing da defesa
As políticas estão quase certas, e é por isso que ninguém viu a falha. Conserte **sem quebrar o app**: cada cliente continua vendo os próprios pedidos e trocando o próprio nome no perfil, e a Carla continua vendo tudo.

O editor já traz as políticas atuais. A grade parece certa: desta vez o problema só aparece quando alguém ataca, então é a bateria que vai acusar.

## Dicas do ataque
1. Os pedidos estão bem protegidos. Olhe para a outra tabela, `perfis`, e para o que você tem permissão de **alterar** nela.

2. Esta dica revela as políticas. A de UPDATE em `perfis` confere **de quem é a linha**. Ela diz alguma coisa sobre **quais colunas** podem mudar?

3. A política deixa a Alice editar o próprio perfil inteiro, inclusive a coluna que diz quem é admin:

```js
const { data } = await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
await supabase.from('perfis').update({ is_admin: true }).eq('id', data.user.id)
console.log(await supabase.from('pedidos').select())
```

## Dicas da defesa
1. As políticas de RLS decidem quais **linhas** cada pessoa alcança. Elas não falam de **colunas**. Procure o mecanismo do Postgres que fala.

2. O Supabase dá à API o direito de alterar a tabela inteira. Dá para tirar esse direito e devolver só a parte que o cliente precisa, com `revoke` e `grant ... (coluna)`.

3. Mantenha as políticas e acrescente no fim o grant por coluna:

```sql
revoke update on public.perfis from anon, authenticated;
grant update (nome) on public.perfis to authenticated;
```

## Explicação
O RLS responde "quais linhas?". A política de UPDATE dizia, corretamente, que cada pessoa só mexe na própria linha de `perfis`. Só que a coluna `is_admin` mora nessa mesma linha, e nada dizia que ela não podia mudar.

É o erro de guardar privilégio numa tabela que o próprio usuário edita. Ele costuma passar na revisão, porque a política lida sozinha está certa.

Há dois consertos comuns. O grant por coluna deixa o cliente alterar só o `nome`. A outra saída é tirar o privilégio dali: uma tabela de papéis em que só o servidor escreve.

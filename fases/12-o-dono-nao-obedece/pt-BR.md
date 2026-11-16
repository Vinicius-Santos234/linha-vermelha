# O dono não obedece

## Resumo
As políticas estão perfeitas. O backend dos relatórios não precisa delas.

## Briefing do ataque
A Padaria do Zé lançou os **relatórios em SQL**: o cliente escreve uma consulta e recebe os próprios pedidos do jeito que quiser. A consulta roda no servidor, com a conexão do backend, em nome de quem pediu.

As políticas da tabela estão certas. Pelo app, cada cliente só enxerga o que é seu.

Você é a Alice, logada no painel de relatórios. O Bruno encomendou salgados para uma festa que o sócio dele não podia descobrir. É o **pedido #122**.

**Objetivo:** fazer o pedido #122 aparecer no resultado de um relatório. Aqui o console é SQL, e só aceita consulta.

## Briefing da defesa
Não há nada de errado com a política. O problema é **quem** roda a consulta: o papel do backend é o dono da tabela. Conserte **sem quebrar o app**: o relatório de cada cliente continua trazendo os pedidos dele.

A grade não acusa nada, porque ela consulta como os clientes do app. É a bateria que roda o relatório.

## Dicas do ataque
1. Você não precisa enganar a política. Escreva o relatório mais simples possível e veja o que volta.

2. Esta dica revela as políticas. A política está correta. Agora descubra com que papel a sua consulta roda: `select current_user`. E quem é o dono da tabela: `select tableowner from pg_tables where tablename = 'pedidos'`.

3. O backend se conecta como o dono da tabela, e para o dono o RLS não vale:

```sql
select * from pedidos
```

## Dicas da defesa
1. No Postgres, o dono de uma tabela não passa pelas políticas dela. Nem precisa ser superusuário.

2. Existe um comando para dizer que nem o dono escapa: `FORCE ROW LEVEL SECURITY`.

3. Uma linha a mais, ao lado do `ENABLE`:

```sql
alter table public.pedidos force row level security;
```

## Explicação
`ENABLE ROW LEVEL SECURITY` liga as políticas para todo mundo, **menos para o dono da tabela** e para papéis com `BYPASSRLS`. É de propósito: o dono precisa conseguir dar manutenção.

O perigo aparece quando o backend se conecta como o dono, o que é comum: o papel que roda as migrations cria as tabelas, e o mesmo papel acaba servindo o app.

Há dois consertos, e o ideal é fazer os dois. `FORCE ROW LEVEL SECURITY` submete o dono às políticas. E o backend passa a se conectar com um papel que não é dono de nada.

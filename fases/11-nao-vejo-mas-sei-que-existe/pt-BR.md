# Não vejo, mas sei que existe

## Resumo
O RLS esconde o cupom do Bruno. A regra de "código único" conta que ele existe.

## Briefing do ataque
A padaria distribui cupons de desconto. Cada cliente vê só os próprios, e o RLS está certo: nenhuma consulta sua vai devolver o cupom de outra pessoa.

Os códigos seguem um padrão, `PADARIA-000` a `PADARIA-999`, e não se repetem. O seu é `PADARIA-007`. O do Bruno vale 50% e funciona para quem o digitar no caixa.

**Objetivo:** descobrir o código do cupom do Bruno e informá-lo em "Sua resposta". Nesta fase a linha nunca aparece: você precisa **deduzir**.

## Briefing da defesa
As políticas estão certas e continuam como estão. O vazamento vem da regra que impede código repetido: ao recusar um código, o banco confirma que ele existe. Conserte **sem quebrar o app**: cada cliente continua criando os próprios cupons.

A grade não acusa nada, porque ninguém lê o que não devia. É a bateria que repete o ataque.

## Dicas do ataque
1. Você não consegue ler o cupom do Bruno, mas consegue **criar** cupons seus. O que acontece ao tentar criar um com um código que já existe?

2. Esta dica revela as políticas e as restrições da tabela. A restrição de valor único vale para a tabela **inteira**, e não só para as linhas que você enxerga. O erro dela tem um código: `23505`.

3. Um laço tenta os mil códigos. O que der erro de repetição, e não for o seu, é o do Bruno:

```js
const { data } = await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
for (let n = 0; n < 1000; n++) {
  const codigo = 'PADARIA-' + String(n).padStart(3, '0')
  const { error } = await supabase.from('cupons').insert({ user_id: data.user.id, codigo, desconto: 0 })
  if (error?.code === '23505') console.log('já existe:', codigo)
}
```

## Dicas da defesa
1. Não mexa nas políticas. Olhe a restrição `unique (codigo)`: ela compara o código novo com os de **todos** os clientes.

2. Se o código só precisa ser único para cada cliente, a restrição pode incluir o `user_id`. Aí ela nunca compara com as linhas dos outros.

3. Troque a restrição, mantendo as políticas:

```sql
alter table public.cupons drop constraint cupons_codigo_key;
alter table public.cupons add constraint cupons_codigo_por_cliente unique (user_id, codigo);
```

## Explicação
RLS controla quais linhas uma consulta **devolve**. Restrições de valor único, chaves estrangeiras e índices continuam olhando a tabela inteira, e os erros delas viram um canal lateral: a resposta "já existe" é um bit de informação sobre uma linha que você não pode ver.

Com um espaço pequeno de valores, mil tentativas bastam. O mesmo vale para e-mails, CPFs e nomes de usuário.

Há dois consertos. A restrição passa a ser por cliente, como aqui. Ou o valor deixa de ser adivinhável: o servidor gera um código longo e aleatório, que ninguém acerta por tentativa.

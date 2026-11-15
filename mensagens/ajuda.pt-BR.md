## Como se joga

Cada fase é um app de mentira com uma falha de verdade. No **Ataque** você é um visitante comum, com o que qualquer pessoa com o site aberto tem: o cliente `supabase` e a chave pública. Você vence quando a linha-alvo do briefing aparece numa resposta do seu console. Não existe código secreto para digitar.

Na **Defesa** você recebe as políticas furadas e conserta em SQL. Vence quando a bateria fica toda verde: os ataques param de funcionar **e** o app continua funcionando para quem o usa direito.

No **Ciclo completo** você faz os dois em sequência, e o ataque que você escreveu vira um dos testes do seu conserto.

O **Laboratório** é livre: sem objetivo e sem estrelas.

## O console do Ataque

O código roda com `await` direto e recebe duas coisas: `supabase` e `console`. Cada chamada aparece em "Respostas", com a sessão em que foi feita. `Ctrl + Enter` executa.

A sessão continua de uma execução para a outra: se você entrou com `signInWithPassword`, continua logada até sair ou recomeçar a fase. O código é interrompido se passar de 15 segundos.

```js
const { data, error } = await supabase.from('pedidos').select('id, itens').eq('id', 7)
console.log(data, error)
```

## O que o cliente supabase deste jogo tem

Ler e gravar numa tabela:

- `supabase.from('tabela').select('colunas')`
- `.insert({ ... })` ou `.insert([{ ... }, { ... }])`
- `.update({ ... })` e `.delete()`, sempre com um filtro
- `.select()` depois de `insert`, `update` ou `delete`, para receber as linhas de volta

Filtros:

- `.eq()`, `.neq()`, `.gt()`, `.gte()`, `.lt()`, `.lte()`
- `.like()`, `.ilike()`
- `.in('coluna', [valores])`
- `.is('coluna', null)`, e também `true` ou `false`

Ordem e quantidade:

- `.order('coluna', { ascending: false })`
- `.limit(n)`
- `.single()` e `.maybeSingle()`

Funções do banco:

- `supabase.rpc('nome', { argumento: valor })`

Login:

- `supabase.auth.signUp({ email, password, options: { data } })`
- `supabase.auth.signInWithPassword({ email, password })`
- `supabase.auth.updateUser({ data })`
- `supabase.auth.getUser()`
- `supabase.auth.signOut()`

## O que ele ainda não tem

Qualquer outro método responde "existe no supabase-js, mas ainda não neste jogo". Os mais procurados:

- tabelas embutidas, apelidos e conversões dentro do `select`
- `.range()`, `.or()`, `.not()`, `.contains()` e os outros filtros
- `count` e `head` no `select`
- `storage`, `channel` (tempo real) e `functions`
- trocar e-mail ou senha com `updateUser`

Se sentir falta de algum, é um bom sinal de que ele deve entrar numa próxima versão.

## Diferenças para um projeto de verdade

- O `updateUser({ data })` vale já na chamada seguinte. Num projeto real, o dado novo entra no token na próxima renovação.
- `update` e `delete` sem filtro são recusados, como no Supabase.
- Só o schema `public` existe para o cliente, como na API do Supabase.

## Dicas e estrelas

Cada fase vale três estrelas em cada modo. Cada dica aberta custa uma, e o mínimo é uma. A primeira dica diz onde olhar, a segunda revela as políticas e a terceira mostra a solução comentada.

Vencer uma fase em qualquer modo libera a seguinte.

## Desafio diário

Todo dia há uma fase nova, sorteada pela data: uma falha, um app e um alvo diferentes. É a mesma para todo mundo e troca à meia-noite, no seu horário. Dias seguidos contam como sequência, e as estrelas do desafio não entram no total da campanha.

## Fases em que a linha nunca aparece

Numa fase de **descobrir**, o RLS está certo e nenhuma consulta devolve a linha-alvo. O banco deixa escapar a informação de outro jeito, e você a informa na caixa "Sua resposta".

## Onde isso tudo roda

No seu navegador. O banco é um Postgres de verdade (PGlite) que existe só na sua aba, e o seu código roda isolado dele. Nenhum banco de terceiros é tocado.

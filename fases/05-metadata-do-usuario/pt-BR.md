# Metadata do usuário

## Resumo
O papel de gerente agora vem no token de login. Quem escreve no token?

## Briefing do ataque
Nova reforma na Padaria do Zé. A tabela de perfis foi embora: agora o papel de cada pessoa viaja dentro do **token de login**, e a política dos pedidos só precisa ler de lá. Mais simples, mais rápido.

Você é a Alice, cliente comum. O Bruno encomendou um bolo com um recado que só uma pessoa devia ler: é o **pedido #23**.

**Objetivo:** fazer o pedido #23 aparecer numa resposta do seu console.

## Briefing da defesa
A ideia de ler o papel do token é boa. O erro está em **qual parte** do token a política lê. Conserte **sem quebrar o app**: os clientes continuam com os próprios pedidos, e a Carla, que é gerente de verdade, continua vendo tudo.

O editor já traz as políticas atuais. Como na fase anterior, a grade parece certa: é a bateria que acusa.

## Dicas do ataque
1. Um token do Supabase carrega dois blocos de dados sobre você: `user_metadata` e `app_metadata`. Um deles é seu para editar. Descubra qual, com `supabase.auth.getUser()`.

2. Esta dica revela as políticas. Veja de onde a política `gerente_ve_tudo` lê o papel, e lembre que o cliente tem um método para atualizar os próprios dados: `supabase.auth.updateUser`.

3. O `user_metadata` é do usuário. A Alice entra, se declara gerente, e a política acredita:

```js
await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
await supabase.auth.updateUser({ data: { papel: 'gerente' } })
console.log(await supabase.from('pedidos').select())
```

## Dicas da defesa
1. Só uma palavra da política precisa mudar. Pense em qual dos dois blocos do token o usuário **não** consegue alterar.

2. O `app_metadata` só é escrito pelo servidor. A Carla já tem o papel de gerente lá.

3. Troque `user_metadata` por `app_metadata` na política da gerente:

```sql
create policy gerente_ve_tudo on public.pedidos
  for select to authenticated
  using (auth.jwt() -> 'app_metadata' ->> 'papel' = 'gerente');
```

## Explicação
O token de login do Supabase traz dois blocos. O `user_metadata` existe para o usuário guardar o que quiser (apelido, avatar) e pode ser alterado por ele mesmo com `auth.updateUser`. O `app_metadata` só o servidor escreve.

Uma política que lê permissão do `user_metadata` está perguntando ao próprio visitante se ele é gerente.

Neste jogo o papel novo vale já na chamada seguinte. Num projeto real ele entra no token na próxima renovação, o que só atrasa o ataque em alguns minutos.

O conserto é ler de `app_metadata`, ou guardar os papéis numa tabela em que só o servidor escreve.

# User metadata

## Summary
The manager role now travels in the login token. Who writes to the token?

## Attack briefing
Another overhaul at Zé's Bakery. The profiles table is gone: now each person's role (`papel`) travels inside the **login token**, and the orders policy only has to read it from there. Simpler, faster.

You're Alice, a regular customer. Bruno ordered a cake with a message only one person was meant to read: it's **order #23**.

**Goal:** make order #23 show up in a response in your console.

## Defense briefing
Reading the role from the token is a good idea. The mistake is in **which part** of the token the policy reads. Fix it **without breaking the app**: customers keep their own orders, and Carla, who really is the manager (`gerente`), still sees everything.

The editor already has the current policies. As in the previous level, the grid looks right: it's the test suite that catches it.

## Attack hints
1. A Supabase token carries two blocks of data about you: `user_metadata` and `app_metadata`. One of them is yours to edit. Find out which, with `supabase.auth.getUser()`.

2. This hint reveals the policies. See where the `gerente_ve_tudo` policy reads the role from, and remember the client has a method to update your own data: `supabase.auth.updateUser`.

3. `user_metadata` belongs to the user. Alice signs in, declares herself a manager, and the policy believes her:

```js
await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
await supabase.auth.updateUser({ data: { papel: 'gerente' } })
console.log(await supabase.from('pedidos').select())
```

## Defense hints
1. Only one word of the policy needs to change. Think about which of the token's two blocks the user **cannot** alter.

2. `app_metadata` is written only by the server. Carla already has the manager role there.

3. Swap `user_metadata` for `app_metadata` in the manager policy:

```sql
create policy gerente_ve_tudo on public.pedidos
  for select to authenticated
  using (auth.jwt() -> 'app_metadata' ->> 'papel' = 'gerente');
```

## Explanation
Supabase's login token carries two blocks. `user_metadata` exists for the user to store whatever they like (nickname, avatar) and can be changed by the user with `auth.updateUser`. `app_metadata` is written only by the server.

A policy that reads permissions from `user_metadata` is asking the visitor whether they're the manager.

In this game the new role takes effect on the very next call. In a real project it enters the token at the next refresh, which only delays the attack by a few minutes.

The fix is to read from `app_metadata`, or to keep roles in a table only the server writes to.

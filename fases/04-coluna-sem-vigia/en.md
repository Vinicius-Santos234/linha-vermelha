# The unguarded column

## Summary
The bakery got a dashboard for its manager. Who decides who the manager is?

## Attack briefing
After the scare, Zé hired someone to do it properly. Now RLS is enabled, each customer has a **profile** (the `perfis` table), and Carla, the manager, sees every order from her dashboard.

You're still Alice, a regular customer. Bruno is organizing his boss's farewell party: it's **order #12**.

**Goal:** make order #12 show up in a response in your console.

## Defense briefing
The policies are almost right, which is why nobody saw the flaw. Fix it **without breaking the app**: each customer still sees their own orders and changes their own name in the profile, and Carla still sees everything.

The editor already has the current policies. The grid looks right: this time the problem only shows up when someone attacks, so it's the test suite that will catch it.

## Attack hints
1. The orders are well protected. Look at the other table, `perfis`, and at what you're allowed to **update** in it.

2. This hint reveals the policies. The UPDATE one on `perfis` checks **whose row it is**. Does it say anything about **which columns** may change?

3. The policy lets Alice edit her whole profile, including the column that says who's an admin:

```js
const { data } = await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
await supabase.from('perfis').update({ is_admin: true }).eq('id', data.user.id)
console.log(await supabase.from('pedidos').select())
```

## Defense hints
1. RLS policies decide which **rows** each person can reach. They say nothing about **columns**. Look for the Postgres mechanism that does.

2. Supabase gives the API the right to update the whole table. You can take that right away and give back only the part the client needs, with `revoke` and `grant ... (column)`.

3. Keep the policies and add the column-level grant at the end:

```sql
revoke update on public.perfis from anon, authenticated;
grant update (nome) on public.perfis to authenticated;
```

## Explanation
RLS answers "which rows?". The UPDATE policy said, correctly, that each person only touches their own row in `perfis`. But the `is_admin` column lives in that same row, and nothing said it couldn't change.

It's the mistake of storing privilege in a table the user can edit. It tends to pass review, because the policy read on its own is correct.

There are two common fixes. A column-level grant lets the client change only `nome` (the name). The other way out is to move the privilege elsewhere: a roles table only the server writes to.

# The view that ignores RLS

## Summary
The table is locked. The summary someone built on top of it is not.

## Attack briefing
The bakery's orders are protected by the book: RLS enabled, per-owner policy. Querying `pedidos` returns only what's yours.

For the app's home screen, someone created a **summary** of the orders. It's another door to the same data.

Bruno ordered a gift basket with a note nobody else was meant to read. It's **order #82**.

**Goal:** make order #82 show up in a response in your console, through the table or through the summary.

## Defense briefing
The policies on `pedidos` are right, and they're not what you'll be changing. The leak comes from the `pedidos_resumo` view. Fix it **without breaking the app**: the summary still exists and shows each customer their own orders.

The grid has two tables now. One of them is all red.

## Attack hints
1. Look at the schema carefully: there's more than one thing to query. The client reads a view the same way it reads a table.

2. This hint reveals the policies and how the view was created. Notice what does **not** appear in its definition: no option saying whose permissions it runs with.

3. The view runs with the permissions of whoever created it, and RLS doesn't apply to them:

```js
await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
console.log(await supabase.from('pedidos_resumo').select())
```

## Defense hints
1. By default, a Postgres view queries its tables with the permissions of whoever created it. The RLS that applies is the creator's, not the querying user's.

2. Since Postgres 15 there's a view option to flip that: `security_invoker`.

3. One line does it, without recreating anything:

```sql
alter view public.pedidos_resumo set (security_invoker = true);
```

## Explanation
RLS applies to **whoever queries the table**. When the query goes through an ordinary view, the one querying the table is the view's owner. If the owner is the role that created the database, the policies simply don't apply to it.

It's one of the easiest flaws to create in Supabase: the table was audited, and the view was born later, on a busy day.

With `security_invoker = true`, the view queries with the permissions of whoever called it, and the table's policies apply again.

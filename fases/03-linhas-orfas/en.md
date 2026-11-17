# Orphan rows

## Summary
The bakery started taking orders from people with no account. Who owns a row with no owner?

## Attack briefing
Zé's Bakery now writes down orders from **guests**: people who call or stop by the counter, with no sign-up. Those orders go into the same `pedidos` table, with an empty `user_id`, and they carry an address and a phone number.

The per-owner policy is there, well written. It just got a patch so guest orders wouldn't disappear.

**Order #43** belongs to a guest and has the address of a surprise party for a 60-year-old lady.

**Goal:** make order #43 show up in a response in your console.

## Defense briefing
Guest orders are leaking, address and phone included. Fix it **without breaking the app**: each customer still touches only their own orders.

An order with no owner must not show up for anyone through the API. The counter handles it, through the server.

## Attack hints
1. Look for the orders that belong to nobody. The client has a filter for empty values: `.is('column', null)`.

2. This hint reveals the policies. Notice the `OR`. Now think about what `auth.uid()` returns for someone who hasn't signed in.

3. You don't even need an account. Without a login, the second half of the `OR` lets every guest order through:

```js
console.log(await supabase.from('pedidos').select().is('user_id', null))
```

## Defense hints
1. The `OR user_id IS NULL` was added so guest orders would "work". Ask who they need to work for.

2. Drop the `OR`. A row with no owner becomes invisible to the API, which is right: the server, with the service key, doesn't go through RLS.

3. The policy goes back to being owner-only, and only for signed-in users:

```sql
alter table public.pedidos enable row level security;

create policy pedidos_do_dono on public.pedidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

## Explanation
`OR user_id IS NULL` looks harmless: "if it has no owner, let it through". But the policy can't tell "no owner" from "everyone's". To Postgres, the condition became true for anybody, signed in or not.

It's the pattern for all data born outside the normal flow: imports, guest orders, records created by the system.

The fix is to separate the flows. What has no owner is the server's responsibility, and the API's policy goes back to talking only about people with accounts.

# RLS disabled

## Summary
Zé's Bakery keeps its orders in a table nobody protected.

## Attack briefing
**Padaria do Zé** (Zé's Bakery) launched an ordering app built over a weekend. You're Alice, a regular customer, and you have what anyone with the site open has: the `supabase` client and the public key.

Bruno, another customer, ordered something for a surprise party. It's **order #7**, in the `pedidos` (orders) table.

**Goal:** make order #7 show up in a response in your console.

## Defense briefing
The leak ended up in the neighborhood group chat and Zé asked for your help. Fix the `pedidos` table **without breaking the app**: each customer still sees, updates and cancels their own orders, and nobody else's.

The grid on the side shows who can see each order. Anything in red differs from what it should be.

## Attack hints
1. Look at the `pedidos` table and at the simplest operation there is: reading. Do you really need to be signed in?

2. This hint reveals the table's policies. Notice what is **not** there: a table with RLS disabled filters no rows at all, and in Supabase every new table in `public` is born reachable through the API.

A public key in the site's code is not the flaw. It's public by design, and what protects the data is the database's rules. The same goes for a Firebase API key, protected by Rules: this game stores your progress that way.

3. With no login and no filter, the public key reads the whole table:

```js
const { data } = await supabase.from('pedidos').select()
console.log(data)
```

## Defense hints
1. It takes two things: enabling RLS on the table and saying who can do what. Enabling RLS alone locks everyone out, including the owners of the orders.

2. The policy has to compare the `user_id` column with whoever is making the call, which is `auth.uid()`. `USING` decides which rows the person sees and touches; `WITH CHECK` decides what they can write.

3. Enable RLS and create a single per-owner policy for every operation:

```sql
alter table public.pedidos enable row level security;

create policy pedidos_do_dono on public.pedidos
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

## Explanation
In Supabase, the `anon` key ships with the site: every visitor has it. What decides how far that key reaches is **Row Level Security**. With RLS disabled, Postgres filters nothing, and Supabase's default privileges let the API read and write the whole table.

It's the most common flaw of all, because nothing warns you: the app works perfectly for anyone using it as intended.

Note that hiding the key wouldn't fix anything. Supabase's `anon` key and Firebase's API key are public by design: anyone can read them in the site's code. The protection has to live in the database's rules, RLS in one case and Rules in the other.

The fix has two halves. `ENABLE ROW LEVEL SECURITY` starts denying everything, and the policy gives each person back only what's theirs. One without the other gets you a leak or a broken app.

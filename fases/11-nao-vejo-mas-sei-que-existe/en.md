# Can't see it, but I know it's there

## Summary
RLS hides Bruno's coupon. The "unique code" rule tells you it exists.

## Attack briefing
The bakery hands out discount coupons (the `cupons` table). Each customer sees only their own, and RLS is right: no query of yours will return someone else's coupon.

The codes follow a pattern, `PADARIA-000` to `PADARIA-999`, and never repeat. Yours is `PADARIA-007`. Bruno's is worth 50% off and works for anyone who types it at the register.

**Goal:** find out the code of Bruno's coupon and enter it under "Your answer". In this level the row never shows up: you have to **work it out**.

## Defense briefing
The policies are right and stay as they are. The leak comes from the rule that forbids repeated codes: by rejecting a code, the database confirms it exists. Fix it **without breaking the app**: each customer can still create their own coupons.

The grid shows nothing wrong, because nobody reads what they shouldn't. It's the test suite that replays the attack.

## Attack hints
1. You can't read Bruno's coupon, but you can **create** coupons of your own. What happens when you try to create one with a code that already exists?

2. This hint reveals the policies and the table's constraints. The unique constraint covers the **whole** table, not just the rows you can see. Its error has a code: `23505`.

3. A loop tries all thousand codes. Whichever one fails as a duplicate, and isn't yours, is Bruno's:

```js
const { data } = await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
for (let n = 0; n < 1000; n++) {
  const codigo = 'PADARIA-' + String(n).padStart(3, '0')
  const { error } = await supabase.from('cupons').insert({ user_id: data.user.id, codigo, desconto: 0 })
  if (error?.code === '23505') console.log('already exists:', codigo)
}
```

## Defense hints
1. Don't touch the policies. Look at the `unique (codigo)` constraint: it compares the new code with **every** customer's codes.

2. If the code only needs to be unique per customer, the constraint can include `user_id`. Then it never compares against other people's rows.

3. Swap the constraint, keeping the policies:

```sql
alter table public.cupons drop constraint cupons_codigo_key;
alter table public.cupons add constraint cupons_codigo_por_cliente unique (user_id, codigo);
```

## Explanation
RLS controls which rows a query **returns**. Unique constraints, foreign keys and indexes keep looking at the whole table, and their errors become a side channel: the answer "already exists" is one bit of information about a row you can't see.

With a small space of values, a thousand tries is enough. The same goes for emails, ID numbers and usernames.

There are two fixes. The constraint becomes per customer, as here. Or the value stops being guessable: the server generates a long random code nobody hits by trial.

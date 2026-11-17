# The temporary policy

## Summary
The gym enabled RLS. And left behind a policy that says yes to everything.

## Attack briefing
The **Ferro & Fôlego** gym keeps its members' workout sheets in an app, in the `fichas` table. This time someone remembered to enable RLS: without a login, the table returns nothing.

You're Alice, a regular member, with your own account. Bruno trains in the same time slot and has been hiding something from the football team. It's **sheet #33**.

**Goal:** make sheet #33 show up in a response in your console.

## Defense briefing
RLS is enabled, and still every member can read everyone's sheet. Fix it **without breaking the app**: each member still sees, updates and deletes their own sheets, and nobody else's.

The editor already has the current policy. Read what it actually says.

## Attack hints
1. RLS enabled doesn't mean RLS done right. What changes when you sign in before querying `fichas`?

2. This hint reveals the policies. Read the `USING` condition: does it compare anything with whoever is making the call?

3. The policy applies to anyone signed in, with no condition at all:

```js
await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
console.log(await supabase.from('fichas').select())
```

## Defense hints
1. The problem is a single word: `true`. A condition that is always true filters no rows.

2. Replace `true` with a comparison between the `user_id` column and whoever is calling, which is `auth.uid()`. That goes for both `USING` and `WITH CHECK`.

3. Delete the temporary policy from the editor and write the real one:

```sql
alter table public.fichas enable row level security;

create policy fichas_do_dono on public.fichas
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

## Explanation
`USING (true)` is the policy you write in a hurry to get the prototype working, promising to come back later. It survives any rushed review, because the dashboard shows RLS enabled and a policy in place.

For anyone signed in, the effect is the same as RLS disabled, and creating an account is usually free.

The fix is for the policy to say what the business rule says: each row belongs to whoever is in the `user_id` column.

# Policies that add up

## Summary
The clinic added a policy to restrict access. It granted access instead.

## Attack briefing
**Clínica Vida** delivers test reports through its app, in the `laudos` table. After an audit came a reinforcement: a report only shows up for accounts with **two-step verification**. The team added a new policy, next to the per-owner policy that already existed.

You're Alice, a patient, with verification turned on. Bruno had a test done and asked to receive the result only in person. It's **report #52**.

**Goal:** make report #52 show up in a response in your console.

## Defense briefing
Both policies are right when read on their own. The problem is how Postgres **combines** them. Fix it **without breaking the app**: each patient sees only their own reports, and only if the account is verified.

Carla hasn't turned verification on yet: her reports must not show up, not even for her.

## Attack hints
1. No trick needed. Sign in with your account, which is verified, and read the whole table.

2. This hint reveals the policies. There are two, and both are permissive. When there's more than one permissive policy, does Postgres require that **all** pass, or that **any** passes?

3. Permissive policies add up with OR. The second says "verified accounts see", and Alice is verified:

```js
await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
console.log(await supabase.from('laudos').select())
```

## Defense hints
1. The second policy was written to restrict. There's a word in `CREATE POLICY` that tells Postgres a policy restricts instead of granting.

2. `AS RESTRICTIVE`. A restrictive policy has to pass **together** with some permissive one. It's the one that adds up with AND.

3. Keep the per-owner policy and recreate the other one as restrictive:

```sql
create policy so_verificados on public.laudos
  as restrictive
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'verificado')::boolean);
```

## Explanation
Every policy is born `PERMISSIVE`, and permissive policies combine with **OR**: one passing is enough. Adding a permissive policy never takes access away from anyone. It only gives.

The team meant "owner **and** verified". What they wrote was "owner **or** verified": any verified account started reading every patient's reports.

To restrict, the policy has to be `AS RESTRICTIVE`. It grants nothing by itself: it works as one more filter on top of what the permissive ones already let through.

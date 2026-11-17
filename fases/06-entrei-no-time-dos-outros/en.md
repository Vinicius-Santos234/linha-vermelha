# I joined someone else's team

## Summary
Projects are only for members of the team. And who decides who's a member?

## Attack briefing
The town's bakeries and pastry shops share the same project board. Each **team** (`times`) has an owner and its members (`membros`), and a project (`projetos`) only shows up for people on its team.

You're Alice, owner of the "Padaria do Zé" team. The competitor, "Confeitaria Lia", is Bruno's, and it keeps the neighborhood's most famous recipe in there. It's **project #62**.

**Goal:** make project #62 show up in a response in your console.

## Defense briefing
Reading projects is right: only members see them. The hole is in **how someone becomes a member**. Fix it **without breaking the app**: a team's owner can still add people to it.

The grid shows nothing wrong, because nobody has got in where they shouldn't yet. It's the test suite that tries the attack and the legitimate use.

## Attack hints
1. You can't read Bruno's projects because you're not on his team. Look at the table that says who's on which team, and at what you're allowed to **insert** into it.

2. This hint reveals the policies. Read the `WITH CHECK` of `membros_entrar`: it's two conditions joined by `OR`. Does either of them depend on an invitation?

3. The policy accepts anyone who signs up with their own id, on any team:

```js
const { data } = await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
await supabase.from('membros').insert({ id: 90, time_id: 2, user_id: data.user.id })
console.log(await supabase.from('projetos').select())
```

## Defense hints
1. The `WITH CHECK` of `membros_entrar` answers "may this row be created?". Today it accepts people who add themselves. Who should be able to put someone on a team?

2. Remove the `user_id = auth.uid()` half of the `OR`. What's left is the right condition: whoever inserts is the team's owner.

3. Only the joining policy changes:

```sql
create policy membros_entrar on public.membros
  for insert to authenticated
  with check (exists (select 1 from public.times t where t.id = time_id and t.dono = auth.uid()));
```

## Explanation
Checking `user_id = auth.uid()` on an INSERT guarantees nobody impersonates someone else. It doesn't guarantee the person **is allowed** to be there. In a membership table, the row itself is the permission: whoever can create it grants themselves access.

The projects' read policy was right all along. It trusted the members table, and it was the members table that accepted anyone.

The fix is for joining a team to require someone with authority over it: the owner, or an invitation only the owner can create.

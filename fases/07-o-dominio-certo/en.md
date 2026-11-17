# The right domain

## Summary
The staff area is only for people with a bakery email. And who checks the email?

## Attack briefing
Zé's Bakery opened a **staff area** in the app, with its suppliers (the `fornecedores` table) and the prices agreed with each one. The rule is simple: you only get in with an `@padaria.com.br` email.

You're Alice, a customer, with an ordinary email. The price of butter was settled in secret. It's **supplier #72**.

**Goal:** make supplier #72 show up in a response in your console.

## Defense briefing
The policy checks the caller's email, and the email is whatever the person typed when signing up. Fix it **without breaking the app**: Carla, who really is an employee, still sees the suppliers.

The grid looks right: everyone who already has an account is where they should be. The attack creates a new account, and it's the test suite that replays it.

## Attack hints
1. Your account won't do. But nobody said you can only have one. See `supabase.auth.signUp` in the help page.

2. This hint reveals the policies. The condition looks at the **text** of the email. Does this app ask you to prove the email is yours before letting you in?

3. Sign-up doesn't confirm the email. Anyone can open an account with the bakery's domain:

```js
await supabase.auth.signUp({ email: 'alice@padaria.com.br', password: 'qualquercoisa' })
console.log(await supabase.from('fornecedores').select())
```

## Defense hints
1. The email is something the user chooses. Look in the token for something only the server writes.

2. Only the server changes `app_metadata`, and Carla already has `papel: funcionario` (role: employee) there.

3. The policy starts reading the role instead of the email:

```sql
create policy so_a_equipe on public.fornecedores
  for select to authenticated
  using (auth.jwt() -> 'app_metadata' ->> 'papel' = 'funcionario');
```

## Explanation
An email only proves something once it's confirmed. With confirmation turned off, which is how many projects stay during development, an email is just text somebody typed.

Even with confirmation, granting access by domain is fragile: former employees, email aliases and look-alike domains all get in.

The fix is for the permission to come from something the server decides: a role in `app_metadata` or a staff table only the server writes to.

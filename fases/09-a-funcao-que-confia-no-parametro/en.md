# The function that trusts its parameter

## Summary
The "My orders" screen calls a function. The function asks whose orders to return. Asks whom?

## Attack briefing
The `pedidos` table is well protected. To build the "My orders" screen, the team wrote a database **function**, called by the app with `supabase.rpc`. The app always sends the id of whoever is signed in.

You are not the app. You have the console.

Bruno ordered a wedding cake, and the date is still a secret. It's **order #92**.

**Goal:** make order #92 show up in a response in your console.

## Defense briefing
The policies are right. The hole is the `pedidos_do_usuario` function, which goes over their heads. Fix it **without breaking the app**: the function still exists, and each customer still sees their own history through it.

The grid shows nothing wrong, because it looks at tables. It's the test suite that calls the function.

## Attack hints
1. The schema shows a function besides the tables. It takes an argument. Who picks its value?

2. This hint reveals the policies and the function's code. Notice `SECURITY DEFINER`, and where the `uid` in the `WHERE` comes from. To find someone else's id, look for a public table that shows it.

3. The function returns the orders of whoever the argument says, and the public reviews (`avaliacoes`) hand over Bruno's id:

```js
await supabase.auth.signInWithPassword({
  email: 'alice@exemplo.com', password: 'paodequeijo',
})
const { data } = await supabase.from('avaliacoes').select('user_id').eq('nome', 'Bruno').single()
console.log(await supabase.rpc('pedidos_do_usuario', { uid: data.user_id }))
```

## Defense hints
1. `SECURITY DEFINER` makes the function run with the permissions of whoever created it. Inside it, the caller's RLS doesn't apply.

2. There are two ways: the function uses `auth.uid()` instead of trusting the argument, or it becomes `SECURITY INVOKER`, so RLS applies inside it again.

3. Recreating the function as `SECURITY INVOKER` fixes it without changing the app:

```sql
create function public.pedidos_do_usuario(uid uuid) returns setof public.pedidos
  language sql stable
  security invoker
  set search_path = ''
as $$
  select * from public.pedidos where user_id = uid order by id
$$;
```

## Explanation
A `SECURITY DEFINER` function is a door that opens with the owner's key. It exists for cases where the user needs to do something the policies don't allow, which is why it has to check for itself who's calling.

This one checked nothing: it took an id and returned that id's orders. The app always sent the right id, and that was enough for nobody to notice. But the app isn't the only thing that can call the function.

Rule of thumb: an argument coming from the client never decides **whose** data it is. That comes from `auth.uid()`.

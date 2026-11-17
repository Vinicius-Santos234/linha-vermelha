# search_path hijacking

## Summary
The function checks who's allowed to see. But checks with which function?

## Attack briefing
After the last scare, the bakery locked everything down: the table obeys RLS even for its owner, and the reports backend no longer has permission to read it at all. Reports now come out of a **function**, which runs with privilege and returns only what each customer may see.

You're Alice, in the reports panel. This time the console accepts more than queries. Bruno ordered a surprise cake for Lia. It's **order #132**.

**Goal:** make order #132 show up in the result. One statement at a time.

## Defense briefing
The `relatorio_de_pedidos` function runs with its creator's privilege and calls another function by its short name. What decides which function gets called is the `search_path` of whoever is using the database. Fix it **without breaking the app**: each customer's report still returns their orders.

The grid shows nothing wrong. It's the test suite that replays the attack.

## Attack hints
1. Read the report function's code: `select prosrc from pg_proc where proname = 'relatorio_de_pedidos'`. It calls another function. With or without the schema name?

2. This hint reveals the policies and the functions. The function is `SECURITY DEFINER` and doesn't pin its `search_path`. Check yours: `show search_path`. The `public` schema comes before `app`, and you can create things in it.

3. A function with the same name in `public` is found first. It takes two statements, one at a time:

```sql
create function public.pode_ver(uuid) returns boolean language sql as 'select true'
```

```sql
select * from relatorio_de_pedidos()
```

## Defense hints
1. A `SECURITY DEFINER` function has to decide for itself where to look things up. Today it inherits the `search_path` of whoever calls it.

2. It takes three measures: `SET search_path = ''` on the function, calling `app.pode_ver` by its full name, and taking the right to create in `public` away from those who don't need it.

3. Recreate the function and revoke creation:

```sql
create function public.relatorio_de_pedidos() returns setof public.pedidos
  language sql stable
  security definer
  set search_path = ''
as $$
  select * from public.pedidos where app.pode_ver(user_id) order by id
$$;

revoke create on schema public from relatorios;
```

## Explanation
When Postgres finds a name with no schema, it searches the schemas in `search_path`, in order, and takes the first match. A `SECURITY DEFINER` function that doesn't pin its own `search_path` runs with the owner's privilege, but with the caller's search path.

All it took was a function of the same name in a schema that comes first, and where the attacker could create objects. The privileged function started obeying the attacker's code.

That's why the recommendation is always the same: every `SECURITY DEFINER` function gets `SET search_path = ''` and fully qualified names. And the `public` schema shouldn't be a place where any role can create things.

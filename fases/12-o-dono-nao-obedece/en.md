# The owner doesn't obey

## Summary
The policies are perfect. The reports backend doesn't need them.

## Attack briefing
Zé's Bakery launched **SQL reports**: the customer writes a query and gets their own orders any way they like. The query runs on the server, over the backend's connection, on behalf of whoever asked.

The table's policies are right. Through the app, each customer only sees what's theirs.

You're Alice, signed in to the reports panel. Bruno ordered snacks for a party his business partner couldn't find out about. It's **order #122**.

**Goal:** make order #122 show up in a report's result. Here the console is SQL, and it only accepts queries.

## Defense briefing
There's nothing wrong with the policy. The problem is **who** runs the query: the backend's role is the table's owner. Fix it **without breaking the app**: each customer's report still returns their orders.

The grid shows nothing wrong, because it queries the way the app's clients do. It's the test suite that runs the report.

## Attack hints
1. You don't need to fool the policy. Write the simplest report possible and see what comes back.

2. This hint reveals the policies. The policy is correct. Now find out which role your query runs as: `select current_user`. And who owns the table: `select tableowner from pg_tables where tablename = 'pedidos'`.

3. The backend connects as the table's owner, and RLS doesn't apply to the owner:

```sql
select * from pedidos
```

## Defense hints
1. In Postgres, a table's owner doesn't go through its policies. It doesn't even need to be a superuser.

2. There's a command to say not even the owner escapes: `FORCE ROW LEVEL SECURITY`.

3. One more line, next to the `ENABLE`:

```sql
alter table public.pedidos force row level security;
```

## Explanation
`ENABLE ROW LEVEL SECURITY` turns the policies on for everyone **except the table's owner** and roles with `BYPASSRLS`. That's on purpose: the owner has to be able to do maintenance.

The danger shows up when the backend connects as the owner, which is common: the role that runs the migrations creates the tables, and the same role ends up serving the app.

There are two fixes, and ideally you do both. `FORCE ROW LEVEL SECURITY` subjects the owner to the policies. And the backend starts connecting with a role that owns nothing.

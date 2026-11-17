## How to play

Each level is a fake app with a real flaw. In **Attack** you're an ordinary visitor, with what anyone with the site open has: the `supabase` client and the public key. You win when the target row from the briefing shows up in a response in your console. There's no secret code to type in.

In **Defense** you get the broken policies and fix them in SQL. You win when the test suite goes all green: the attacks stop working **and** the app still works for people using it properly.

In **Full cycle** you do both in a row, and the attack you wrote becomes one of the tests for your fix.

The **Lab** is free-form: no goal and no stars.

The apps are Brazilian, so table and column names are in Portuguese: `pedidos` are orders, `perfis` are profiles, `user_id` is still `user_id`. The briefings tell you what each one is.

## The Attack console

The code runs with top-level `await` and receives two things: `supabase` and `console`. Each call shows up under "Responses", with the session it was made in. `Ctrl + Enter` runs.

The session carries over from one run to the next: if you signed in with `signInWithPassword`, you stay signed in until you sign out or restart the level. The code is stopped if it runs past 15 seconds.

```js
const { data, error } = await supabase.from('pedidos').select('id, itens').eq('id', 7)
console.log(data, error)
```

## What this game's supabase client has

Reading and writing a table:

- `supabase.from('table').select('columns')`
- `.insert({ ... })` or `.insert([{ ... }, { ... }])`
- `.update({ ... })` and `.delete()`, always with a filter
- `.select()` after `insert`, `update` or `delete`, to get the rows back

Filters:

- `.eq()`, `.neq()`, `.gt()`, `.gte()`, `.lt()`, `.lte()`
- `.like()`, `.ilike()`
- `.in('column', [values])`
- `.is('column', null)`, and also `true` or `false`

Order and quantity:

- `.order('column', { ascending: false })`
- `.limit(n)`
- `.single()` and `.maybeSingle()`

Database functions:

- `supabase.rpc('name', { argument: value })`

Login:

- `supabase.auth.signUp({ email, password, options: { data } })`
- `supabase.auth.signInWithPassword({ email, password })`
- `supabase.auth.updateUser({ data })`
- `supabase.auth.getUser()`
- `supabase.auth.signOut()`

## What it doesn't have yet

Any other method answers "exists in supabase-js, but not in this game yet". The most wanted:

- embedded tables, aliases and casts inside `select`
- `.range()`, `.or()`, `.not()`, `.contains()` and the other filters
- `count` and `head` in `select`
- `storage`, `channel` (realtime) and `functions`
- changing email or password with `updateUser`

If you miss one, that's a good sign it should go into a future version.

## Differences from a real project

- `updateUser({ data })` takes effect on the very next call. In a real project, the new data enters the token at the next refresh.
- `update` and `delete` without a filter are rejected, as in Supabase.
- Only the `public` schema exists for the client, as in Supabase's API.

## The tier 4 SQL console

In tier 4 levels the app has a reports feature that runs SQL on the server, over the backend's connection. The console stops being JavaScript: you write a SQL statement, and it runs on your behalf.

- One statement per run. Two statements at once are rejected.
- You can read the Postgres catalog, as on a real database: `pg_policies`, `pg_tables`, `pg_proc`.
- In a query-only level, anything that isn't a `SELECT` is rejected.
- You can't change your identity: `set_config` is denied.

## Hints and stars

Each level is worth three stars in each mode. Each hint you open costs one, and the minimum is one. The first hint says where to look, the second reveals the policies and the third shows the commented solution.

Beating a level in any mode unlocks the next one.

## Daily challenge

Every day there's a new level, drawn from the date: a different flaw, app and target. It's the same for everyone and changes at midnight, your time. Consecutive days count as a streak, and the challenge's stars don't count toward the campaign total.

## Levels where the row never shows up

In a **find out** level, RLS is right and no query returns the target row. The database lets the information slip some other way, and you enter it in the "Your answer" box.

## Where all this runs

In your browser. The database is a real Postgres (PGlite) that exists only in your tab, and your code runs isolated from it. No third-party database is touched.

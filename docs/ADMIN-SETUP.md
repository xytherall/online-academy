# Admin setup (one-time)

How to create the first admin account, and how to create test accounts. There is no email provider in v1, so every account is created by hand in the Supabase dashboard and the login details are shared with the person directly.

## Required Supabase dashboard settings

| Setting | Where | Value |
|---|---|---|
| Email provider | Authentication → Sign In / Providers → Email | **Enabled** |
| Allow new users to sign up | Authentication → Sign In / Providers → Email | **Off** |
| Confirm email | Authentication → Sign In / Providers → Email | Off, or tick *Auto Confirm User* on every user you create |

**"Allow new users to sign up" must stay off.** The academy creates all accounts; public sign-up would let anyone create a login, and the `handle_new_user` trigger would give them a student profile.

## Create the first admin

1. **Authentication → Users → Add user → Create new user.**
2. Enter the email and a password. **Tick *Auto Confirm User*** — without it the account cannot log in, because no confirmation email can be sent.
3. Creating the user fires the `handle_new_user` trigger, which inserts a row in `public.profiles` with `role = 'student'`. The role is hardcoded in the trigger and is never taken from the sign-up payload, so the next step is the only way to get an admin.
4. **SQL Editor** → run, with the real email and name:

   ```sql
   update public.profiles
   set role = 'admin',
       full_name = 'Full Name Here',
       must_change_password = false
   where email = 'admin@example.com';
   ```

5. Confirm exactly one admin exists:

   ```sql
   select id, email, full_name, role, is_active, must_change_password
   from public.profiles
   where role = 'admin';
   ```

Repeat for the second admin (the project owner and the current teacher both have full admin rights).

## Create test accounts for verification

Create two users the same way (**Auto Confirm User** ticked each time), then run:

```sql
-- promote the test admin
update public.profiles set role = 'admin', full_name = 'Test Admin'  
where email = 'test-admin@example.com';

-- the test student keeps role 'student'; force a password change on first login
update public.profiles set full_name = 'Test Student', must_change_password = true
where email = 'test-student@example.com';
```

To test that deactivated users are blocked:

```sql
update public.profiles set is_active = false where email = 'test-student@example.com';
-- undo afterwards
update public.profiles set is_active = true  where email = 'test-student@example.com';
```

## Resetting a password (v1)

Until a domain and email provider exist there is no "forgot password" flow. An admin sets a new temporary password from the student's page in the admin area (Stage 4), which also sets `must_change_password = true` so the student must choose a new one on next login.

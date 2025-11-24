# Profile and Payment Event Correlation Queries

The following SQL snippets help analyze profile creation flows and correlate profile audit events with payment activity. They assume the event payloads store the event action and user references in JSON columns (`payload` and `traits`) while profile metadata lives in `public.profiles` and the role mapping lives in `public.roles` or a join table such as `public.profile_roles`.

## 1) Locate profile creation events

Filter for profile creation events in `public.user_events` by checking the `payload->>'action'` JSON value. Adjust the list of actions if your installation emits alternative labels (for example, `profile_created`).

```sql
select
  id,
  created_at,
  payload->>'action'              as action,
  payload->>'user_id'             as user_id,
  payload->>'email'               as email,
  payload->>'phone'               as phone,
  payload                         as raw_payload
from public.user_events
where payload->>'action' in ('user_signedup', 'profile_created')
order by created_at desc
limit 200;
```

If your events nest identifiers in `traits`, swap `payload` for `traits` in the selectors.

## 2) Correlate audit events with profiles

Use the `traits->>'user_id'` (or `payload->>'user_id'`) to join audit records back to the `profiles` table. Include role lookups to validate assignment during signup.

```sql
with audit as (
  select
    id,
    created_at,
    traits->>'user_id' as user_id,
    traits->>'action'  as action,
    traits             as raw_traits
  from public.user_events
  where traits ? 'user_id'
)
select
  audit.id                    as event_id,
  audit.created_at            as event_created_at,
  audit.action,
  p.id                        as profile_id,
  p.email,
  p.phone,
  p.full_name,
  roles.role_name,
  roles.role_id
from audit
left join public.profiles p on p.id::text = audit.user_id
left join public.profile_roles pr on pr.profile_id = p.id
left join public.roles roles on roles.id = pr.role_id
order by audit.created_at desc
limit 200;
```

If roles are embedded directly on the profile record (for example, a `role` text column), replace the join with a direct column selection.

## 3) Link profile events to payment activity

Correlate profile events to payment activity using the same `user_id` reference across `public.user_events`, `public.payment_events`, and `public.profiles`.

```sql
with profile_events as (
  select
    id,
    created_at,
    payload->>'user_id'  as user_id,
    payload->>'action'   as action
  from public.user_events
  where payload->>'action' in ('user_signedup', 'profile_created')
),
payments as (
  select
    id,
    created_at,
    payload->>'user_id'  as user_id,
    payload->>'amount'   as amount,
    payload->>'currency' as currency,
    payload->>'status'   as status,
    payload              as raw_payment
  from public.payment_events
  where payload ? 'user_id'
)
select
  pe.id                   as profile_event_id,
  pe.created_at           as profile_event_created_at,
  pe.action,
  p.id                    as profile_id,
  p.email,
  pay.id                  as payment_event_id,
  pay.created_at          as payment_created_at,
  pay.amount,
  pay.currency,
  pay.status
from profile_events pe
left join public.profiles p on p.id::text = pe.user_id
left join payments pay on pay.user_id = pe.user_id
order by pay.created_at desc nulls last, pe.created_at desc
limit 200;
```

## 4) Trace a single user end-to-end

Replace `:user_id` with the identifier you need to trace. This is useful for validating a particular signup and payment sequence.

```sql
select 'user_event' as source, id, created_at, payload as data
from public.user_events
where payload->>'user_id' = :user_id

union all

select 'payment_event' as source, id, created_at, payload as data
from public.payment_events
where payload->>'user_id' = :user_id

union all

select 'profile' as source, id, updated_at as created_at, row_to_json(p.*)
from public.profiles p
where id::text = :user_id
order by created_at;
```

## Notes

- Convert identifiers to the same type when joining (e.g., casting UUIDs to text) to avoid mismatch errors.
- If you store audit context in different JSON keys, adjust the `payload`/`traits` selectors accordingly.
- Add additional filters (e.g., date ranges) to keep result sets small on production databases.


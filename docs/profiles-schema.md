# Profiles Table Reference

This document records the expected shape and access rules for `public.profiles` so we can quickly verify the REST endpoint health.

## Table definition

`public.profiles` is a regular Postgres table keyed to `auth.users(id)`.

| column | type | notes |
| --- | --- | --- |
| id | uuid | Primary key. References `auth.users(id)` with `ON DELETE CASCADE`. |
| email | text | Optional; synced from `auth.users` when absent. |
| full_name | text | Optional display name. |
| account_type | text | Must be one of `sme`, `professional`, `investor`, `donor`, or `government_institution`. |
| profile_completed | boolean | Defaults to `false`; cannot be null. |
| country | text | Optional. |
| city | text | Optional. |
| phone | text | Optional. |
| profile_photo_url | text | Optional. |
| short_bio | text | Optional summary. |
| created_at | timestamptz | Defaults to `now()`. |
| updated_at | timestamptz | Defaults to `now()`, refreshed by trigger on updates. |

## Triggers

- `sync_profile_email_trigger` (before insert/update) populates `email` from `auth.users` when missing.
- `profiles_set_updated_at` (before update) keeps `updated_at` current.

## Row-Level Security

RLS is enabled with minimal policies:

- **Users can view own profile** – `auth.uid() = id` for `SELECT`.
- **Users can update own profile** – `auth.uid() = id` for `UPDATE` (both `USING` and `WITH CHECK`).
- **Service role full access** – unrestricted access for `service_role` (all commands).

These policies are intentionally simple to avoid recursive predicates that previously caused `42P17` errors in PostgREST.

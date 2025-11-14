-- ============================================================================
-- Verify cascading foreign keys for auth.users cleanup
-- ============================================================================
-- Run this script after applying migrations to ensure user-owned data cascades
-- correctly when deleting rows from auth.users.
-- ============================================================================

with user_fk as (
  select
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    rc.update_rule,
    rc.delete_rule,
    ccu.table_schema as referenced_schema,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  join information_schema.referential_constraints rc
    on tc.constraint_name = rc.constraint_name
   and tc.table_schema = rc.constraint_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = rc.unique_constraint_name
   and ccu.constraint_schema = rc.unique_constraint_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and (
      (ccu.table_schema = 'auth' and ccu.table_name = 'users')
      or (ccu.table_schema = 'public' and ccu.table_name = 'profiles')
    )
)
select
  table_schema,
  table_name,
  column_name,
  referenced_schema,
  referenced_table,
  referenced_column,
  delete_rule,
  update_rule,
  case
    when delete_rule = 'CASCADE' then '✅'
    else '⚠️'
  end as cascade_ok
from user_fk
order by referenced_table, table_name, column_name;

-- Add msisdn column to profiles table, but only if the table exists
do $$
begin
  -- Check if the profiles table exists
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name   = 'profiles'
  ) then
    -- Check if msisdn column does not yet exist
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name   = 'profiles'
        and column_name  = 'msisdn'
    ) then
      alter table public.profiles
        add column msisdn text;
    end if;
  end if;
end $$;


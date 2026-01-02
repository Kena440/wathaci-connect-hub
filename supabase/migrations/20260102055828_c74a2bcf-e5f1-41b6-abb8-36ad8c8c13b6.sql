-- Fix the get_grace_period_end function to include search_path
CREATE OR REPLACE FUNCTION public.get_grace_period_end()
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public
AS $function$
  SELECT '2026-01-20 00:00:00+02'::timestamptz; -- Africa/Lusaka is UTC+2
$function$;
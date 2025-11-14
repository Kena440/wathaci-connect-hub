-- Ensure donations.donor_user_id cascades with user/profile deletions
alter table public.donations
  drop constraint if exists donations_donor_user_id_fkey;

alter table public.donations
  add constraint donations_donor_user_id_fkey
    foreign key (donor_user_id)
    references public.profiles (id)
    on delete cascade;

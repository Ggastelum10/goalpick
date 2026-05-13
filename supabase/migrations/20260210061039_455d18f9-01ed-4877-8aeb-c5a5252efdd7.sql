-- 1) Create test_matches table mirroring matches structure
create table if not exists public.test_matches (
  id uuid not null default gen_random_uuid() primary key,
  external_id text,
  home_team text not null,
  away_team text not null,
  home_team_flag text,
  away_team_flag text,
  match_date timestamp with time zone not null,
  venue text,
  city text,
  stage tournament_stage not null default 'group'::tournament_stage,
  group_name text,
  home_score integer,
  away_score integer,
  status match_status default 'scheduled'::match_status,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  source_match_id uuid references public.matches(id)
);

-- 2) Add indexes for efficient querying
create index if not exists idx_test_matches_status on public.test_matches(status);
create index if not exists idx_test_matches_source_match_id on public.test_matches(source_match_id);
create index if not exists idx_test_matches_stage on public.test_matches(stage);

-- 3) Enable RLS with admin-only policy
alter table public.test_matches enable row level security;

drop policy if exists "Admins can manage test matches" on public.test_matches;

create policy "Admins can manage test matches"
  on public.test_matches
  for all
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Create isolated scoring function for test matches
create or replace function public.calculate_test_prediction_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pred record;
  exact_pts integer;
  outcome_pts integer;
  stage_mult numeric;
  total_pts integer;
  is_exact boolean;
  is_outcome boolean;
begin
  -- If this test match isn't mapped to a real match, nothing to score
  if new.source_match_id is null then
    return new;
  end if;

  -- Handle reset: finished -> not finished
  if old.status = 'finished' and (new.status is null or new.status <> 'finished') then
    update public.predictions p
    set points_earned = 0
    from public.leagues l
    where p.league_id = l.id
      and l.is_test = true
      and p.match_id = new.source_match_id;

    return new;
  end if;

  -- Handle completion: not finished -> finished
  if new.status = 'finished' and (old.status is null or old.status <> 'finished') then
    if new.home_score is null or new.away_score is null then
      return new;
    end if;

    for pred in
      select
        p.id as prediction_id,
        p.predicted_home_score,
        p.predicted_away_score,
        l.exact_score_points,
        l.outcome_points,
        l.stage_multipliers
      from public.predictions p
      join public.leagues l on l.id = p.league_id
      where l.is_test = true
        and p.match_id = new.source_match_id
    loop
      exact_pts := coalesce(pred.exact_score_points, 5);
      outcome_pts := coalesce(pred.outcome_points, 2);

      if pred.stage_multipliers is not null then
        stage_mult := coalesce((pred.stage_multipliers->>new.stage::text)::numeric, 1);
      else
        stage_mult := 1;
      end if;

      is_exact := (pred.predicted_home_score = new.home_score and pred.predicted_away_score = new.away_score);
      is_outcome := (sign(pred.predicted_home_score - pred.predicted_away_score) = sign(new.home_score - new.away_score));

      if is_exact then
        total_pts := round(exact_pts * stage_mult);
      elsif is_outcome then
        total_pts := round(outcome_pts * stage_mult);
      else
        total_pts := 0;
      end if;

      update public.predictions
      set points_earned = total_pts
      where id = pred.prediction_id;
    end loop;
  end if;

  return new;
end;
$$;

-- 5) Create trigger on test_matches
drop trigger if exists test_match_scoring_trigger on public.test_matches;

create trigger test_match_scoring_trigger
after update on public.test_matches
for each row
execute function public.calculate_test_prediction_points();

-- 6) Refresh PostgREST schema cache
notify pgrst, 'reload schema';
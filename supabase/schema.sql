/*
  화성 교통일지 Supabase 초기 스키마 최종본
  --------------------------------------------------
  사용 방법:
  1. 새 Supabase 프로젝트의 SQL Editor를 엽니다.
  2. 이 SQL 전체를 붙여넣습니다.
  3. Run을 누릅니다.
  4. 실행 후 Table Editor에서 테이블을 확인합니다.

  주의:
  - 새 Supabase 프로젝트에서 최초 1회 실행하는 초기 스키마입니다.
  - GPS 좌표는 50m 검증에만 사용하고 anonymous_reports에는 저장하지 않습니다.
  - 실제 똑버스 호출·시청 공문 발송은 DB 상태만 기록하며 자동 발송하지 않습니다.
*/

begin;

-- =========================================================
-- 1. 확장 기능
-- =========================================================

create extension if not exists pgcrypto;
create extension if not exists postgis with schema extensions;

-- =========================================================
-- 2. ENUM 타입
-- =========================================================

create type public.app_role as enum (
  'citizen',
  'admin'
);

create type public.report_kind as enum (
  'full_pass',
  'dispatch_delay',
  'transfer_failure'
);

create type public.incident_status as enum (
  'detected',
  'reviewing',
  'notified',
  'resolved'
);

create type public.travel_mode as enum (
  'walk',
  'bus',
  'subway',
  'taxi',
  'drt',
  'other'
);

create type public.sentiment_kind as enum (
  'satisfied',
  'dissatisfied'
);

create type public.route_request_status as enum (
  'draft',
  'open',
  'reviewing',
  'adopted',
  'rejected',
  'closed'
);

create type public.post_category as enum (
  'route_request',
  'route_suggestion',
  'information',
  'question'
);

create type public.inquiry_status as enum (
  'waiting',
  'in_progress',
  'completed'
);

create type public.action_status as enum (
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'simulated',
  'completed',
  'failed'
);

-- =========================================================
-- 3. 공통 updated_at 함수
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 4. 회원 프로필
-- 비밀번호는 직접 저장하지 않고 Supabase Auth가 관리합니다.
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  nickname text not null
    check (char_length(nickname) between 2 and 30),

  role public.app_role not null default 'citizen',

  birth_date date,
  gender text check (
    gender is null or
    gender in ('male', 'female', 'other', 'private')
  ),

  home_district text,
  preferred_language text not null default 'ko',

  referral_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),

  referred_by uuid references public.profiles(id) on delete set null,

  points integer not null default 0
    check (points >= 0),

  attendance_streak integer not null default 0
    check (attendance_streak >= 0),

  last_attendance_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_nickname_unique_idx
on public.profiles (lower(nickname));

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Supabase Auth 회원 생성 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    nickname,
    birth_date,
    gender,
    home_district,
    preferred_language
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nickname', ''),
      '화성시민-' || substr(new.id::text, 1, 6)
    ),
    case
      when nullif(new.raw_user_meta_data ->> 'birth_date', '') is not null
      then (new.raw_user_meta_data ->> 'birth_date')::date
      else null
    end,
    nullif(new.raw_user_meta_data ->> 'gender', ''),
    nullif(new.raw_user_meta_data ->> 'home_district', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'preferred_language', ''),
      'ko'
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- 5. 관리자 판별 함수
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- =========================================================
-- 6. 정류장 및 노선
-- TAGO 공공데이터를 저장하는 테이블
-- =========================================================

create table public.transit_stops (
  id bigint generated always as identity primary key,

  external_id text not null unique,
  city_code text,
  name text not null,
  stop_number text,
  district_name text,

  location extensions.geography(point, 4326) not null,

  source text not null default 'TAGO',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transit_stops_location_gix
on public.transit_stops using gist (location);

create index transit_stops_name_idx
on public.transit_stops using gin (
  to_tsvector('simple', name)
);

create trigger transit_stops_set_updated_at
before update on public.transit_stops
for each row execute function public.set_updated_at();

create table public.bus_routes (
  id bigint generated always as identity primary key,

  external_id text not null unique,
  city_code text,
  route_number text not null,
  route_type text,
  start_stop_name text,
  end_stop_name text,
  source text not null default 'TAGO',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bus_routes_number_idx
on public.bus_routes (route_number);

create trigger bus_routes_set_updated_at
before update on public.bus_routes
for each row execute function public.set_updated_at();

create table public.bus_route_stops (
  route_id bigint not null
    references public.bus_routes(id) on delete cascade,

  stop_id bigint not null
    references public.transit_stops(id) on delete restrict,

  stop_order integer not null
    check (stop_order > 0),

  primary key (route_id, stop_order),
  unique (route_id, stop_id)
);

-- TAGO 버스 도착정보 캐시
create table public.bus_arrival_cache (
  id bigint generated always as identity primary key,

  stop_id bigint not null
    references public.transit_stops(id) on delete cascade,

  route_number text not null,
  remaining_stops integer,
  arrival_seconds integer,
  vehicle_number text,

  raw_payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),

  unique (stop_id, route_number)
);

create index bus_arrival_cache_stop_idx
on public.bus_arrival_cache (stop_id, fetched_at desc);

-- =========================================================
-- 7. 익명 원터치 신고
-- 사용자 ID, 단말 ID, GPS 좌표를 저장하지 않습니다.
-- =========================================================

create table public.anonymous_reports (
  id bigint generated always as identity primary key,

  stop_id bigint not null
    references public.transit_stops(id) on delete restrict,

  kind public.report_kind not null,

  route_number text,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index anonymous_reports_window_idx
on public.anonymous_reports (
  stop_id,
  kind,
  occurred_at desc
);

create index anonymous_reports_route_idx
on public.anonymous_reports (
  route_number,
  occurred_at desc
);

-- 현재 GPS를 저장하지 않고 정류장과 거리만 검증하는 함수
create or replace function public.submit_anonymous_report(
  p_stop_id bigint,
  p_kind public.report_kind,
  p_lat double precision,
  p_lng double precision,
  p_route_number text default null
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_report_id bigint;
  v_is_near boolean;
begin
  if p_lat is null
     or p_lng is null
     or p_lat < -90
     or p_lat > 90
     or p_lng < -180
     or p_lng > 180 then
    raise exception '올바른 현재 위치가 필요합니다.';
  end if;

  select st_dwithin(
    s.location,
    st_setsrid(
      st_makepoint(p_lng, p_lat),
      4326
    )::geography,
    500
  )
  into v_is_near
  from public.transit_stops s
  where s.id = p_stop_id;

  if v_is_near is null then
    raise exception '존재하지 않는 정류장입니다.';
  end if;

  if v_is_near is not true then
    raise exception '정류장 반경 500m 안에서만 신고할 수 있습니다.';
  end if;

  insert into public.anonymous_reports (
    stop_id,
    kind,
    route_number
  )
  values (
    p_stop_id,
    p_kind,
    nullif(trim(p_route_number), '')
  )
  returning id into v_report_id;

  return v_report_id;
end;
$$;

grant execute on function public.submit_anonymous_report(
  bigint,
  public.report_kind,
  double precision,
  double precision,
  text
) to anon, authenticated;

-- 최근 10분 신고 집계
create or replace view public.stop_report_10m
with (security_invoker = true)
as
select
  r.stop_id,
  s.external_id,
  s.name as stop_name,
  s.stop_number,
  s.district_name,
  r.kind,
  r.route_number,
  count(*)::integer as report_count,
  min(r.occurred_at) as first_report_at,
  max(r.occurred_at) as latest_report_at
from public.anonymous_reports r
join public.transit_stops s
  on s.id = r.stop_id
where r.occurred_at >= now() - interval '10 minutes'
group by
  r.stop_id,
  s.external_id,
  s.name,
  s.stop_number,
  s.district_name,
  r.kind,
  r.route_number;

-- =========================================================
-- 8. AI 사건 감지 및 안내
-- =========================================================

create table public.incidents (
  id bigint generated always as identity primary key,

  stop_id bigint not null
    references public.transit_stops(id) on delete restrict,

  kind public.report_kind not null,
  route_number text,

  window_started_at timestamptz not null,
  window_ended_at timestamptz not null,

  report_count integer not null
    check (report_count > 0),

  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high')),

  status public.incident_status not null default 'detected',

  ai_summary text,
  citizen_guidance text,
  admin_recommendation text,

  evidence jsonb not null default '{}'::jsonb,

  model_name text,
  requires_review boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index incidents_status_created_idx
on public.incidents (
  status,
  created_at desc
);

create index incidents_stop_created_idx
on public.incidents (
  stop_id,
  created_at desc
);

create trigger incidents_set_updated_at
before update on public.incidents
for each row execute function public.set_updated_at();

create table public.alerts (
  id bigint generated always as identity primary key,

  incident_id bigint not null
    references public.incidents(id) on delete cascade,

  audience public.app_role not null,

  title text not null,
  body text not null,

  action_url text,

  is_simulated boolean not null default true,
  sent_at timestamptz,

  created_at timestamptz not null default now()
);

create table public.ai_actions (
  id bigint generated always as identity primary key,

  incident_id bigint
    references public.incidents(id) on delete set null,

  action_type text not null
    check (
      action_type in (
        'citizen_alert',
        'drt_recommendation',
        'official_document',
        'route_recommendation',
        'report_generation'
      )
    ),

  status public.action_status not null default 'draft',

  title text not null,
  content text not null,

  payload jsonb not null default '{}'::jsonb,

  reviewed_by uuid
    references auth.users(id) on delete set null,

  reviewed_at timestamptz,
  executed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_actions_set_updated_at
before update on public.ai_actions
for each row execute function public.set_updated_at();

-- =========================================================
-- 9. 교통일지
-- =========================================================

create table public.trip_journals (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id) on delete cascade,

  category text not null
    check (
      category in (
        'commute',
        'return',
        'school',
        'other'
      )
    ),

  started_at timestamptz not null default now(),
  ended_at timestamptz,

  origin_label text,
  destination_label text,

  total_minutes integer
    check (total_minutes is null or total_minutes >= 0),

  route_provider text default 'kakao',

  route_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trip_journals_user_date_idx
on public.trip_journals (
  user_id,
  started_at desc
);

create trigger trip_journals_set_updated_at
before update on public.trip_journals
for each row execute function public.set_updated_at();

create table public.trip_segments (
  id bigint generated always as identity primary key,

  journal_id uuid not null
    references public.trip_journals(id) on delete cascade,

  segment_order smallint not null
    check (segment_order > 0),

  mode public.travel_mode not null,

  route_number text,

  duration_minutes integer
    check (
      duration_minutes is null
      or duration_minutes >= 0
    ),

  origin_label text,
  destination_label text,

  sentiment public.sentiment_kind,

  reason_codes text[] not null default '{}',
  memo text,

  created_at timestamptz not null default now(),

  unique (journal_id, segment_order)
);

-- =========================================================
-- 10. 희망 노선
-- 정류장 최소 5개는 RPC 함수에서 검증합니다.
-- =========================================================

create table public.route_requests (
  id uuid primary key default gen_random_uuid(),

  author_id uuid not null
    references auth.users(id) on delete cascade,

  title text not null
    check (char_length(title) between 2 and 100),

  description text not null
    check (char_length(description) between 5 and 3000),

  status public.route_request_status not null default 'open',

  ai_suggestion jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index route_requests_status_created_idx
on public.route_requests (
  status,
  created_at desc
);

create trigger route_requests_set_updated_at
before update on public.route_requests
for each row execute function public.set_updated_at();

create table public.route_request_stops (
  route_request_id uuid not null
    references public.route_requests(id) on delete cascade,

  stop_id bigint not null
    references public.transit_stops(id) on delete restrict,

  stop_order smallint not null
    check (stop_order > 0),

  primary key (route_request_id, stop_order),
  unique (route_request_id, stop_id)
);

create table public.route_request_votes (
  route_request_id uuid not null
    references public.route_requests(id) on delete cascade,

  user_id uuid not null
    references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),

  primary key (route_request_id, user_id)
);

-- 희망 노선과 정류장을 한 번에 생성
create or replace function public.create_route_request(
  p_title text,
  p_description text,
  p_stop_ids bigint[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_request_id uuid;
  v_stop_id bigint;
  v_order integer := 0;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if char_length(trim(p_title)) < 2 then
    raise exception '제목을 2자 이상 입력해 주세요.';
  end if;

  if char_length(trim(p_description)) < 5 then
    raise exception '내용을 5자 이상 입력해 주세요.';
  end if;

  if coalesce(array_length(p_stop_ids, 1), 0) < 5 then
    raise exception '희망 노선에는 정류장이 최소 5개 필요합니다.';
  end if;

  if (
    select count(distinct value)
    from unnest(p_stop_ids) as value
  ) <> array_length(p_stop_ids, 1) then
    raise exception '같은 정류장을 중복해서 등록할 수 없습니다.';
  end if;

  if (
    select count(*)
    from public.transit_stops
    where id = any(p_stop_ids)
  ) <> array_length(p_stop_ids, 1) then
    raise exception '존재하지 않는 정류장이 포함되어 있습니다.';
  end if;

  insert into public.route_requests (
    author_id,
    title,
    description,
    status
  )
  values (
    auth.uid(),
    trim(p_title),
    trim(p_description),
    'open'
  )
  returning id into v_request_id;

  foreach v_stop_id in array p_stop_ids loop
    v_order := v_order + 1;

    insert into public.route_request_stops (
      route_request_id,
      stop_id,
      stop_order
    )
    values (
      v_request_id,
      v_stop_id,
      v_order
    );
  end loop;

  return v_request_id;
end;
$$;

grant execute on function public.create_route_request(
  text,
  text,
  bigint[]
) to authenticated;

-- 희망 노선별 투표 수
create or replace view public.route_request_summary
with (security_invoker = true)
as
select
  r.id,
  r.author_id,
  r.title,
  r.description,
  r.status,
  r.ai_suggestion,
  r.created_at,
  count(distinct v.user_id)::integer as vote_count,
  count(distinct s.stop_id)::integer as stop_count
from public.route_requests r
left join public.route_request_votes v
  on v.route_request_id = r.id
left join public.route_request_stops s
  on s.route_request_id = r.id
group by r.id;

-- =========================================================
-- 11. 커뮤니티 게시판 및 비밀댓글
-- =========================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),

  author_id uuid not null
    references auth.users(id) on delete cascade,

  category public.post_category not null,

  bus_type text
    check (
      bus_type is null
      or bus_type in ('city', 'village', 'other')
    ),

  title text not null
    check (char_length(title) between 2 and 100),

  content text not null
    check (char_length(content) between 5 and 5000),

  view_count integer not null default 0
    check (view_count >= 0),

  is_hidden boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_category_created_idx
on public.posts (
  category,
  created_at desc
);

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),

  post_id uuid not null
    references public.posts(id) on delete cascade,

  author_id uuid not null
    references auth.users(id) on delete cascade,

  content text not null
    check (char_length(content) between 1 and 1000),

  is_secret boolean not null default true,
  is_hidden boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index post_comments_post_idx
on public.post_comments (
  post_id,
  created_at
);

create trigger post_comments_set_updated_at
before update on public.post_comments
for each row execute function public.set_updated_at();

-- =========================================================
-- 12. 출석 및 포인트
-- =========================================================

create table public.attendance_logs (
  id bigint generated always as identity primary key,

  user_id uuid not null
    references auth.users(id) on delete cascade,

  attendance_date date not null default current_date,

  base_points integer not null default 5,
  streak_bonus integer not null default 0,

  created_at timestamptz not null default now(),

  unique (user_id, attendance_date)
);

create table public.point_ledger (
  id bigint generated always as identity primary key,

  user_id uuid not null
    references auth.users(id) on delete cascade,

  amount integer not null
    check (amount <> 0),

  reason text not null,
  reference_key text,

  created_at timestamptz not null default now(),

  unique (user_id, reason, reference_key)
);

create index point_ledger_user_date_idx
on public.point_ledger (
  user_id,
  created_at desc
);

-- 포인트 원장 입력 시 프로필 잔액 반영
create or replace function public.apply_point_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_points integer;
begin
  select points
  into v_current_points
  from public.profiles
  where id = new.user_id
  for update;

  if v_current_points is null then
    raise exception '회원 프로필을 찾을 수 없습니다.';
  end if;

  if v_current_points + new.amount < 0 then
    raise exception '포인트가 부족합니다.';
  end if;

  update public.profiles
  set points = points + new.amount
  where id = new.user_id;

  return new;
end;
$$;

create trigger point_ledger_apply
before insert on public.point_ledger
for each row execute function public.apply_point_ledger();

-- 출석 처리 함수
create or replace function public.check_attendance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_new_streak integer;
  v_bonus integer := 0;
  v_total integer;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if exists (
    select 1
    from public.attendance_logs
    where user_id = auth.uid()
      and attendance_date = current_date
  ) then
    raise exception '오늘은 이미 출석했습니다.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if v_profile.last_attendance_date = current_date - 1 then
    v_new_streak := v_profile.attendance_streak + 1;
  else
    v_new_streak := 1;
  end if;

  if v_new_streak % 7 = 0 then
    v_bonus := 10;
  end if;

  v_total := 5 + v_bonus;

  insert into public.attendance_logs (
    user_id,
    attendance_date,
    base_points,
    streak_bonus
  )
  values (
    auth.uid(),
    current_date,
    5,
    v_bonus
  );

  update public.profiles
  set
    attendance_streak = v_new_streak,
    last_attendance_date = current_date
  where id = auth.uid();

  insert into public.point_ledger (
    user_id,
    amount,
    reason,
    reference_key
  )
  values (
    auth.uid(),
    v_total,
    'attendance',
    current_date::text
  );

  return jsonb_build_object(
    'attendanceDate', current_date,
    'streak', v_new_streak,
    'basePoints', 5,
    'bonusPoints', v_bonus,
    'totalPoints', v_total
  );
end;
$$;

grant execute on function public.check_attendance()
to authenticated;

-- =========================================================
-- 13. 룰렛 및 보상
-- 실제 쿠폰 발급은 별도 외부 시스템이 필요합니다.
-- =========================================================

create table public.reward_catalog (
  id bigint generated always as identity primary key,

  name text not null,
  description text,

  reward_type text not null
    check (
      reward_type in (
        'points',
        'coupon',
        'ticket'
      )
    ),

  reward_value integer not null
    check (reward_value > 0),

  probability numeric(6,5) not null
    check (probability > 0 and probability <= 1),

  stock integer
    check (stock is null or stock >= 0),

  is_active boolean not null default true,

  created_at timestamptz not null default now()
);

create table public.reward_draws (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id) on delete cascade,

  reward_id bigint not null
    references public.reward_catalog(id) on delete restrict,

  ticket_cost integer not null default 300
    check (ticket_cost > 0),

  reward_points integer not null default 0
    check (reward_points >= 0),

  created_at timestamptz not null default now()
);

-- =========================================================
-- 14. 즐겨찾기 및 문의
-- 즐겨찾기 좌표는 사용자가 명시적으로 저장한 장소만 보관합니다.
-- =========================================================

create table public.favorites (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id) on delete cascade,

  favorite_type text not null
    check (
      favorite_type in (
        'place',
        'stop',
        'route'
      )
    ),

  label text not null,

  stop_id bigint
    references public.transit_stops(id) on delete cascade,

  route_id bigint
    references public.bus_routes(id) on delete cascade,

  place_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index favorites_user_idx
on public.favorites (user_id, created_at desc);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id) on delete cascade,

  title text not null
    check (char_length(title) between 2 and 100),

  content text not null
    check (char_length(content) between 5 and 3000),

  status public.inquiry_status not null default 'waiting',

  admin_response text,
  responded_by uuid
    references auth.users(id) on delete set null,

  responded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger inquiries_set_updated_at
before update on public.inquiries
for each row execute function public.set_updated_at();

-- =========================================================
-- 15. 지역 참여율 집계
-- =========================================================

create or replace view public.district_participation_7d
with (security_invoker = true)
as
select
  coalesce(s.district_name, '미분류') as district_name,
  count(*)::integer as report_count,
  count(distinct r.stop_id)::integer as active_stop_count,
  max(r.occurred_at) as latest_report_at
from public.anonymous_reports r
join public.transit_stops s
  on s.id = r.stop_id
where r.occurred_at >= now() - interval '7 days'
group by coalesce(s.district_name, '미분류');

-- =========================================================
-- 16. RLS 활성화
-- =========================================================

alter table public.profiles enable row level security;
alter table public.transit_stops enable row level security;
alter table public.bus_routes enable row level security;
alter table public.bus_route_stops enable row level security;
alter table public.bus_arrival_cache enable row level security;
alter table public.anonymous_reports enable row level security;
alter table public.incidents enable row level security;
alter table public.alerts enable row level security;
alter table public.ai_actions enable row level security;
alter table public.trip_journals enable row level security;
alter table public.trip_segments enable row level security;
alter table public.route_requests enable row level security;
alter table public.route_request_stops enable row level security;
alter table public.route_request_votes enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.point_ledger enable row level security;
alter table public.reward_catalog enable row level security;
alter table public.reward_draws enable row level security;
alter table public.favorites enable row level security;
alter table public.inquiries enable row level security;

-- =========================================================
-- 17. RLS 정책: 프로필
-- =========================================================

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
)
with check (
  id = auth.uid()
  or public.is_admin()
);

-- =========================================================
-- 18. RLS 정책: 공공 교통 데이터
-- =========================================================

create policy "stops_public_read"
on public.transit_stops
for select
to anon, authenticated
using (true);

create policy "stops_admin_manage"
on public.transit_stops
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "routes_public_read"
on public.bus_routes
for select
to anon, authenticated
using (true);

create policy "routes_admin_manage"
on public.bus_routes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "route_stops_public_read"
on public.bus_route_stops
for select
to anon, authenticated
using (true);

create policy "route_stops_admin_manage"
on public.bus_route_stops
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "arrival_cache_public_read"
on public.bus_arrival_cache
for select
to anon, authenticated
using (true);

create policy "arrival_cache_admin_manage"
on public.bus_arrival_cache
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =========================================================
-- 19. RLS 정책: 익명 신고와 사건
-- 신고 행에는 개인정보가 없으므로 집계를 위해 읽기 허용
-- 직접 INSERT는 금지하며 RPC로만 신고
-- =========================================================

create policy "anonymous_reports_public_read"
on public.anonymous_reports
for select
to anon, authenticated
using (true);

create policy "anonymous_reports_admin_delete"
on public.anonymous_reports
for delete
to authenticated
using (public.is_admin());

create policy "incidents_public_read"
on public.incidents
for select
to anon, authenticated
using (true);

create policy "incidents_admin_manage"
on public.incidents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "alerts_public_read"
on public.alerts
for select
to anon, authenticated
using (true);

create policy "alerts_admin_manage"
on public.alerts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "ai_actions_admin_only"
on public.ai_actions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =========================================================
-- 20. RLS 정책: 교통일지
-- =========================================================

create policy "journals_own_or_admin"
on public.trip_journals
for all
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "segments_through_own_journal"
on public.trip_segments
for all
to authenticated
using (
  exists (
    select 1
    from public.trip_journals j
    where j.id = journal_id
      and (
        j.user_id = auth.uid()
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.trip_journals j
    where j.id = journal_id
      and (
        j.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

-- =========================================================
-- 21. RLS 정책: 희망 노선과 투표
-- =========================================================

create policy "route_requests_public_read"
on public.route_requests
for select
to anon, authenticated
using (
  status <> 'draft'
  or author_id = auth.uid()
  or public.is_admin()
);

create policy "route_requests_author_update"
on public.route_requests
for update
to authenticated
using (
  author_id = auth.uid()
  or public.is_admin()
)
with check (
  author_id = auth.uid()
  or public.is_admin()
);

create policy "route_requests_author_delete"
on public.route_requests
for delete
to authenticated
using (
  author_id = auth.uid()
  or public.is_admin()
);

create policy "route_request_stops_public_read"
on public.route_request_stops
for select
to anon, authenticated
using (true);

create policy "route_request_stops_author_manage"
on public.route_request_stops
for all
to authenticated
using (
  exists (
    select 1
    from public.route_requests r
    where r.id = route_request_id
      and (
        r.author_id = auth.uid()
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.route_requests r
    where r.id = route_request_id
      and (
        r.author_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy "votes_public_read"
on public.route_request_votes
for select
to anon, authenticated
using (true);

create policy "votes_insert_own"
on public.route_request_votes
for insert
to authenticated
with check (
  user_id = auth.uid()
);

create policy "votes_delete_own"
on public.route_request_votes
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

-- =========================================================
-- 22. RLS 정책: 게시판과 비밀댓글
-- =========================================================

create policy "posts_public_read"
on public.posts
for select
to anon, authenticated
using (
  is_hidden = false
  or author_id = auth.uid()
  or public.is_admin()
);

create policy "posts_insert_own"
on public.posts
for insert
to authenticated
with check (
  author_id = auth.uid()
);

create policy "posts_update_own"
on public.posts
for update
to authenticated
using (
  author_id = auth.uid()
  or public.is_admin()
)
with check (
  author_id = auth.uid()
  or public.is_admin()
);

create policy "posts_delete_own"
on public.posts
for delete
to authenticated
using (
  author_id = auth.uid()
  or public.is_admin()
);

-- 일반 댓글은 로그인 사용자가 조회 가능
-- 비밀댓글은 작성자, 게시글 작성자, 관리자만 조회 가능
create policy "comments_read_with_secret_rule"
on public.post_comments
for select
to authenticated
using (
  is_hidden = false
  and (
    is_secret = false
    or author_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.posts p
      where p.id = post_id
        and p.author_id = auth.uid()
    )
  )
);

create policy "comments_insert_own"
on public.post_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
);

create policy "comments_update_own"
on public.post_comments
for update
to authenticated
using (
  author_id = auth.uid()
  or public.is_admin()
)
with check (
  author_id = auth.uid()
  or public.is_admin()
);

create policy "comments_delete_own"
on public.post_comments
for delete
to authenticated
using (
  author_id = auth.uid()
  or public.is_admin()
);

-- =========================================================
-- 23. RLS 정책: 출석, 포인트, 보상
-- =========================================================

create policy "attendance_own_read"
on public.attendance_logs
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "point_ledger_own_read"
on public.point_ledger
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "point_ledger_admin_manage"
on public.point_ledger
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "reward_catalog_public_read"
on public.reward_catalog
for select
to authenticated
using (is_active = true or public.is_admin());

create policy "reward_catalog_admin_manage"
on public.reward_catalog
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "reward_draws_own_read"
on public.reward_draws
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

-- =========================================================
-- 24. RLS 정책: 즐겨찾기와 문의
-- =========================================================

create policy "favorites_own"
on public.favorites
for all
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "inquiries_own_or_admin"
on public.inquiries
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "inquiries_insert_own"
on public.inquiries
for insert
to authenticated
with check (
  user_id = auth.uid()
);

create policy "inquiries_update_admin"
on public.inquiries
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- =========================================================
-- 25. View 권한
-- =========================================================

grant select on public.stop_report_10m
to anon, authenticated;

grant select on public.district_participation_7d
to anon, authenticated;

grant select on public.route_request_summary
to anon, authenticated;

-- =========================================================
-- 26. Realtime 등록
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'anonymous_reports'
  ) then
    alter publication supabase_realtime
    add table public.anonymous_reports;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'incidents'
  ) then
    alter publication supabase_realtime
    add table public.incidents;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'alerts'
  ) then
    alter publication supabase_realtime
    add table public.alerts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'route_request_votes'
  ) then
    alter publication supabase_realtime
    add table public.route_request_votes;
  end if;
end;
$$;

-- =========================================================
-- 27. 데모 정류장
-- 좌표는 프로토타입용 예시이므로 TAGO 데이터 연결 후 교체합니다.
-- =========================================================

insert into public.transit_stops (
  external_id,
  city_code,
  name,
  stop_number,
  district_name,
  location,
  source
)
values
(
  'DEMO-08-142',
  '31240',
  '병점역 후문',
  '08-142',
  '병점1동',
  st_setsrid(
    st_makepoint(127.0346, 37.2074),
    4326
  )::geography,
  'demo'
),
(
  'DEMO-01-092',
  '31240',
  '동탄역 4번출구',
  '01-092',
  '동탄6동',
  st_setsrid(
    st_makepoint(127.0958, 37.1997),
    4326
  )::geography,
  'demo'
),
(
  'DEMO-08-057',
  '31240',
  '진안동 행정복지센터',
  '08-057',
  '진안동',
  st_setsrid(
    st_makepoint(127.0404, 37.2138),
    4326
  )::geography,
  'demo'
)
on conflict (external_id) do nothing;

-- 기본 보상 데이터
insert into public.reward_catalog (
  name,
  description,
  reward_type,
  reward_value,
  probability,
  stock,
  is_active
)
values
(
  '50 포인트',
  '꽝 없는 룰렛 기본 보상',
  'points',
  50,
  0.70,
  null,
  true
),
(
  '100 포인트',
  '룰렛 포인트 보상',
  'points',
  100,
  0.20,
  null,
  true
),
(
  '300 포인트',
  '룰렛 특별 보상',
  'points',
  300,
  0.09,
  null,
  true
),
(
  '커피 쿠폰',
  '프로토타입용 경품 예시',
  'coupon',
  1,
  0.01,
  10,
  true
);

commit;

/*
  실행 후 관리자 지정 방법
  --------------------------------------------------
  1. Supabase Authentication에서 회원가입을 먼저 합니다.
  2. Table Editor → profiles에서 해당 회원의 role을
     citizen에서 admin으로 변경합니다.

  또는 SQL Editor에서 아래 문장을 별도로 실행합니다.

  update public.profiles
  set role = 'admin'
  where id = '관리자로 지정할 auth user UUID';


  익명 신고 호출 예시
  --------------------------------------------------

  const { data, error } = await supabase.rpc(
    'submit_anonymous_report',
    {
      p_stop_id: 1,
      p_kind: 'full_pass',
      p_lat: 현재위도,
      p_lng: 현재경도,
      p_route_number: '56'
    }
  );


  희망 노선 생성 예시
  --------------------------------------------------

  const { data, error } = await supabase.rpc(
    'create_route_request',
    {
      p_title: '병점-동탄 출근 급행 노선',
      p_description: '출근 시간대 이동 노선을 요청합니다.',
      p_stop_ids: [1, 2, 3, 4, 5]
    }
  );


  출석 처리 예시
  --------------------------------------------------

  const { data, error } = await supabase.rpc(
    'check_attendance'
  );


  중요:
  --------------------------------------------------
  - 이 SQL은 새 Supabase 프로젝트에 최초 1회 실행합니다.
  - 오류가 발생하면 여러 번 다시 실행하지 말고
    Supabase가 표시한 전체 오류 메시지를 그대로 확인해야 합니다.
  - 실제 공공데이터 API 키와 AI API 키는 DB가 아니라
    Vercel 서버 환경변수에 저장해야 합니다.
  - service_role 키는 절대로 브라우저 코드에 넣지 않습니다.
*/

-- 지도에서 정류장 위치를 표시하기 위한 위도·경도 조회 View

create or replace view public.transit_stop_map
with (security_invoker = true)
as
select
  id,
  external_id,
  name,
  stop_number,
  district_name,
  extensions.st_y(
    location::extensions.geometry
  ) as latitude,
  extensions.st_x(
    location::extensions.geometry
  ) as longitude
from public.transit_stops;

-- 비로그인 사용자와 로그인 사용자에게 정류장 조회 허용

grant select
on public.transit_stop_map
to anon, authenticated;

-- View 생성 결과 확인

select *
from public.transit_stop_map
order by id;

-- 최근 10분 신고가 임계치를 넘은 정류장을 사건으로 생성하는 함수

create or replace function public.detect_report_incidents(
  p_threshold integer default 5,
  p_window_minutes integer default 10
)
returns table (
  created_incident_id bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 비정상적인 임계치 입력 방지
  if p_threshold < 1 then
    raise exception '신고 임계치는 1 이상이어야 합니다.';
  end if;

  if p_window_minutes < 1 then
    raise exception '집계 시간은 1분 이상이어야 합니다.';
  end if;

  -- 관리자 또는 서버 service_role만 실행 가능
  if auth.role() <> 'service_role'
     and not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  return query

  with report_groups as (
    select
      reports.stop_id,
      reports.kind,
      reports.route_number,
      count(*)::integer as report_count,
      min(reports.occurred_at) as first_report_at,
      max(reports.occurred_at) as latest_report_at

    from public.anonymous_reports as reports

    where reports.occurred_at >=
      now() - make_interval(
        mins => p_window_minutes
      )

    group by
      reports.stop_id,
      reports.kind,
      reports.route_number

    having count(*) >= p_threshold
  ),

  inserted_incidents as (
    insert into public.incidents (
      stop_id,
      kind,
      route_number,
      window_started_at,
      window_ended_at,
      report_count,
      severity,
      status,
      ai_summary,
      citizen_guidance,
      admin_recommendation,
      evidence,
      model_name,
      requires_review
    )

    select
      report_groups.stop_id,
      report_groups.kind,
      report_groups.route_number,
      report_groups.first_report_at,
      report_groups.latest_report_at,
      report_groups.report_count,

      case
        when report_groups.report_count
          >= p_threshold * 3
          then 'high'

        when report_groups.report_count
          >= p_threshold * 2
          then 'medium'

        else 'low'
      end,

      'detected',

      case report_groups.kind
        when 'full_pass'
          then format(
            '최근 %s분간 만차 통과 신고 %s건이 감지되었습니다.',
            p_window_minutes,
            report_groups.report_count
          )

        when 'dispatch_delay'
          then format(
            '최근 %s분간 배차 지연 신고 %s건이 감지되었습니다.',
            p_window_minutes,
            report_groups.report_count
          )

        when 'transfer_failure'
          then format(
            '최근 %s분간 환승 실패 신고 %s건이 감지되었습니다.',
            p_window_minutes,
            report_groups.report_count
          )
      end,

      case report_groups.kind
        when 'full_pass'
          then '인근 정류장과 대체 노선을 확인해 주세요.'

        when 'dispatch_delay'
          then '실시간 도착정보와 다른 노선을 확인해 주세요.'

        when 'transfer_failure'
          then '대체 환승 정류장과 다음 연결편을 확인해 주세요.'
      end,

      case report_groups.kind
        when 'full_pass'
          then '현장 혼잡도 확인 후 예비 차량 또는 대체 수송 투입을 검토해 주세요.'

        when 'dispatch_delay'
          then '해당 노선 운행 상태와 배차 간격을 확인해 주세요.'

        when 'transfer_failure'
          then '노선 간 환승 시간과 배차 연계 개선을 검토해 주세요.'
      end,

      jsonb_build_object(
        'windowMinutes',
        p_window_minutes,
        'threshold',
        p_threshold,
        'reportCount',
        report_groups.report_count,
        'firstReportAt',
        report_groups.first_report_at,
        'latestReportAt',
        report_groups.latest_report_at,
        'source',
        'anonymous_reports'
      ),

      'rule-based-prototype',
      true

    from report_groups

    where not exists (
      select 1
      from public.incidents as existing

      where existing.stop_id =
        report_groups.stop_id

        and existing.kind =
          report_groups.kind

        and existing.route_number
          is not distinct from
          report_groups.route_number

        and existing.status <> 'resolved'

        and existing.created_at >=
          now() - make_interval(
            mins => p_window_minutes
          )
    )

    returning id
  )

  select inserted_incidents.id
  from inserted_incidents;
end;
$$;

-- 관리자와 서버에서 사건 감지 함수 실행 허용

grant execute
on function public.detect_report_incidents(
  integer,
  integer
)
to authenticated, service_role;

-- 시민은 시민용 알림만 조회하고 관리자는 모든 알림을 조회하도록 제한

drop policy if exists
  "alerts_public_read"
on public.alerts;

drop policy if exists
  "alerts_citizen_public_read"
on public.alerts;

create policy "alerts_citizen_public_read"
on public.alerts
for select
to anon, authenticated
using (
  audience = 'citizen'
  or public.is_admin()
);

-- 시민에게 공개된 교통 사건만 조회하도록 제한
drop policy if exists "incidents_public_read"
on public.incidents;

drop policy if exists "incidents_citizen_read"
on public.incidents;

create policy "incidents_citizen_read"
on public.incidents
for select
to anon, authenticated
using (
  status in ('notified', 'resolved')
  or public.is_admin()
);


-- 시민용 알림만 조회하도록 제한
drop policy if exists "alerts_public_read"
on public.alerts;

drop policy if exists "alerts_citizen_read"
on public.alerts;

create policy "alerts_citizen_read"
on public.alerts
for select
to anon, authenticated
using (
  audience = 'citizen'
  or public.is_admin()
);


-- 희망 노선 내용과 정류장 순서를 함께 수정
create or replace function public.update_route_request(
  p_route_request_id uuid,
  p_title text,
  p_description text,
  p_stop_ids bigint[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_author_id uuid;
  v_status public.route_request_status;
  v_stop_id bigint;
  v_order integer := 0;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select author_id, status
  into v_author_id, v_status
  from public.route_requests
  where id = p_route_request_id;

  if v_author_id is null then
    raise exception '존재하지 않는 희망 노선입니다.';
  end if;

  if v_author_id <> auth.uid()
     and not public.is_admin() then
    raise exception '수정 권한이 없습니다.';
  end if;

  if not public.is_admin()
     and v_status not in ('draft', 'open') then
    raise exception '검토가 시작된 노선은 수정할 수 없습니다.';
  end if;

  if char_length(trim(p_title)) < 2
     or char_length(trim(p_title)) > 100 then
    raise exception '제목은 2자 이상 100자 이하로 입력해 주세요.';
  end if;

  if char_length(trim(p_description)) < 5
     or char_length(trim(p_description)) > 3000 then
    raise exception '내용은 5자 이상 3000자 이하로 입력해 주세요.';
  end if;

  if coalesce(array_length(p_stop_ids, 1), 0) < 5 then
    raise exception '정류장을 최소 5개 선택해 주세요.';
  end if;

  if (
    select count(distinct value)
    from unnest(p_stop_ids) as value
  ) <> array_length(p_stop_ids, 1) then
    raise exception '같은 정류장을 중복해서 선택할 수 없습니다.';
  end if;

  if (
    select count(*)
    from public.transit_stops
    where id = any(p_stop_ids)
  ) <> array_length(p_stop_ids, 1) then
    raise exception '존재하지 않는 정류장이 포함되어 있습니다.';
  end if;

  update public.route_requests
  set
    title = trim(p_title),
    description = trim(p_description)
  where id = p_route_request_id;

  delete from public.route_request_stops
  where route_request_id = p_route_request_id;

  foreach v_stop_id in array p_stop_ids loop
    v_order := v_order + 1;

    insert into public.route_request_stops (
      route_request_id,
      stop_id,
      stop_order
    )
    values (
      p_route_request_id,
      v_stop_id,
      v_order
    );
  end loop;
end;
$$;

grant execute on function public.update_route_request(
  uuid,
  text,
  text,
  bigint[]
) to authenticated;


-- 공개 게시글 조회 수 증가
create or replace function public.increment_post_view(
  p_post_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts
  set view_count = view_count + 1
  where id = p_post_id
    and is_hidden = false;
$$;

grant execute on function public.increment_post_view(
  uuid
) to anon, authenticated;


-- 포인트를 차감하고 룰렛 보상을 지급
create or replace function public.draw_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_cost integer := 300;
  v_current_points integer;
  v_probability_total numeric;
  v_random_value numeric;
  v_reward public.reward_catalog%rowtype;
  v_draw_id uuid := gen_random_uuid();
  v_reward_points integer := 0;
  v_remaining_points integer;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select points
  into v_current_points
  from public.profiles
  where id = auth.uid()
  for update;

  if v_current_points is null then
    raise exception '회원 프로필을 찾을 수 없습니다.';
  end if;

  if v_current_points < v_ticket_cost then
    raise exception '룰렛 참여 포인트가 부족합니다.';
  end if;

  perform id
  from public.reward_catalog
  where is_active = true
    and (
      stock is null
      or stock > 0
    )
  for update;

  select sum(probability)
  into v_probability_total
  from public.reward_catalog
  where is_active = true
    and (
      stock is null
      or stock > 0
    );

  if coalesce(v_probability_total, 0) <= 0 then
    raise exception '현재 받을 수 있는 보상이 없습니다.';
  end if;

  v_random_value :=
    random() * v_probability_total;

  select reward.*
  into v_reward
  from (
    select
      r.*,
      sum(r.probability) over (
        order by r.id
      ) as cumulative_probability
    from public.reward_catalog r
    where r.is_active = true
      and (
        r.stock is null
        or r.stock > 0
      )
  ) reward
  where reward.cumulative_probability
    >= v_random_value
  order by reward.cumulative_probability
  limit 1;

  if v_reward.id is null then
    raise exception '보상 추첨에 실패했습니다.';
  end if;

  if v_reward.reward_type = 'points' then
    v_reward_points :=
      v_reward.reward_value;
  end if;

  insert into public.point_ledger (
    user_id,
    amount,
    reason,
    reference_key
  )
  values (
    auth.uid(),
    -v_ticket_cost,
    'reward_draw',
    v_draw_id::text
  );

  if v_reward.stock is not null then
    update public.reward_catalog
    set stock = stock - 1
    where id = v_reward.id;
  end if;

  insert into public.reward_draws (
    id,
    user_id,
    reward_id,
    ticket_cost,
    reward_points
  )
  values (
    v_draw_id,
    auth.uid(),
    v_reward.id,
    v_ticket_cost,
    v_reward_points
  );

  if v_reward_points > 0 then
    insert into public.point_ledger (
      user_id,
      amount,
      reason,
      reference_key
    )
    values (
      auth.uid(),
      v_reward_points,
      'reward',
      v_draw_id::text
    );
  end if;

  select points
  into v_remaining_points
  from public.profiles
  where id = auth.uid();

  return jsonb_build_object(
    'drawId', v_draw_id,
    'rewardId', v_reward.id,
    'rewardName', v_reward.name,
    'rewardDescription', v_reward.description,
    'rewardType', v_reward.reward_type,
    'rewardValue', v_reward.reward_value,
    'rewardPoints', v_reward_points,
    'ticketCost', v_ticket_cost,
    'remainingPoints', v_remaining_points,
    'isSimulated',
      v_reward.reward_type <> 'points'
  );
end;
$$;

grant execute on function public.draw_reward()
to authenticated;




-- user01 테스트 포인트 지급
insert into public.point_ledger (
  user_id,
  amount,
  reason,
  reference_key
)
select
  id,
  10000,
  'admin_adjustment',
  'roulette-test-001'
from auth.users
where email = 'wngus031202@naver.com';

-- admin@test.com 계정을 관리자로 변경
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'admin@admin.com'
);

-- 관리자 계정 및 권한 확인
select
  u.id,
  u.email,
  p.role
from auth.users as u
join public.profiles as p
  on p.id = u.id
where u.email = 'admin@admin.com';


-- 나래학교.더샵레이크 정류장 더미 데이터 추가
insert into public.transit_stops (
  external_id,
  city_code,
  name,
  stop_number,
  district_name,
  location,
  source
)
values (
  'DEMO-36493',
  '31240',
  '나래학교.더샵레이크',
  '36493',
  '산척동',
  st_setsrid(
    st_makepoint(127.10667, 37.17618),
    4326
  )::geography,
  'demo'
)
on conflict (external_id) do update
set
  name = excluded.name,
  stop_number = excluded.stop_number,
  district_name = excluded.district_name,
  location = excluded.location,
  source = excluded.source;



-- 지정한 이메일 회원을 관리자로 변경
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'admin@admin.com'
);

-- 관리자 계정 확인
select
  p.id,
  u.email,
  p.nickname,
  p.role,
  p.created_at
from public.profiles p
join auth.users u
  on u.id = p.id
where p.role = 'admin';


-- 일반 사용자가 자신의 role을 admin으로 변경하지 못하도록 차단
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    new.role is distinct from old.role
    and not public.is_admin()
  then
    raise exception '관리자만 회원 권한을 변경할 수 있습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_role
on public.profiles;

create trigger profiles_protect_role
before update on public.profiles
for each row
execute function public.protect_profile_role();

-- =========================================================
-- 28. 게시물 신고
-- 정류장 원터치 익명 신고(anonymous_reports)와는 별개 기능입니다.
-- =========================================================

create type public.post_report_reason as enum (
  'spam',
  'abuse',
  'false_info',
  'other'
);

create table public.post_reports (
  id bigint generated always as identity primary key,

  post_id uuid not null
    references public.posts(id) on delete cascade,

  reporter_id uuid not null
    references auth.users(id) on delete cascade,

  reason public.post_report_reason not null,
  detail text
    check (detail is null or char_length(detail) <= 500),

  created_at timestamptz not null default now(),

  unique (post_id, reporter_id)
);

create index post_reports_post_idx
on public.post_reports (post_id, created_at desc);

alter table public.post_reports enable row level security;

-- 로그인 사용자는 자신의 신고만 등록할 수 있고, 본인 게시글은 신고할 수 없음
create policy "post_reports_insert_own"
on public.post_reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and not exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.author_id = auth.uid()
  )
);

-- 신고자 본인 또는 관리자만 신고 내역 조회 가능
create policy "post_reports_select_own_or_admin"
on public.post_reports
for select
to authenticated
using (
  reporter_id = auth.uid()
  or public.is_admin()
);

-- 관리자 검토 화면용 게시글별 신고 집계
create or replace view public.post_report_summary
with (security_invoker = true)
as
select
  p.id as post_id,
  p.title,
  p.author_id,
  p.is_hidden,
  p.created_at as post_created_at,
  count(r.id)::integer as report_count,
  max(r.created_at) as latest_report_at
from public.posts p
join public.post_reports r
  on r.post_id = p.id
group by
  p.id,
  p.title,
  p.author_id,
  p.is_hidden,
  p.created_at;

grant select on public.post_report_summary
to authenticated;


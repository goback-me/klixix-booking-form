# Staging — disable / protect / tear down

The three staging projects (team `jai-rams-projects-26879cb5`) are **public** during QA,
protected only by: `noindex` (discovery prevention, **not** access control), a narrow CORS
allowlist, API rate limiting, and the fake MechanicDesk adapter (no real bookings possible,
real tokens unset). To lock them down or remove them:

## Immediately re-enable Vercel access protection (blocks all public access)
Re-enables the auth wall on all three (only Vercel-authenticated users can open them). This also
blocks the browser form→API flow, so do it when QA is paused/finished.
```
# needs the Vercel CLI token; run from anywhere
python3 - <<'PY'
import json,urllib.request,os
tok=json.load(open(os.path.expanduser("~/Library/Application Support/com.vercel.cli/auth.json")))["token"]
team="team_Ic2ZQO2EXqMoZdeimk1Bwbi2"
for p in ["carone-booking-api-staging","carone-booking-form-staging","carone-booking-parent-staging"]:
    r=urllib.request.Request(f"https://api.vercel.com/v9/projects/{p}?teamId={team}",
        data=json.dumps({"ssoProtection":{"deploymentType":"all"}}).encode(),method="PATCH",
        headers={"Authorization":f"Bearer {tok}","Content-Type":"application/json"})
    print(p, json.load(urllib.request.urlopen(r)).get("ssoProtection"))
PY
```

## Fully tear down (delete the projects)
```
cd backend && vercel remove carone-booking-api-staging --yes
cd ../frontend && vercel remove carone-booking-form-staging --yes
cd ../staging-parent && vercel remove carone-booking-parent-staging --yes
```

## Neutralise without deleting
- Disable fake bookings: in `carone-booking-api-staging` env, remove `MECHANICDESK_FAKE` → the API
  fails closed on every booking.

## Synthetic-QA cleanup (staging only, evidence-preserving — NEVER a blanket delete)

Do **not** run `delete from public.bookings;`. Use this scoped, guarded procedure in the
Supabase SQL editor, in order:

**Step 1 — identity.** Confirm the dashboard URL reads `/project/cwdelnmbawffmfewprzz/`.
If it shows `lhzkznzlpmegoteukkuy`, **STOP** — run nothing below.

**Step 2 — preserve the evidence ledger (save this output before any delete):**
```sql
select id, booking_state, idempotency_key, created_at, left(coalesce(note,''),40) as note_prefix
from public.bookings
where note ilike '%INTERNAL QA TEST%' or name ilike '%DO NOT SERVICE%'
order by created_at;
```

**Step 3 — preview the exact deletion set (review before deleting):**
```sql
select id, booking_state, created_at
from public.bookings
where note ilike '%INTERNAL QA TEST%' or name ilike '%DO NOT SERVICE%'
order by created_at;
```

**Step 4 — guarded delete (only labelled QA rows; auto-refuses on a production-looking DB):**
```sql
do $$
declare qa int; total int;
begin
  select count(*) into total from public.bookings;
  select count(*) into qa from public.bookings
    where note ilike '%INTERNAL QA TEST%' or name ilike '%DO NOT SERVICE%';
  -- Refuse if many non-QA rows exist (this would not be the synthetic staging DB).
  if (total - qa) > 50 then
    raise exception 'ABORT: % non-QA rows present — this does not look like the synthetic staging DB', total - qa;
  end if;
  delete from public.bookings
    where note ilike '%INTERNAL QA TEST%' or name ilike '%DO NOT SERVICE%';
  raise notice 'Deleted % synthetic QA rows (of % total). Non-QA rows untouched.', qa, total;
end $$;
```
This only ever removes rows positively labelled `INTERNAL QA TEST — DO NOT SERVICE`, leaves every
other row untouched, and aborts automatically if the connected DB holds unexpected non-QA data
(e.g. production's real bookings).

## Notes / limitations
- **`noindex` is not security** — it only asks crawlers not to index. Real access control requires
  Vercel deployment protection (the re-enable block above) or password protection (a paid feature).
- No production domain points to these projects; they exist only on `*.vercel.app`.
- They are absent from the production sitemap (separate hosts from `car-one.com.au`).

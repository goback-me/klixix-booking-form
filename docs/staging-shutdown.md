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
  fails closed (503) on every booking.
- Drop the staging DB data: in Supabase `cwdelnmbawffmfewprzz` SQL editor:
  `delete from public.bookings;` (synthetic QA rows only).

## Notes / limitations
- **`noindex` is not security** — it only asks crawlers not to index. Real access control requires
  Vercel deployment protection (the re-enable block above) or password protection (a paid feature).
- No production domain points to these projects; they exist only on `*.vercel.app`.
- They are absent from the production sitemap (separate hosts from `car-one.com.au`).

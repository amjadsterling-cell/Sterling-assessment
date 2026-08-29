# Sterling Spoken-English Assessment

Standalone assessment tool per `STERLINGASSESSMENTBUILDSPEC.md`. Own Supabase
project, own Vercel deployment — shares no database, keys, or deployment with
the "Broken English" tool it's modelled on.

## 1. Supabase setup

1. Create a new Supabase project (do NOT reuse an existing one).
2. Open the SQL editor and run `supabase/schema.sql` once. This creates all
   tables, seeds an initial active `content_versions` row, locks down RLS
   (no anon/authenticated access — the app only ever talks to Supabase via
   the service-role key from the server), and creates the private
   `recordings` storage bucket.
3. Go to Authentication → Providers and make sure Email is enabled.
4. Create your first login: Authentication → Users → Add user (or just sign
   in with a magic link from `/login` once deployed — the first person to log
   in is automatically promoted to `admin`, per the anti-lockout rule in
   `lib/auth.ts`).

## 2. Environment variables

Copy `.env.example` to `.env.local` for local dev, and add the same keys in
Vercel → Settings → Environment Variables for all environments:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase →
  Settings → API.
- `SUPABASE_SERVICE_ROLE_KEY` — same page, **server-only, never expose to the
  browser**.
- `GROQ_API_KEY` — console.groq.com (free tier covers transcription).
- `GEMINI_API_KEY` — aistudio.google.com. Free tier is ~20 requests/day per
  model; enable billing (pay-as-you-go, roughly ₹1-2/report) before real
  volume.
- `NEXT_PUBLIC_APP_URL` — optional, e.g. `https://assess.yourdomain.com`.
  Falls back to the request's own origin if unset.
- `CRON_SECRET` — any random string. Protects `/api/cron/self-heal`.

## 3. Local development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/login`, sign in (first login becomes admin),
then `/dashboard/new` to create a test link and `/a/{token}` to run through
the lead flow yourself. Recording requires HTTPS or `localhost` — both work.

## 4. Deploy

```bash
vercel
```

Or connect the repo in the Vercel dashboard. Vercel will pick up
`vercel.json`'s cron entry automatically (daily self-heal at 20:00 UTC —
adjust the schedule if you want a different time).

After deploying, hit `/api/health` — it returns which env keys are present
(booleans only) so you can confirm the deploy is wired correctly before
sending any real links.

## 5. Calibration (do this before trusting scores)

The build spec is explicit that rhythm (nPVI) and fluency (WPM/pause) bands
are starting points, not final. Before using this for real leads:

1. Collect ~20 real recordings spanning a range of levels (or have colleagues
   read the passage and answer the speaking prompt at different paces/accents).
2. Run them through the pipeline and look at the raw `metrics` jsonb stored on
   each assessment — `npvi`, `wpm`, `longPauseCount`, `fillerRate`.
3. Compare those numbers against your own judgement of each recording's level,
   and adjust the band thresholds in `lib/scoring/npvi.ts` (`npviToScore`) and
   `lib/scoring/fluency.ts` (`scoreFluency`) to match.
4. Re-run the same 20 recordings and confirm the scores now track your manual
   judgement reasonably well before sending links to real leads.

## 6. Editing questions / passage / courses

Admin → "Edit questions" (`/dashboard/content`) edits the active
`content_versions.content` JSON directly — profile questions, the grammar
quiz, the read-aloud passage and its target words, speaking prompts,
goals/budget questions, and the course/track table used by routing.

Saving always creates a **new version** rather than editing in place, so
reports already generated stay tied to the content version they were taken
under and never change retroactively.

## 7. Study-abroad routing variant

`lib/routing.ts` exports both `routeToCourse` (the courses-business version
used by default) and `routeToReadinessVerdict` (the study-abroad version
mentioned in the spec: C1+ → "IELTS/PTE ready", B2 → "short prep", B1 →
"foundation first", else → "foundation first"). To switch a deployment to the
study-abroad framing:

1. In `app/api/assessments/[token]/submit/route.ts`, swap the `routeToCourse`
   call for `routeToReadinessVerdict(cefr)`.
2. Update `recommended_course` / `alternate_course` writes to store the
   verdict/note instead.
3. Update the report page's "Recommendation" panel copy to match.

## 8. Reliability behaviour already built in

- LLM report calls retry 3× on transient failures. If all 3 fail, the
  assessment is still marked `complete` with its scores saved, but
  `report_error` is set and the report panel shows an amber "couldn't be
  generated" state instead of a silently empty report.
- The daily cron (`/api/cron/self-heal`) re-runs report generation for any
  `complete` assessment still missing a report (using the transcripts already
  stored — no re-transcription cost), and deletes recordings older than 30
  days from storage.
- `/api/health` returns which required env vars are present.
- A speaking sample under 30 seconds is flagged `insufficient_sample` instead
  of being scored.

## 9. What's intentionally out of scope for v1

- No automated tests. Given the pipeline touches paid APIs (Groq, Gemini),
  add fixture-based unit tests for `lib/scoring/*` before relying on this in
  production (the build spec calls this out in Part 10, step 4).
- No rate limiting on the public `/a/[token]` routes — add if you expect
  abuse/scraping of assessment links.
- No email/SMS delivery — the WhatsApp share link is generated client-side
  (`wa.me/...`) and the counsellor sends it manually, per the spec's flow.

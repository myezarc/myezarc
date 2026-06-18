
## Goal

Turn the current single-page review tool into a real ARC portal with login, roles, homeowner submissions, and a reviewer dashboard — all backed by Lovable Cloud.

## Roles

- `homeowner` — submit applications, see their own status/messages
- `reviewer` — view submission queue, run AI review, decide, message homeowner
- `admin` — everything reviewers can do, plus upload/replace HOA guideline PDF, manage users/roles

Roles stored in a separate `user_roles` table with `app_role` enum and a `has_role()` security-definer function (no roles on profiles).

## Auth

- Email/password + Google (managed Lovable OAuth via `lovable.auth.signInWithOAuth`)
- Public `/auth` page (sign in / sign up tabs)
- `_authenticated/` layout gates the app
- Trigger auto-creates a `profiles` row on signup; first user can be promoted to admin via SQL/insert tool

## Database (new tables, all with RLS + GRANTs)

- `profiles` — `user_id`, `full_name`, `email`, `phone`, `address`
- `app_role` enum: `homeowner | reviewer | admin`
- `user_roles` — `user_id`, `role`
- `hoa_guidelines` — `id`, `title`, `storage_path`, `extracted_text`, `is_active`, uploaded_by (admin uploads PDF once; reused for every review)
- `applications` — `id`, `homeowner_id`, `homeowner_email`, `title`, `application_pdf_path`, `extracted_text`, `status` (`submitted | in_review | approved | conditional | rejected | changes_requested`), `submitted_at`
- `application_files` — extra supporting files per application (photos, plans)
- `arc_reviews` — `application_id`, `reviewer_id`, `decision`, `summary`, `findings` (jsonb), `homeowner_message`, `model`, `created_at`
- `messages` — `application_id`, `sender_id`, `body`, `created_at` (homeowner ↔ reviewer thread)

RLS:
- Homeowners read/write only their own applications, files, and messages
- Reviewers/admins read all applications, write reviews and messages
- Only admins write `hoa_guidelines`; everyone authenticated reads the active one
- `user_roles`: select own row; admin manages all (via `has_role`)

## Storage

- Private bucket `arc-documents` for guideline PDFs, application PDFs, and supporting files
- Path convention: `guidelines/<id>.pdf`, `applications/<user_id>/<application_id>/<filename>`
- RLS on `storage.objects` mirrors table policies (owner + reviewers/admins)

## Routes

```
/                         landing (public)
/auth                     sign in / sign up (public)
/_authenticated/
  dashboard               role-aware home
  apply                   homeowner: new application (PDF upload + supporting files + email)
  applications            homeowner: list of their submissions
  applications/$id        detail: status, AI review result, message thread
  review                  reviewer/admin: queue of submissions
  review/$id              reviewer/admin: run AI review, edit, send decision + message
  admin/guidelines        admin: upload/replace active guideline PDF
  admin/users             admin: assign roles
```

The current `/review` becomes `review/$id` and pulls guideline + application from the DB instead of two ad-hoc uploads.

## Server functions (`src/lib/*.functions.ts`)

- `submitApplication` — homeowner upload: stores PDF, runs OCR/text extraction, creates `applications` row
- `uploadGuideline` (admin) — stores PDF, extracts text, marks active
- `runArcReviewForApplication` — loads active guideline + application text, calls existing `runArcReview`, persists `arc_reviews` row, updates application status
- `sendDecision` — reviewer finalizes: updates status + posts homeowner message (and email later)
- `postMessage` / `listMessages`
- `assignRole` (admin)

All protected fns use `requireSupabaseAuth` + `has_role` checks where needed. `attachSupabaseAuth` already wired.

## Reuse of existing code

- Keep `src/lib/pdf-extract.ts`, `src/lib/ocr.functions.ts`, `src/lib/arc-review.functions.ts` as-is
- The current `review.tsx` UI is refactored into the new `review/$id` page; email-prompt dialog stays as a fallback when no email is on file

## Out of scope for this MVP (call out, defer)

- Sending the homeowner email message via real email (we display + store; can wire transactional email later)
- Structured application form (PDF-only per your choice)
- Public application status lookup without login

## Build order

1. Migration: enum, tables, RLS, GRANTs, `has_role`, profile trigger, storage bucket
2. Configure Google social auth + auth page + `_authenticated` layout (managed by integration)
3. Server functions for guideline + application + review + messages
4. Homeowner pages: `apply`, `applications`, `applications/$id`
5. Reviewer pages: `review` queue + `review/$id` (port existing UI)
6. Admin pages: guidelines + users
7. Role-aware dashboard + nav

After approval I'll run the migration first (you'll review it), then implement the rest in one pass.

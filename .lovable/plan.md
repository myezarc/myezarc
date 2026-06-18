# Park Avenue HOA Membership Approval

Right now any signed-in user can submit ARC applications. We'll add an HOA layer so homeowners must request membership in **Park Avenue HOA** (address, phone, etc.) and be approved by an admin before they can apply.

## What changes for users

- **Homeowner, first login**: lands on a "Join Park Avenue HOA" form asking for street address, unit (optional), city, state, zip, phone, email (prefilled), and an optional note. Submitting creates a pending membership request.
- **Pending state**: dashboard, apply, and applications pages are blocked behind a "Membership pending approval" screen.
- **Approved**: full access — can submit ARC applications as today.
- **Rejected**: shown the rejection reason and a button to resubmit.
- **Admin**: new `/admin/memberships` page lists pending/approved/rejected requests with Approve / Reject (with reason) buttons.
- **Reviewers/admins**: bypass the gate (they don't need a membership).

## Data model

New tables (Lovable Cloud):

- `hoas` — `id`, `name`, `slug`, `description`. Seeded with one row: **Park Avenue HOA**.
- `hoa_memberships` — `id`, `user_id`, `hoa_id`, `status` (`pending`/`approved`/`rejected`), `street_address`, `unit`, `city`, `state`, `zip`, `phone`, `email`, `note`, `rejection_reason`, `reviewed_by`, `reviewed_at`, timestamps. Unique on (`user_id`, `hoa_id`).

Existing `applications` table gets a nullable `hoa_id` column so submissions are scoped to the HOA the homeowner belongs to.

RLS:
- Homeowners read/insert/update their own membership row (only while pending — can resubmit after rejection).
- Reviewers/admins read all memberships; admins update status.
- `hoas` readable by everyone signed in.

Helper function `public.is_approved_member(_user_id uuid)` (security definer) for use in app logic / future policies.

## Frontend

- New route `/_authenticated/membership` — shows the form, pending screen, or rejection screen depending on status. Used as a gate.
- `_authenticated/route.tsx` is integration-managed (don't touch). Instead, the dashboard/apply/applications pages call a `getMyMembershipStatus` server fn; if the user is a homeowner and not approved, redirect to `/membership`. Staff (reviewer/admin) skip the check.
- New route `/_authenticated/admin/memberships` — admin list + approve/reject actions.
- Dashboard gets a "Membership: Park Avenue HOA — Approved/Pending/Rejected" badge.

## Server functions (`src/lib/membership.functions.ts`)

- `getMyMembership()` — returns current user's membership row + HOA.
- `submitMembership({ ...formFields })` — upserts a pending membership for the user (only if no row, or status is `rejected`).
- `listMemberships({ status? })` — admin only.
- `decideMembership({ id, status: 'approved'|'rejected', rejection_reason? })` — admin only; sets `reviewed_by`/`reviewed_at`.

All protected via `requireSupabaseAuth`; admin endpoints check `has_role(... ,'admin')`.

## Out of scope

- Multiple HOAs per user (single Park Avenue HOA only for now).
- Email notifications on approval/rejection.
- Editing an already-approved address (admin-only later).

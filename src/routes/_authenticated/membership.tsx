import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Clock, PlusCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getMyMembership,
  listHoas,
  submitHoaRequest,
  submitMembership,
} from "@/lib/membership.functions";

export const Route = createFileRoute("/_authenticated/membership")({
  head: () => ({ meta: [{ title: "HOA Membership — Ez-ARC" }] }),
  component: MembershipPage,
});

type Membership = Awaited<ReturnType<typeof getMyMembership>>["membership"];
type Hoa = Awaited<ReturnType<typeof getMyMembership>>["hoa"];

function MembershipPage() {
  const { user, isGlobalAdmin } = useAuth();
  const router = useRouter();
  const fetchMembership = useServerFn(getMyMembership);
  const fetchHoas = useServerFn(listHoas);
  const submit = useServerFn(submitMembership);
  const requestHoa = useServerFn(submitHoaRequest);

  const [loading, setLoading] = useState(true);
  const [hoas, setHoas] = useState<Hoa[]>([]);
  const [selectedHoaId, setSelectedHoaId] = useState<string>("");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [hoa, setHoa] = useState<Hoa>(null);
  const [membership, setMembership] = useState<Membership>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    street_address: "",
    unit: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: user?.email ?? "",
    note: "",
  });
  const [newHoaForm, setNewHoaForm] = useState({
    requested_hoa_name: "",
    community_address: "",
    city: "",
    state: "",
    zip: "",
    contact_name: "",
    phone: "",
    email: user?.email ?? "",
    note: "",
  });

  const loadMembership = useCallback(
    async (hoaId: string) => {
      const res = await fetchMembership({ data: { hoaId } });
      setHoa(res.hoa);
      setMembership(res.membership);
      if (res.membership) {
        setForm({
          street_address: res.membership.street_address ?? "",
          unit: res.membership.unit ?? "",
          city: res.membership.city ?? "",
          state: res.membership.state ?? "",
          zip: res.membership.zip ?? "",
          phone: res.membership.phone ?? "",
          email: res.membership.email ?? user?.email ?? "",
          note: res.membership.note ?? "",
        });
      } else {
        setForm({
          street_address: "",
          unit: "",
          city: "",
          state: "",
          zip: "",
          phone: "",
          email: user?.email ?? "",
          note: "",
        });
      }
    },
    [user?.email],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        if (isGlobalAdmin) return;
        const allHoas = await fetchHoas();
        if (cancelled) return;
        setHoas(allHoas);
        const firstHoa = allHoas[0];
        if (firstHoa) {
          setSelectedHoaId(firstHoa.id);
          await loadMembership(firstHoa.id);
        } else {
          setMode("new");
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load HOA membership.");
          setMode("new");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGlobalAdmin, user?.email]);

  useEffect(() => {
    if (!selectedHoaId || loading) return;
    loadMembership(selectedHoaId).catch((err: any) => {
      setError(err?.message ?? "Failed to load HOA membership.");
    });
  }, [loading, selectedHoaId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submit({ data: { ...form, hoa_id: selectedHoaId || null } });
      const res = await fetchMembership({ data: { hoaId: selectedHoaId } });
      setMembership(res.membership);
      setEditing(false);
      router.invalidate();
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const onRequestHoa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await requestHoa({ data: newHoaForm });
      setSuccess("Your HOA request was sent to the admin for review.");
      setNewHoaForm({
        requested_hoa_name: "",
        community_address: "",
        city: "",
        state: "",
        zip: "",
        contact_name: "",
        phone: "",
        email: user?.email ?? "",
        note: "",
      });
      router.invalidate();
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit HOA request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (isGlobalAdmin) {
    return (
      <div className="max-w-2xl rounded-2xl border border-border bg-surface p-6">
        <div className="mb-3 grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="font-display text-2xl font-bold text-brand">Global Admin umbrella account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Global Admins approve and manage HOA accounts at the platform level, so they do not need
          HOA membership.
        </p>
      </div>
    );
  }

  const showForm = !membership || membership.status === "rejected" || editing;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Membership</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-brand md:text-4xl">
        {hoa?.name ?? "HOA"}
      </h1>
      {hoa?.description && <p className="mt-2 text-muted-foreground">{hoa.description}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setMode("existing");
            setError(null);
            setSuccess(null);
          }}
          className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
            mode === "existing"
              ? "border-accent bg-accent/10 text-brand"
              : "border-border bg-surface text-muted-foreground"
          }`}
        >
          My HOA is listed
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("new");
            setError(null);
            setSuccess(null);
          }}
          className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
            mode === "new"
              ? "border-accent bg-accent/10 text-brand"
              : "border-border bg-surface text-muted-foreground"
          }`}
        >
          Request a new HOA
        </button>
      </div>

      {mode === "existing" && hoas.length > 0 && (
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold text-brand">
            Choose your HOA community
          </span>
          <select
            value={selectedHoaId}
            onChange={(e) => setSelectedHoaId(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              Select an existing HOA
            </option>
            {hoas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {mode === "existing" && hoas.length === 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <p className="font-display font-bold text-brand">No HOA accounts listed yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Request your HOA so the Global Admin can review and add it.
          </p>
          <button
            type="button"
            onClick={() => {
              setMode("new");
              setError(null);
            }}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground hover:opacity-90"
          >
            Request a new HOA
          </button>
        </div>
      )}

      {mode === "existing" && membership && !editing && (
        <div className="mt-6">
          <StatusBanner
            status={membership.status}
            reason={membership.rejection_reason}
            hoaName={hoa?.name ?? "this HOA"}
          />
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="font-display font-bold text-brand">Your submitted info</p>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <Row label="Address">
                {membership.street_address}
                {membership.unit ? `, ${membership.unit}` : ""}
              </Row>
              <Row label="City / State / Zip">
                {membership.city}, {membership.state} {membership.zip}
              </Row>
              <Row label="Phone">{membership.phone}</Row>
              <Row label="Email">{membership.email}</Row>
              {membership.note && <Row label="Note">{membership.note}</Row>}
            </dl>
            {membership.status === "approved" && (
              <button
                onClick={() => setEditing(false)}
                className="mt-4 inline-flex rounded-lg border border-border px-3 py-2 text-sm font-semibold text-brand hover:bg-background"
                disabled
              >
                Contact admin to update approved details
              </button>
            )}
          </div>
        </div>
      )}

      {mode === "existing" && showForm && (
        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-6"
        >
          <p className="font-display font-bold text-brand">
            {membership?.status === "rejected" ? "Update and resubmit" : "Request membership"}
          </p>
          <p className="text-sm text-muted-foreground">
            Submit your address and contact info. An admin will review and approve before you can
            file ARC applications.
          </p>
          <p className="rounded-xl border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
            Email, phone, SMS, and WhatsApp-style messages may be used when needed for account,
            membership, application, and HOA notifications.
          </p>

          <Field label="Street address" required>
            <input
              required
              value={form.street_address}
              onChange={(e) => setForm({ ...form, street_address: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Unit / Apt (optional)">
            <input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" required>
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="State" required>
              <input
                required
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Zip" required>
              <input
                required
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" required>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Email" required>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Note (optional)">
            <textarea
              rows={3}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={inputCls}
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit for approval"}
          </button>
        </form>
      )}

      {mode === "new" && (
        <form
          onSubmit={onRequestHoa}
          className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-6"
        >
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <PlusCircle className="size-5" />
            </div>
            <div>
              <p className="font-display font-bold text-brand">Request a new HOA</p>
              <p className="mt-1 text-sm text-muted-foreground">
                If your community is not listed, send the HOA details to the admin. You can
                request membership after the HOA is added.
              </p>
            </div>
          </div>

          <Field label="HOA / community name" required>
            <input
              required
              value={newHoaForm.requested_hoa_name}
              onChange={(e) =>
                setNewHoaForm({ ...newHoaForm, requested_hoa_name: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Community address (optional)">
            <input
              value={newHoaForm.community_address}
              onChange={(e) =>
                setNewHoaForm({ ...newHoaForm, community_address: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" required>
              <input
                required
                value={newHoaForm.city}
                onChange={(e) => setNewHoaForm({ ...newHoaForm, city: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="State" required>
              <input
                required
                value={newHoaForm.state}
                onChange={(e) => setNewHoaForm({ ...newHoaForm, state: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Zip" required>
              <input
                required
                value={newHoaForm.zip}
                onChange={(e) => setNewHoaForm({ ...newHoaForm, zip: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="HOA contact name (optional)">
            <input
              value={newHoaForm.contact_name}
              onChange={(e) => setNewHoaForm({ ...newHoaForm, contact_name: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your phone" required>
              <input
                required
                type="tel"
                value={newHoaForm.phone}
                onChange={(e) => setNewHoaForm({ ...newHoaForm, phone: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Your email" required>
              <input
                required
                type="email"
                value={newHoaForm.email}
                onChange={(e) => setNewHoaForm({ ...newHoaForm, email: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Note (optional)">
            <textarea
              rows={3}
              value={newHoaForm.note}
              onChange={(e) => setNewHoaForm({ ...newHoaForm, note: e.target.value })}
              className={inputCls}
            />
          </Field>

          <p className="rounded-xl border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
            By submitting, you agree that the admin may use your email and phone for follow-up,
            including email, SMS, or WhatsApp-style notifications when needed.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send HOA request"}
          </button>
        </form>
      )}
    </div>
  );
}

function StatusBanner({
  status,
  reason,
  hoaName,
}: {
  status: string;
  reason?: string | null;
  hoaName: string;
}) {
  if (status === "pending")
    return (
      <Banner
        tone="amber"
        icon={Clock}
        title="Pending approval"
        body="Your membership request is waiting for an admin. You'll get full access once approved."
      />
    );
  if (status === "approved")
    return (
      <Banner
        tone="green"
        icon={CheckCircle2}
        title="Approved"
        body={`You're a member of ${hoaName}. You can now submit ARC applications.`}
      />
    );
  return (
    <Banner
      tone="red"
      icon={XCircle}
      title="Rejected"
      body={reason ? `Reason: ${reason}` : "Please update your info and resubmit."}
    />
  );
}

function Banner({
  tone,
  icon: Icon,
  title,
  body,
}: {
  tone: "amber" | "green" | "red";
  icon: any;
  title: string;
  body: string;
}) {
  const cls =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "green"
        ? "border-green-200 bg-green-50 text-green-900"
        : "border-red-200 bg-red-50 text-red-900";
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-5 ${cls}`}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-display font-bold">{title}</p>
        <p className="text-sm">{body}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-brand">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-brand">{children}</dd>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-brand outline-none focus:border-accent";

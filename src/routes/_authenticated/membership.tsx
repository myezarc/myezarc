import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getMyMembership, listHoas, submitMembership } from "@/lib/membership.functions";

export const Route = createFileRoute("/_authenticated/membership")({
  head: () => ({ meta: [{ title: "HOA Membership — Ez-ARC" }] }),
  component: MembershipPage,
});

type Membership = Awaited<ReturnType<typeof getMyMembership>>["membership"];
type Hoa = Awaited<ReturnType<typeof getMyMembership>>["hoa"];

function MembershipPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fetchMembership = useServerFn(getMyMembership);
  const fetchHoas = useServerFn(listHoas);
  const submit = useServerFn(submitMembership);

  const [loading, setLoading] = useState(true);
  const [hoas, setHoas] = useState<Hoa[]>([]);
  const [selectedHoaId, setSelectedHoaId] = useState<string>("");
  const [hoa, setHoa] = useState<Hoa>(null);
  const [membership, setMembership] = useState<Membership>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const loadMembership = async (hoaId: string) => {
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
  };

  useEffect(() => {
    (async () => {
      const allHoas = await fetchHoas();
      setHoas(allHoas);
      const firstHoa = allHoas[0];
      if (firstHoa) {
        setSelectedHoaId(firstHoa.id);
        await loadMembership(firstHoa.id);
      }
      setLoading(false);
    })();
  }, [fetchHoas, user?.email]);

  useEffect(() => {
    if (!selectedHoaId || loading) return;
    loadMembership(selectedHoaId);
  }, [selectedHoaId]);

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

  if (loading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const showForm = !membership || membership.status === "rejected" || editing;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Membership</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-brand md:text-4xl">
        {hoa?.name ?? "HOA"}
      </h1>
      {hoa?.description && <p className="mt-2 text-muted-foreground">{hoa.description}</p>}

      {hoas.length > 1 && (
        <label className="mt-6 block">
          <span className="mb-1 block text-sm font-semibold text-brand">Community</span>
          <select
            value={selectedHoaId}
            onChange={(e) => setSelectedHoaId(e.target.value)}
            className={inputCls}
          >
            {hoas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {membership && !editing && (
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

      {showForm && (
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

type Status =
  | "submitted"
  | "in_review"
  | "approved"
  | "conditional"
  | "rejected"
  | "changes_requested";

const map: Record<Status, { label: string; cls: string }> = {
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-800" },
  in_review: { label: "In review", cls: "bg-indigo-100 text-indigo-800" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800" },
  conditional: { label: "Conditional", cls: "bg-amber-100 text-amber-800" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-800" },
  changes_requested: { label: "Changes requested", cls: "bg-amber-100 text-amber-800" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = map[status as Status] ?? { label: status, cls: "bg-gray-100 text-gray-800" };
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${m.cls}`}>
      {m.label}
    </span>
  );
}

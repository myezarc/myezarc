import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, FileText, Download, Loader2, AlertTriangle } from "lucide-react";
import { getMemberResources } from "@/lib/resources.functions";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({ meta: [{ title: "Resources — Ez-ARC" }] }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const get = useServerFn(getMemberResources);
  const [data, setData] = useState<Awaited<ReturnType<typeof getMemberResources>> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    get()
      .then(setData)
      .catch((e: any) => setErr(e?.message ?? "Failed"));
  }, []);

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
        {data?.hoa?.name ?? "HOA"}
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold text-brand md:text-4xl">
        Member resources
      </h1>
      <p className="mt-2 text-muted-foreground">
        Download the architectural guideline and the ARC application form.
      </p>

      {err && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{err}</p>
        </div>
      )}

      {!data && !err && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      )}

      {data && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ResourceCard
            icon={BookOpen}
            label="HOA Guideline"
            title={data.guideline?.title}
            url={data.guideline?.url}
            createdAt={data.guideline?.created_at}
            empty="No guideline uploaded yet."
          />
          <ResourceCard
            icon={FileText}
            label="ARC Application Form"
            title={data.arcForm?.title}
            url={data.arcForm?.url}
            createdAt={data.arcForm?.created_at}
            empty="No application form uploaded yet."
          />
        </div>
      )}
    </div>
  );
}

function ResourceCard({
  icon: Icon,
  label,
  title,
  url,
  createdAt,
  empty,
}: {
  icon: any;
  label: string;
  title?: string | null;
  url?: string | null;
  createdAt?: string | null;
  empty: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-background p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display font-bold text-brand">{title ?? empty}</p>
          {createdAt && (
            <p className="text-xs text-muted-foreground">
              Updated {new Date(createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-foreground hover:opacity-90"
          >
            <Download className="size-4" /> Download PDF
          </a>
        ) : (
          <span className="text-xs italic text-muted-foreground">Not available yet</span>
        )}
      </div>
    </div>
  );
}

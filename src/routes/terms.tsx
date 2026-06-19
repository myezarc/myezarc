import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and Disclaimer - Ez-ARC" },
      {
        name: "description",
        content:
          "Terms, conditions, and disclaimer for using the Ez-ARC architectural review portal.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <Link to="/" className="mb-10 inline-flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-brand">
            <div className="size-3 rotate-45 border-2 border-brand-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-brand">
            Ez-ARC
          </span>
        </Link>

        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Terms and disclaimer
        </p>
        <h1 className="font-display text-4xl font-bold text-brand">
          Terms, Conditions, and Limitation of Responsibility
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Last updated: June 19, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="mb-2 font-display text-xl font-bold text-brand">
              Informational Tool Only
            </h2>
            <p>
              Ez-ARC provides software tools to help organize architectural review
              submissions, documents, comments, and decisions. The service does not provide
              legal, engineering, architectural, construction, permitting, compliance, or
              insurance advice.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl font-bold text-brand">
              No Guarantee of Approval or Compliance
            </h2>
            <p>
              Users are responsible for verifying all HOA rules, governing documents,
              municipal codes, permit requirements, property restrictions, and professional
              recommendations before taking action. Any review output, summary, checklist, or
              recommendation should be independently verified.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl font-bold text-brand">
              User and HOA Responsibility
            </h2>
            <p>
              Homeowners, HOA boards, ARC committees, managers, and administrators are solely
              responsible for the accuracy of information entered, documents uploaded,
              decisions made, notices sent, deadlines tracked, and actions taken based on the
              platform.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl font-bold text-brand">
              Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, Ez-ARC and its operators are not
              responsible or liable for any issues, losses, damages, disputes, delays,
              denials, fines, construction problems, compliance failures, data errors, missed
              deadlines, or other consequences arising from use of the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl font-bold text-brand">
              Acceptance
            </h2>
            <p>
              By creating an account, signing in, uploading documents, submitting an
              application, reviewing a request, or otherwise using Ez-ARC, you agree to these
              terms and accept responsibility for your own use of the platform.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

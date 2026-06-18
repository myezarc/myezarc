import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ClipboardList,
  FileSignature,
  MessagesSquare,
  ShieldCheck,
  Bell,
  ArrowRight,
} from "lucide-react";
import heroImage from "@/assets/dashboard-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ez-ARC Review — Modern HOA Architectural Review Software" },
      {
        name: "description",
        content:
          "Ez-ARC Review helps HOAs manage architectural change requests end-to-end: digital submissions, committee voting, and a permanent audit trail.",
      },
      { property: "og:title", content: "Ez-ARC Review — Modern HOA Architectural Review Software" },
      {
        property: "og:description",
        content:
          "Move ARC requests from messy emails to a structured, transparent approval workflow.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Nav />
      <main>
        <Hero />
        <Workflow />
        <Features />
        <Testimonial />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-8 place-items-center rounded-md bg-brand">
        <div className="size-3 rotate-45 border-2 border-brand-foreground" />
      </div>
      <span className="font-display text-xl font-bold tracking-tight text-brand">Ez-ARC</span>
    </div>
  );
}

function Nav() {
  return (
    <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-8">
      <Logo />
      <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
        <a href="#workflow" className="transition-colors hover:text-brand">Workflow</a>
        <a href="#features" className="transition-colors hover:text-brand">Features</a>
        <a href="#pricing" className="transition-colors hover:text-brand">Pricing</a>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          to="/auth"
          className="hidden px-4 py-2 text-sm font-semibold text-foreground sm:inline-flex"
        >
          Log in
        </Link>
        <Link
          to="/auth"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition-all hover:bg-brand/90"
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-16 md:px-8 lg:grid-cols-2">
      <div>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          Modernizing HOA Standards
        </div>
        <h1 className="mb-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-brand lg:text-6xl">
          Architectural reviews, <span className="text-accent">simplified.</span>
        </h1>
        <p className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
          The all-in-one platform for HOAs to manage exterior change requests. Move from
          messy emails and lost PDFs to a structured, transparent approval workflow.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            to="/auth"
            className="rounded-xl bg-brand px-8 py-4 text-center font-bold text-brand-foreground shadow-lg transition-all hover:-translate-y-0.5"
          >
            Get started
          </Link>
          <a
            href="#workflow"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-8 py-4 font-bold text-foreground transition-all hover:bg-surface"
          >
            View Workflow <ArrowRight className="size-4" />
          </a>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-black/5">
          <img
            src={heroImage}
            alt="Illustration of suburban homes flowing through an architectural review approval pipeline"
            width={1280}
            height={960}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
        <div className="absolute -bottom-6 -left-6 hidden rounded-xl border border-border bg-background p-6 shadow-xl md:block">
          <div className="mb-3 flex items-center gap-4">
            <div className="grid size-10 place-items-center rounded-full bg-emerald-100">
              <CheckCircle2 className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
                Latest Decision
              </p>
              <p className="font-semibold text-foreground">Fence Install Approved</p>
            </div>
          </div>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-surface">
            <div className="h-full w-full bg-emerald-500" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    {
      n: "01",
      icon: FileSignature,
      title: "Homeowner submits",
      desc: "A guided portal collects plans, paint swatches, surveys, and photos — no missing fields, no email back-and-forth.",
    },
    {
      n: "02",
      icon: MessagesSquare,
      title: "Committee reviews",
      desc: "Board members comment, request more info, and cast votes asynchronously from any device.",
    },
    {
      n: "03",
      icon: ShieldCheck,
      title: "Decision archived",
      desc: "An approval letter is generated automatically and the full audit trail is preserved for governance.",
    },
  ];

  return (
    <section id="workflow" className="border-y border-border bg-surface py-24">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            The workflow
          </p>
          <h2 className="font-display text-3xl font-bold text-brand md:text-4xl">
            From proposal to permit, in days — not weeks.
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-border bg-background p-8 shadow-sm"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="grid size-12 place-items-center rounded-xl bg-brand/5 text-brand">
                  <s.icon className="size-5" />
                </div>
                <span className="font-display text-sm font-bold text-muted-foreground/60">
                  {s.n}
                </span>
              </div>
              <h3 className="mb-3 font-display text-xl font-bold text-brand">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: ClipboardList,
      title: "Smart Submissions",
      desc: "A guided, mobile-friendly form makes sure every request arrives complete the first time.",
    },
    {
      icon: MessagesSquare,
      title: "Collaborative Voting",
      desc: "Centralized comment threads and digital ballots replace endless reply-all email chains.",
    },
    {
      icon: ShieldCheck,
      title: "Audit Trail",
      desc: "Every comment, vote, and decision is time-stamped and preserved for legal and governance needs.",
    },
    {
      icon: Bell,
      title: "Automated Notifications",
      desc: "Homeowners and board members stay in the loop at every stage — no manual updates required.",
    },
    {
      icon: FileSignature,
      title: "Approval Letters",
      desc: "Decision letters are generated automatically with all conditions and signatures attached.",
    },
    {
      icon: CheckCircle2,
      title: "Rule Library",
      desc: "Cross-reference each request against your community's CC&Rs and architectural guidelines.",
    },
  ];

  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Built for the work
          </p>
          <h2 className="font-display text-3xl font-bold text-brand md:text-4xl">
            Everything an ARC committee needs.
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-background p-8 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="mb-5 grid size-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <f.icon className="size-5" />
              </div>
              <h3 className="mb-2 font-display text-lg font-bold text-brand">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="bg-surface py-24">
      <div className="mx-auto max-w-4xl px-6 text-center md:px-8">
        <p className="font-display text-2xl font-medium leading-relaxed text-brand md:text-3xl">
          “The committee was drowning in email threads and lost PDF attachments. Ez-ARC
          brought order to our monthly meetings and cut our response time in half.”
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="size-10 rounded-full bg-brand/10 ring-1 ring-black/5" />
          <div className="text-left">
            <p className="text-sm font-semibold text-brand">Eleanor Vance</p>
            <p className="text-xs text-muted-foreground">
              Architectural Chair, Oak Creek Estates
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="pricing" className="px-6 py-24 md:px-8">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-brand p-12 text-center lg:p-20">
        <div className="absolute -right-32 -top-32 size-64 rounded-full bg-accent/30 blur-[100px]" />
        <div className="absolute -bottom-32 -left-32 size-64 rounded-full bg-emerald-500/15 blur-[100px]" />
        <div className="relative z-10">
          <h2 className="mb-6 font-display text-3xl font-bold text-brand-foreground lg:text-4xl">
            Ready to upgrade your HOA workflow?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-brand-foreground/70">
            Join hundreds of neighborhoods that have abandoned the spreadsheet and embraced
            Ez-ARC.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/auth"
              className="rounded-xl bg-brand-foreground px-10 py-4 font-bold text-brand shadow-xl transition-all hover:bg-brand-foreground/90"
            >
              Get started
            </Link>
            <Link
              to="/"
              className="rounded-xl border border-brand-foreground/20 bg-transparent px-10 py-4 font-bold text-brand-foreground transition-all hover:bg-brand-foreground/10"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <Logo />
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-brand">Privacy Policy</Link>
          <Link to="/" className="hover:text-brand">Terms of Service</Link>
          <Link to="/" className="hover:text-brand">Security</Link>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Ez-ARC Review.
        </p>
      </div>
    </footer>
  );
}

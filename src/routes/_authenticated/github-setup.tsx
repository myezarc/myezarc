import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Github,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Copy,
  ArrowRight,
  Terminal,
  RefreshCw,
  Plus,
  Settings,
  Link as LinkIcon,
  FileCode,
  GitBranch,
  GitPullRequest,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/github-setup")({
  head: () => ({ meta: [{ title: "GitHub Setup Walkthrough — Ez-ARC" }] }),
  component: GithubSetup,
});

const STEPS = [
  {
    id: "create-repo",
    title: "Create a GitHub repository",
    icon: Plus,
    content: <CreateRepoStep />,
  },
  {
    id: "connect-lovable",
    title: "Connect Lovable to your repo",
    icon: LinkIcon,
    content: <ConnectStep />,
  },
  {
    id: "verify-sync",
    title: "Verify pushes & pulls stay in sync",
    icon: RefreshCw,
    content: <VerifyStep />,
  },
];

function GithubSetup() {
  const [openStep, setOpenStep] = useState<string>("create-repo");
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggleStep = (id: string) => {
    setOpenStep((prev) => (prev === id ? "" : id));
  };

  const markComplete = (id: string) => {
    setCompleted((prev) => new Set(prev).add(id));
  };

  const allDone = completed.size === STEPS.length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Developer Guide</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-brand md:text-4xl">
          GitHub Setup Walkthrough
        </h1>
        <p className="mt-2 text-muted-foreground">
          Create a repo from scratch, connect it to Lovable, and confirm two-way sync.
        </p>
      </div>

      <div className="space-y-4">
        {STEPS.map((step) => {
          const isOpen = openStep === step.id;
          const isDone = completed.has(step.id);
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`rounded-2xl border transition-all ${
                isDone
                  ? "border-green-200 bg-green-50/50"
                  : isOpen
                  ? "border-accent/30 bg-surface shadow-sm"
                  : "border-border bg-background"
              }`}
            >
              <button
                onClick={() => toggleStep(step.id)}
                className="flex w-full items-center gap-4 px-6 py-5 text-left"
              >
                {isDone ? (
                  <CheckCircle2 className="size-6 shrink-0 text-green-600" />
                ) : (
                  <Circle className="size-6 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 font-display text-lg font-semibold text-brand">
                  {step.title}
                </span>
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                {isOpen ? (
                  <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-border px-6 pb-6 pt-2">
                  <div className="mt-2 text-foreground">{step.content}</div>
                  {!isDone && (
                    <button
                      onClick={() => markComplete(step.id)}
                      className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90"
                    >
                      <CheckCircle2 className="size-4" />
                      Mark as done
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-green-600" />
          <p className="mt-3 font-display text-xl font-bold text-green-900">
            You&apos;re all set!
          </p>
          <p className="mt-1 text-sm text-green-800">
            Your Lovable project is now connected to GitHub and syncing in both directions.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-800 px-5 py-2.5 text-sm font-semibold text-green-50 hover:opacity-90"
          >
            Back to Dashboard <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? "Copied!" : <Copy className="size-3" />}
    </button>
  );
}

function CodeBlock({ children, copyText }: { children: React.ReactNode; copyText?: string }) {
  return (
    <div className="relative mt-3 rounded-xl bg-[#0d1117] p-4 text-sm text-gray-300">
      {copyText && (
        <div className="absolute right-3 top-3">
          <CopyButton text={copyText} />
        </div>
      )}
      <pre className="overflow-x-auto font-mono leading-relaxed">{children}</pre>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
      {n}
    </span>
  );
}

function CreateRepoStep() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        If you don&apos;t already have a GitHub repository for this project, create one now.
      </p>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <StepNumber n={1} />
          <div>
            <p className="font-semibold text-brand">Go to GitHub and click New</p>
            <p className="text-sm text-muted-foreground">
              Visit{" "}
              <a
                href="https://github.com/new"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent underline underline-offset-2"
              >
                github.com/new
              </a>{" "}
              and sign in if needed.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <StepNumber n={2} />
          <div>
            <p className="font-semibold text-brand">Name your repository</p>
            <p className="text-sm text-muted-foreground">
              Pick a name like <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ez-arc-hoa</code>. You can keep it private or public.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <StepNumber n={3} />
          <div>
            <p className="font-semibold text-brand">Skip adding files for now</p>
            <p className="text-sm text-muted-foreground">
              Do <strong>not</strong> initialize with a README, .gitignore, or license. Lovable will push the full codebase once connected.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <StepNumber n={4} />
          <div>
            <p className="font-semibold text-brand">Create the repository</p>
            <p className="text-sm text-muted-foreground">
              Click <strong>Create repository</strong> and leave the page open — you&apos;ll copy the repo URL next.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectStep() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Link your Lovable project to the GitHub repo so changes flow in both directions.
      </p>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <StepNumber n={1} />
          <div>
            <p className="font-semibold text-brand">Open the GitHub menu in Lovable</p>
            <p className="text-sm text-muted-foreground">
              In the Lovable editor, click the <strong>+ menu</strong> in the chat input (bottom left) → <strong>GitHub</strong> → <strong>Connect project</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <StepNumber n={2} />
          <div>
            <p className="font-semibold text-brand">Authorize the Lovable GitHub App</p>
            <p className="text-sm text-muted-foreground">
              Grant access so Lovable can push code and read repo contents. Choose the account or organization that owns the repo.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <StepNumber n={3} />
          <div>
            <p className="font-semibold text-brand">Select your repository</p>
            <p className="text-sm text-muted-foreground">
              Choose the repo you just created. Lovable will perform an initial push of your entire project.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <StepNumber n={4} />
          <div>
            <p className="font-semibold text-brand">Confirm the connection</p>
            <p className="text-sm text-muted-foreground">
              You should see a success message. Your project code is now on GitHub.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Important note</p>
        <p className="mt-1 text-sm text-amber-800">
          Only <strong>one</strong> GitHub account can be connected to a Lovable account at a time. If you need to switch accounts, disconnect first.
        </p>
      </div>
    </div>
  );
}

function VerifyStep() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Test that edits in Lovable appear on GitHub, and edits in GitHub (or your local IDE) appear back in Lovable.
      </p>

      <div className="space-y-6">
        <div>
          <h4 className="flex items-center gap-2 font-display font-bold text-brand">
            <GitBranch className="size-4 text-accent" />
            Test 1 — Lovable → GitHub
          </h4>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Make a small change in the Lovable editor (e.g., edit this page text).</li>
            <li>Wait a few seconds for the auto-save and sync.</li>
            <li>Open your GitHub repo in a browser and check the commit history.</li>
            <li>You should see a new commit from Lovable with your change.</li>
          </ol>
        </div>

        <div>
          <h4 className="flex items-center gap-2 font-display font-bold text-brand">
            <GitPullRequest className="size-4 text-accent" />
            Test 2 — GitHub / Local IDE → Lovable
          </h4>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Clone the repo locally or edit a file directly on GitHub.</li>
            <li>Push your change to the default branch (usually <code className="rounded bg-muted px-1 py-0.5 text-xs">main</code>).</li>
            <li>Return to the Lovable editor — within seconds your change should appear.</li>
          </ol>
          <CodeBlock copyText="git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git">
            git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
            cd YOUR-REPO
          </CodeBlock>
        </div>

        <div>
          <h4 className="flex items-center gap-2 font-display font-bold text-brand">
            <Terminal className="size-4 text-accent" />
            Local development workflow
          </h4>
          <p className="mt-2 text-sm text-muted-foreground">
            You can work in Visual Studio (or any IDE) simultaneously with Lovable:
          </p>
          <CodeBlock
            copyText={`# Pull latest changes
git pull origin main

# Edit files in your IDE, then push back
git add .
git commit -m "my changes"
git push origin main`}
          >
{`# Pull latest changes
git pull origin main

# Edit files in your IDE, then push back
git add .
git commit -m "my changes"
git push origin main`}
          </CodeBlock>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-900">Expected behavior</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-green-800">
            <li>Lovable changes → appear on GitHub within seconds.</li>
            <li>GitHub pushes → appear in Lovable within seconds.</li>
            <li>No manual pulls or pushes are needed inside Lovable.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

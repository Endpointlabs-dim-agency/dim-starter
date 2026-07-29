export default function Home() {
  return (
    <main className="dark grid min-h-screen place-items-center bg-background p-8 text-center text-foreground">
      <div className="max-w-xl">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          Project kickoff
        </span>
        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          We&apos;re building something for you.
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Your project is underway. This page is live now and will update
          automatically as work ships — bookmark it and check back anytime.
        </p>
        <p className="mt-10 text-sm text-muted-foreground/70">
          Powered by{" "}
          <a
            href="https://endpointlabs.io"
            className="underline decoration-border underline-offset-4 hover:text-foreground"
          >
            EndpointLabs
          </a>
        </p>
      </div>
    </main>
  );
}

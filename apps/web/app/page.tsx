import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-6xl font-semibold lowercase tracking-tight text-ink">
        tadpole<span className="text-accent">.</span>
      </h1>
      <p className="max-w-md text-center text-lg text-ink/70">
        for dads — friendship, peer support, and local meet-ups. platonic, never dating.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-bg transition hover:bg-accent/90"
        >
          get started
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-ink/15 px-5 py-2 text-sm font-semibold text-ink transition hover:bg-ink/5"
        >
          sign in
        </Link>
      </div>
      <span className="text-xs text-ink/40">18+ only</span>
    </main>
  );
}

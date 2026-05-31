export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-6xl font-semibold lowercase tracking-tight text-ink">
        tadpole<span className="text-accent">.</span>
      </h1>
      <p className="max-w-md text-center text-lg text-ink/70">
        for dads — friendship, peer support, and local meet-ups. platonic, never
        dating.
      </p>
      <span className="rounded-full border border-ink/15 px-4 py-1 text-sm text-ink/60">
        phase 0 · scaffold
      </span>
    </main>
  );
}

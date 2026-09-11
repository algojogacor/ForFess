/** Skeleton loading untuk halaman arsip. */
export default function ArsipLoading() {
  return (
    <div className="bg-dotgrid">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="mb-10 flex flex-col gap-3">
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="h-10 w-64 animate-pulse rounded bg-muted" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              className="animate-pulse overflow-hidden rounded-2xl border-2 border-ink/20 bg-paper-raised"
            >
              <div className="aspect-square border-b-2 border-ink/10 bg-muted" />
              <div className="flex flex-col gap-2 p-4">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-4/5 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

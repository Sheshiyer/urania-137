export function FolioSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-card border border-gold/10 bg-void"
        >
          <div className="skeleton-sheen h-20 bg-gold/5" />
          <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
            <div className="skeleton-sheen h-4 w-3/4 rounded bg-gold/5" />
            <div className="skeleton-sheen h-3 w-1/2 rounded bg-gold/5" />
            <div className="mt-auto flex justify-between">
              <div className="skeleton-sheen h-3 w-16 rounded bg-gold/5" />
              <div className="skeleton-sheen h-3 w-20 rounded bg-gold/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

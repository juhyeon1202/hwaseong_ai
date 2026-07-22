export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-[var(--app-content-width)] px-4 py-8 sm:px-6"
      aria-label="페이지를 불러오는 중"
      aria-live="polite"
    >
      <div className="mb-8 flex items-center gap-3">
        <span className="size-6 animate-spin rounded-pill border-[3px] border-brand-soft border-t-brand" />

        <p className="text-sm font-semibold text-secondary">
          화면을 불러오고 있어요
        </p>
      </div>

      <div className="grid animate-pulse gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.7fr)]">
        <div className="space-y-6">
          <div className="h-8 w-56 rounded-control bg-line-light" />

          <div className="h-5 w-80 max-w-full rounded-control bg-line-light" />

          <div className="h-80 rounded-card bg-line-light" />

          <div className="grid grid-cols-3 gap-3">
            <div className="h-28 rounded-card bg-line-light" />
            <div className="h-28 rounded-card bg-line-light" />
            <div className="h-28 rounded-card bg-line-light" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-44 rounded-card bg-line-light" />
          <div className="h-60 rounded-card bg-line-light" />
        </div>
      </div>
    </div>
  );
}
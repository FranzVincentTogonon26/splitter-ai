export default function DashboardLoading() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 bg-card rounded-lg border animate-pulse" />
        <div className="h-32 bg-card rounded-lg border animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-56 bg-card rounded-lg border animate-pulse" />
          <div className="h-56 bg-card rounded-lg border animate-pulse" />
          <div className="h-56 bg-card rounded-lg border animate-pulse" />
        </div>
      </div>
    </div>
  );
}

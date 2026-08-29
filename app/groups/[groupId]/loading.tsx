export default function GroupLoading() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="mt-2 h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-16 bg-card rounded-lg border animate-pulse" />
          <div className="h-[500px] bg-card rounded-lg border animate-pulse" />
          <div className="h-64 bg-card rounded-lg border animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-72 bg-card rounded-lg border animate-pulse" />
          <div className="h-48 bg-card rounded-lg border animate-pulse" />
        </div>
      </div>
    </div>
  );
}
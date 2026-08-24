export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 animate-pulse rounded-md bg-background-elevated" />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-background-elevated" />
        <div className="h-40 animate-pulse rounded-xl bg-background-elevated" />
      </div>
      <div className="h-24 animate-pulse rounded-xl bg-background-elevated" />
    </div>
  );
}

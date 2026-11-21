export default function ReportLoading() {
  return (
    <main className="mx-auto w-full max-w-page px-xl py-4xl md:px-2xl">
      <div className="ui-fade-in overflow-hidden rounded-corner-lg border border-border-secondary bg-bg-faint">
        <div className="ui-skeleton h-16 w-full rounded-corner-sm" />
        <div className="grid gap-xl p-xl md:grid-cols-4">
          <div className="ui-skeleton hidden h-64 rounded-corner-md md:block" />
          <div className="flex flex-col gap-lg md:col-span-3">
            <div className="ui-skeleton h-4 w-40 rounded-corner-full" />
            <div className="ui-skeleton h-8 w-72 max-w-full rounded-corner-md" />
            <div className="ui-skeleton h-4 w-full rounded-corner-full" />
            <div className="ui-skeleton h-4 w-4/5 rounded-corner-full" />
            <div className="ui-skeleton mt-lg h-48 w-full rounded-corner-md" />
          </div>
        </div>
      </div>
    </main>
  );
}

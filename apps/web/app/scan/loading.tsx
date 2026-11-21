export default function ScanLoading() {
  return (
    <main className="mx-auto w-full max-w-article px-xl py-4xl md:px-2xl">
      <div className="ui-fade-in flex flex-col items-center gap-lg text-center">
        <div className="ui-skeleton h-4 w-24 rounded-corner-full" />
        <div className="ui-skeleton h-10 w-80 max-w-full rounded-corner-md" />
        <div className="ui-skeleton h-4 w-96 max-w-full rounded-corner-full" />
      </div>
      <div className="ui-fade-in mt-3xl rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl">
        <div className="ui-skeleton h-4 w-28 rounded-corner-full" />
        <div className="ui-skeleton mt-lg h-10 w-full rounded-corner-md" />
        <div className="ui-skeleton mt-lg h-9 w-32 rounded-corner-md" />
      </div>
    </main>
  );
}

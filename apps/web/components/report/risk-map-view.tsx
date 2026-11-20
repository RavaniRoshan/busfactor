import type { Report } from "../../lib/report-view";

export function RiskMapView({ report }: { report: Report }) {
  return (
    <section aria-labelledby="rw-risk-title">
      <p className="rw-eyebrow">RISK MAP</p>
      <h2 id="rw-risk-title" className="type-display mt-sm">
        Where a handoff breaks first
      </h2>
      <p className="mt-md text-text-secondary">
        Seven dimensions, scored by code. Lower bars mark where a new operator is most likely to get stuck.
      </p>

      {report.dimensions.length === 0 ? (
        <p className="mt-xl text-text-secondary">No dimensions were scored.</p>
      ) : (
        <ul className="mt-xl flex flex-col gap-lg">
          {report.dimensions.map((dimension) => (
            <li key={dimension.label} className="grid grid-cols-3 items-center gap-lg">
              <span className="text-label-sm text-text-secondary">{dimension.label}</span>
              <span
                className="rw-bar-track col-span-2"
                role="img"
                aria-label={`${dimension.label}: ${dimension.score} out of 100, ${dimension.findingCount} findings`}
              >
                <span
                  className={`rw-bar ${dimension.score < 50 ? "rw-bar-warning" : ""}`}
                  style={{ width: `${dimension.score}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

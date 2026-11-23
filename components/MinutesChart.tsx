/**
 * 14 days of practice minutes against the 20-minute daily target.
 * Single series (no legend), thin bars with rounded data-ends, a labelled target
 * line, per-bar hover/focus tooltips and a screen-reader table.
 */
export interface DayPoint {
  day: string;
  minutes: number;
  answers: number;
  correct: number;
  goal: boolean;
}

const fmt = (day: string) => new Date(day + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function MinutesChart({ data, target = 20 }: { data: DayPoint[]; target?: number }) {
  const max = Math.max(target * 1.25, ...data.map((d) => d.minutes));
  const h = 96;
  return (
    <figure>
      <div className="relative" style={{ height: h + 18 }}>
        <div className="absolute inset-x-0 border-t border-dashed border-ink-300/50" style={{ top: h - (target / max) * h }} aria-hidden="true">
          <span className="absolute -top-4 right-0 text-[10px] font-semibold text-ink-300">{target} min goal</span>
        </div>
        <div className="absolute inset-x-0 top-0 flex items-end gap-[2px]" style={{ height: h }}>
          {data.map((d) => {
            const barH = d.minutes > 0 ? Math.max(3, (d.minutes / max) * h) : 0;
            const tip = `${fmt(d.day)}: ${d.minutes} min, ${d.correct}/${d.answers} correct${d.goal ? ", goal met" : ""}`;
            return (
              <div key={d.day} tabIndex={0} aria-label={tip} className="group relative flex h-full flex-1 items-end justify-center outline-none">
                <div className="w-full max-w-[14px] rounded-t-[4px] bg-amber-400 group-hover:bg-amber-300 group-focus:bg-amber-300" style={{ height: barH, opacity: d.goal ? 1 : 0.6 }} />
                <div role="tooltip" className="pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max max-w-[11rem] rounded-lg bg-paper-50 px-2 py-1 text-xs font-semibold text-text shadow-[var(--shadow-lift)] group-hover:block group-focus:block">
                  {tip}
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute inset-x-0 border-t border-white/15" style={{ top: h }} aria-hidden="true" />
        <div className="absolute inset-x-0 flex justify-between text-[10px] text-ink-400" style={{ top: h + 4 }} aria-hidden="true">
          <span>{fmt(data[0].day)}</span>
          <span>Today</span>
        </div>
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>Minutes practised per day, last 14 days</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Minutes</th>
              <th>Correct answers</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <td>{fmt(d.day)}</td>
                <td>{d.minutes}</td>
                <td>
                  {d.correct}/{d.answers}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

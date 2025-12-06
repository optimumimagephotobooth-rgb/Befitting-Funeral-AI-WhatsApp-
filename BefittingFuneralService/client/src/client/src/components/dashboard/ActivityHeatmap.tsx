interface ActivityHeatmapProps {
  matrix: number[][];
  maxValue: number;
  labels: string[];
}

export function ActivityHeatmap({ matrix, maxValue, labels }: ActivityHeatmapProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <header>
        <h3 className="text-sm font-semibold text-slate-900">Weekly activity heatmap</h3>
        <p className="text-xs text-slate-500">Past 7 days · darker = more staff actions</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <tbody>
            {matrix.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className="pr-2 py-1 text-slate-500">{labels[rowIdx] ?? ''}</td>
                {row.map((value, colIdx) => {
                  const ratio = maxValue ? value / maxValue : 0;
                  const intensity = Math.round(60 + ratio * 140);
                  const bg = `rgba(94, 234, 212, ${ratio || 0.1})`;
                  return (
                    <td key={colIdx} className="p-0.5">
                      <div
                        className="h-4 w-4 rounded-sm border border-slate-100"
                        style={{ backgroundColor: bg }}
                        title={`${value} events at ${colIdx}:00`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


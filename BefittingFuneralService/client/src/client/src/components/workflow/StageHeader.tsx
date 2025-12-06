interface StageHeaderProps {
  stage: string;
  label: string;
  description: string;
  stages: string[];
}

export default function StageHeader({ stage, label, description, stages }: StageHeaderProps) {
  const currentIndex = stages.findIndex((item) => item === stage);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Current stage</p>
          <h4 className="text-lg font-semibold text-slate-900">
            {label}{' '}
            <span className="text-xs font-medium text-slate-400">
              ({stage})
            </span>
          </h4>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {stage}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {stages.map((item, index) => {
          const reached = index <= currentIndex;
          return (
            <span
              key={item}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                reached ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className="text-[10px] font-bold">{index + 1}</span>
              {item}
            </span>
          );
        })}
      </div>
    </div>
  );
}


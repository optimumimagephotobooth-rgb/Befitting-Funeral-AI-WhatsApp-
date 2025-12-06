import React from 'react';

type Module = {
  name: string;
  status: string;
  progress: number;
  role?: string;
};

type Progress = {
  modulesCompleted: number[];
  score: number;
};

type Props = {
  modules: Module[];
  progress: Progress | null;
};

export default function TrainingDashboard({ modules, progress }: Props) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Training Dashboard</h3>
        <button className="rounded-full border border-amber-500 px-3 py-1 text-xs uppercase text-amber-200">
          Sandbox Mode
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {modules.map((module) => (
          <div key={module.name} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{module.name}</p>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{module.role || 'general'}</p>
              </div>
              <span className="text-xs text-slate-400">{module.status}</span>
            </div>
            <div className="h-1 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${module.progress * 100}%` }}
              />
            </div>
            <button className="text-xs uppercase tracking-[0.3em] text-emerald-300 hover:text-emerald-100">
              Retry Lesson
            </button>
          </div>
        ))}
      </div>
      {progress && (
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-slate-400">
          Modules completed: {progress.modulesCompleted.length} · Score: {progress.score}
        </p>
      )}
    </section>
  );
}


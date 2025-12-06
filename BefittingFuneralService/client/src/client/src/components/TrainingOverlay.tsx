import React from 'react';

type Lesson = {
  lesson_title?: string;
  tip?: string;
  rationale?: string;
  sandbox_action?: string;
};

type Props = {
  lesson: Lesson | null;
};

export default function TrainingOverlay({ lesson }: Props) {
  if (!lesson) return null;
  return (
    <div className="fixed right-4 top-20 w-80 rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-2xl">
      <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Training Tip</p>
      <p className="mt-2 text-sm font-semibold text-white">{lesson.lesson_title}</p>
      <p className="mt-1 text-sm text-slate-200">{lesson.tip}</p>
      <p className="mt-2 text-xs text-slate-400">{lesson.rationale}</p>
      <button className="mt-3 rounded-full border border-emerald-500 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-emerald-200">
        Sandbox: {lesson.sandbox_action || 'Practice now'}
      </button>
    </div>
  );
}


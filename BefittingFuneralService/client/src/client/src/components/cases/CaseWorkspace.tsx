import type { ReactNode } from 'react';

interface CaseWorkspaceProps {
  children?: ReactNode;
}

export default function CaseWorkspace({ children }: CaseWorkspaceProps) {
  return (
    <main className="flex-1 overflow-y-auto bg-slate-900 px-6 py-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-4">{children}</div>
    </main>
  );
}


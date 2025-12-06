import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  staffRole?: string | null;
}

const baseNavItems = [
  { label: 'Home', view: 'home' },
  { label: 'Cases', view: 'cases' },
  { label: 'Inventory', view: 'inventory' },
  { label: 'Mortuary', view: 'mortuary' },
  { label: 'Cemetery', view: 'cemetery' },
  { label: 'Audit', view: 'audit' },
  { label: 'Leads', view: 'leads' },
  { label: 'Messages', view: 'messages' },
  { label: 'Announcements', view: 'announcements' }
];

export default function DashboardLayout({
  children,
  currentView,
  onNavigate,
  staffRole
}: DashboardLayoutProps) {
  const canSeeStaffNav = staffRole === 'admin';
  const canSeeStrategicNav = ['admin', 'coordinator', 'director'].includes(staffRole || '');
  const navItems = [...baseNavItems];
  if (canSeeStrategicNav) {
    navItems.splice(1, 0, { label: 'Forecast', view: 'forecast' });
    navItems.splice(2, 0, { label: 'Supervisor', view: 'supervisor' });
  }
  if (canSeeStaffNav) {
    navItems.push({ label: 'Templates', view: 'templates' });
    navItems.push({ label: 'Staff', view: 'staff' });
  }
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed top-0 left-0 h-full w-64 bg-slate-900 text-white flex flex-col">
        <div className="px-6 py-8 border-b border-slate-800">
          <p className="text-lg font-semibold tracking-wide">Befitting Staff</p>
          <p className="text-xs text-slate-300 mt-1">Dashboard</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full text-left px-3 py-2 rounded-lg transition ${
                currentView === item.view
                  ? 'bg-amber-500 text-slate-900 font-semibold'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-400">
          <p>Connected to Befitting Funeral Service backend</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Branding partner: PRAXION
          </p>
        </div>
      </aside>
      <main className="ml-64 min-h-screen pt-8 px-6 pb-12 max-w-6xl">
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}


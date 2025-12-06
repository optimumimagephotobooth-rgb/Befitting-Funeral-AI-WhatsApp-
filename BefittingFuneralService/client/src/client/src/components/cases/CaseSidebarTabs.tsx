interface SidebarTab {
  key: string;
  label: string;
  badge?: string;
}

interface CaseSidebarTabsProps {
  tabs: SidebarTab[];
  activeTab: string;
  onSelect: (tabKey: string) => void;
}

export default function CaseSidebarTabs({
  tabs,
  activeTab,
  onSelect
}: CaseSidebarTabsProps) {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-800 bg-slate-900/80 text-slate-200">
      <div className="px-4 py-5 text-xs uppercase tracking-[0.2em] text-slate-500">
        Case workspace
      </div>
      <nav className="flex-1 space-y-1 px-2 pb-6">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-[#D4AF37] text-slate-900 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isActive ? 'bg-slate-900 text-[#D4AF37]' : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}


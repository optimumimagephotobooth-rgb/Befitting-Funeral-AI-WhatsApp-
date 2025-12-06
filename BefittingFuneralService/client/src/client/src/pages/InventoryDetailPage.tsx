import { useEffect, useMemo, useState } from 'react';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_cost?: number | null;
  status?: string;
  metadata?: Record<string, any>;
  license_plate?: string | null;
  mileage?: number | null;
  last_service_date?: string | null;
}

interface InventoryDetailPageProps {
  item: InventoryItem | null;
  onSave?: (updates: Partial<InventoryItem>) => Promise<void>;
}

export default function InventoryDetailPage({ item, onSave }: InventoryDetailPageProps) {
  const [local, setLocal] = useState<Partial<InventoryItem>>({});
  const [aiAssist, setAiAssist] = useState('');

  useEffect(() => {
    if (!item) {
      setLocal({});
      return;
    }
    setLocal({
      quantity: item.quantity,
      unit_cost: item.unit_cost ?? 0,
      status: item.status,
      license_plate: item.license_plate || '',
      mileage: item.mileage ?? 0,
      last_service_date: item.last_service_date || '',
      metadata: item.metadata
    });
  }, [item]);

  const handleAiAssist = () => {
    if (!item) return;
    const suggestion = `Prepare ${item.name} (${item.category.toLowerCase()}) with ${item.quantity} reserved unit(s) for upcoming events. Check service history and ensure clean setup.`;
    setAiAssist(suggestion);
    setLocal((prev) => ({
      ...prev,
      metadata: {
        ...item.metadata,
        ai_note: suggestion
      }
    }));
  };

  const canSave = Boolean(item && onSave);
  const summary = useMemo(() => {
    if (!item) return '';
    return `${item.quantity ?? 0} unit(s) on hand · ${item.status || 'ACTIVE'}`;
  }, [item]);

  const handleSave = async () => {
    if (!item || !onSave) return;
    await onSave({
      quantity: Number(local.quantity ?? item.quantity),
      unit_cost: Number(local.unit_cost ?? item.unit_cost ?? 0),
      status: local.status,
      license_plate: local.license_plate,
      mileage: Number(local.mileage ?? item.mileage ?? 0),
      last_service_date: local.last_service_date,
      metadata: local.metadata
    });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Inventory detail</p>
      {!item ? (
        <p className="mt-3 text-xs text-slate-400">Select an item to view details.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-lg font-semibold text-white">{item.name}</p>
            <p className="text-[11px] text-slate-400">
              {item.category} · {summary}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 uppercase tracking-[0.3em]">Quantity</label>
            <input
              type="number"
              value={local.quantity ?? item.quantity}
              onChange={(event) => setLocal((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
              className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 uppercase tracking-[0.3em]">Unit cost (GHS)</label>
            <input
              type="number"
              value={local.unit_cost ?? item.unit_cost ?? 0}
              onChange={(event) => setLocal((prev) => ({ ...prev, unit_cost: Number(event.target.value) }))}
              className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 uppercase tracking-[0.3em]">Status</label>
            <input
              type="text"
              value={local.status ?? item.status ?? 'ACTIVE'}
              onChange={(event) => setLocal((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 uppercase tracking-[0.3em]">AI Assist</label>
            <p className="text-[11px] text-slate-400">{aiAssist || 'Enable AI Assist to get guidance for this asset.'}</p>
            <button
              type="button"
              onClick={handleAiAssist}
              className="rounded-full border border-emerald-400 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200 hover:bg-emerald-500/20"
            >
              Generate AI Assist
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 rounded-md border border-emerald-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


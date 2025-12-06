import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InventoryItem } from './InventoryDetailPage';
import InventoryDetailPage from './InventoryDetailPage';
import {
  fetchInventoryAlerts,
  fetchInventoryItems,
  createInventoryItem,
  updateInventoryItem
} from '../services/api';

const defaultFormState = {
  name: '',
  category: '',
  quantity: 1,
  unit_cost: 0
};

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultFormState);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const inventoryQuery = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => fetchInventoryItems(),
    staleTime: 1000 * 60
  });
  const alertsQuery = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => fetchInventoryAlerts(),
    staleTime: 1000 * 60
  });

  const itemsList = (inventoryQuery.data?.data || []) as InventoryItem[];
  const alertsPayload = alertsQuery.data?.data || { lowStock: [], overdue: [] };

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      category: string;
      quantity?: number;
      unit_cost?: number;
    }) => createInventoryItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setForm(defaultFormState);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; updates: Partial<InventoryItem> }) =>
      updateInventoryItem(payload.id, payload.updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
  });

  const selectedItem = useMemo(
    () => itemsList.find((item) => item.id === selectedItemId) ?? null,
    [itemsList, selectedItemId]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.category.trim()) return;
    await createMutation.mutateAsync(form);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Low stock alerts</p>
          {alertsQuery.isLoading ? (
            <p className="mt-2 text-xs text-slate-400">Loading alerts…</p>
          ) : alertsPayload.lowStock.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No low stock warnings.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {alertsPayload.lowStock.map((item: InventoryItem) => (
                <li key={item.id} className="flex items-center justify-between rounded-xl border border-rose-500/50 bg-rose-950/30 px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold text-rose-200">{item.name}</p>
                    <p className="text-rose-400">Stock · {item.quantity}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-rose-200">Low</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Add new asset</p>
          <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Item name"
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs"
            />
            <input
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="Category"
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={form.quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
                placeholder="Quantity"
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs"
              />
              <input
                type="number"
                value={form.unit_cost}
                onChange={(event) => setForm((prev) => ({ ...prev, unit_cost: Number(event.target.value) }))}
                placeholder="Unit cost"
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={createMutation.status === 'loading'}
              className="w-full rounded-full border border-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {createMutation.status === 'loading' ? 'Creating…' : 'Create asset'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Inventory library</p>
              <span className="text-[10px] text-slate-400">{itemsList.length} items tracked</span>
            </div>
            <div className="mt-3 space-y-3">
              {inventoryQuery.isLoading ? (
                <p className="text-xs text-slate-400">Loading inventory…</p>
              ) : (
                itemsList.map((item: InventoryItem) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2 transition ${
                      selectedItemId === item.id
                        ? 'border-emerald-500 bg-emerald-900/20'
                        : 'border-slate-800 bg-slate-950/60 hover:border-emerald-400'
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <p className="text-[11px] text-slate-400">
                      {item.category} · {item.quantity} unit(s)
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-5">
          <InventoryDetailPage
            item={selectedItem}
            onSave={(updates) => {
              if (!selectedItem) return Promise.resolve();
              return updateMutation
                .mutateAsync({ id: selectedItem.id, updates })
                .then(() => undefined);
            }}
          />
        </div>
      </div>
    </div>
  );
}


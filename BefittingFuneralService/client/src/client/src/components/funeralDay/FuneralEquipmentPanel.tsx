import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  allocateEquipment,
  fetchEquipment,
  fetchEquipmentAllocations,
  generateEquipmentAllocationPdf,
  returnEquipment
} from '../../services/api';

type EquipmentOption = {
  id: string;
  name: string;
  category: string;
  subtype?: string;
  condition_status?: string;
  is_available?: boolean;
};

type AssignmentPanelProps = {
  caseId: string;
  staffId?: string;
};

export default function FuneralEquipmentPanel({ caseId, staffId }: AssignmentPanelProps) {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState(staffId || '');

  const equipmentQuery = useQuery({
    queryKey: ['equipment', 'available'],
    queryFn: () => fetchEquipment({ category: 'equipment', onlyAvailable: true }),
    staleTime: 1000 * 60 * 2
  });

  const allocationsQuery = useQuery({
    queryKey: ['equipment-allocations', caseId],
    queryFn: () => fetchEquipmentAllocations(caseId),
    enabled: !!caseId,
    staleTime: 1000 * 60 * 2
  });

  const allocationMutation = useMutation({
    mutationFn: (payload: Parameters<typeof allocateEquipment>[0]) => allocateEquipment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-allocations', caseId] });
      setNotes('');
      setSelectedItem(null);
    }
  });

  const returnMutation = useMutation({
    mutationFn: (payload: Parameters<typeof returnEquipment>[0]) => returnEquipment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-allocations', caseId] });
    }
  });

  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const downloadBase64Pdf = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleAllocationPdf = async (allocationId: string) => {
    try {
      setPdfError(null);
      setPdfLoadingId(allocationId);
      const pdf = await generateEquipmentAllocationPdf(allocationId);
      downloadBase64Pdf(pdf, `equipment-allocation-${allocationId}.pdf`);
    } catch (error) {
      setPdfError('Unable to generate allocation form.');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleAllocate = async () => {
    if (!selectedItem) return;
    await allocationMutation.mutateAsync({
      itemId: selectedItem,
      caseId,
      staffId,
      notes: notes.trim()
    });
  };

  const handleReturn = async (allocationId: string) => {
    await returnMutation.mutateAsync({ allocationId, status: 'returned' });
  };

  const availableEquipment = useMemo(
    () =>
      (equipmentQuery.data as EquipmentOption[] | undefined)?.filter((item) => item.is_available) || [],
    [equipmentQuery.data]
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Equipment & allocations</p>
        <button
          type="button"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
            queryClient.invalidateQueries({ queryKey: ['equipment-allocations', caseId] });
          }}
          className="text-[10px] uppercase tracking-[0.4em] text-slate-400 hover:text-white"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Available equipment</p>
          <div className="mt-3 space-y-2">
            {equipmentQuery.isLoading ? (
              <p className="text-[12px] text-slate-500">Fetching available equipment…</p>
            ) : !availableEquipment.length ? (
              <p className="text-[12px] text-slate-500">No equipment currently available.</p>
            ) : (
              availableEquipment.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selectedItem === item.id
                      ? 'border-emerald-400 bg-emerald-500/20'
                      : 'border-slate-800 bg-slate-950/40 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{item.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.3em]">
                      {item.subtype || 'general'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Condition: {item.condition_status || 'N/A'}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>
        <section className="lg:col-span-1 space-y-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Allocate</p>
          <p className="text-sm font-semibold text-white">
            {selectedItem
              ? availableEquipment.find((item) => item.id === selectedItem)?.name ?? 'Selected item'
              : 'Select equipment'}
          </p>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            rows={3}
          />
          <button
            type="button"
            onClick={handleAllocate}
            disabled={!selectedItem || allocationMutation.isLoading}
            className="w-full rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-50"
          >
            {allocationMutation.isLoading ? 'Allocating…' : 'Assign equipment'}
          </button>
          {allocationMutation.isError && (
            <p className="text-[11px] text-rose-300">
              {(allocationMutation.error as Error)?.message || 'Unable to allocate.'}
            </p>
          )}
        </section>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-200">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Allocations</p>
          <span className="text-[10px] text-slate-400">
            {allocationsQuery.data?.length ?? 0} active
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {allocationsQuery.isLoading ? (
            <p className="text-xs text-slate-500">Loading allocations…</p>
          ) : !allocationsQuery.data?.length ? (
            <p className="text-xs text-slate-500">No equipment allocated yet.</p>
          ) : (
            allocationsQuery.data.map((allocation: any) => (
              <div
                key={allocation.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-[11px]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{allocation.equipment_name}</p>
                    <p className="text-slate-400">
                      {allocation.subtype || allocation.category} · {allocation.status}
                    </p>
                  </div>
                  <span className="text-xs text-emerald-300">
                    {allocation.assigned_from && new Date(allocation.assigned_from).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[10px] text-slate-400">
                    {allocation.notes || 'No notes provided'} · Condition: {allocation.return_condition || 'N/A'}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleReturn(allocation.id)}
                    disabled={returnMutation.isLoading}
                    className="rounded-full border border-slate-600 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-emerald-400 disabled:opacity-50"
                  >
                    Return
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAllocationPdf(allocation.id)}
                    disabled={pdfLoadingId === allocation.id}
                    className="rounded-full border border-amber-500 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-200 transition hover:border-amber-400 disabled:opacity-50"
                  >
                    {pdfLoadingId === allocation.id ? 'Generating…' : 'Download form'}
                  </button>
                </div>
              </div>
            ))
          )}
          {returnMutation.isError && (
            <p className="text-xs text-rose-300">{(returnMutation.error as Error)?.message}</p>
          )}
        {pdfError && <p className="text-xs text-rose-300">{pdfError}</p>}
        </div>
      </div>
    </div>
  );
}


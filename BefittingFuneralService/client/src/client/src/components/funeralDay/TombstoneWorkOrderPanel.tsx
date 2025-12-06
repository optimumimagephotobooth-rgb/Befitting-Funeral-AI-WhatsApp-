import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTombstoneVendor,
  createTombstoneWorkOrder,
  fetchTombstoneVendors,
  fetchTombstoneWorkOrders,
  generateTombstoneWorkOrderCertificate,
  generateWorkOrderPdf,
  getTombstoneWorkOrderCertificateUrl,
  updateTombstoneWorkOrderStatus
} from '../../services/api';

type TombstoneWorkOrderPanelProps = {
  caseId: string;
};

const STATUS_TITLES: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed'
};

export default function TombstoneWorkOrderPanel({ caseId }: TombstoneWorkOrderPanelProps) {
  const queryClient = useQueryClient();
  const [vendorId, setVendorId] = useState<string>('');
  const [vendorName, setVendorName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [attachments, setAttachments] = useState('');
  const [notes, setNotes] = useState('');

  const vendorsQuery = useQuery({
    queryKey: ['tombstone-vendors'],
    queryFn: fetchTombstoneVendors,
    staleTime: 1000 * 60 * 5
  });

  const workOrdersQuery = useQuery({
    queryKey: ['tombstone-work-orders', caseId],
    queryFn: () => fetchTombstoneWorkOrders(caseId),
    enabled: !!caseId,
    staleTime: 1000 * 60 * 3
  });

  const workOrderMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createTombstoneWorkOrder>[0]) =>
      createTombstoneWorkOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tombstone-work-orders', caseId] });
      setScheduledDate('');
      setNotes('');
      setAttachments('');
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTombstoneWorkOrderStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tombstone-work-orders', caseId] });
    }
  });

  const vendorMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createTombstoneVendor>[0]) =>
      createTombstoneVendor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tombstone-vendors'] });
      setVendorName('');
    }
  });

  const certificateMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: string }) =>
      generateTombstoneWorkOrderCertificate(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tombstone-work-orders', caseId] });
    }
  });

  const handleCreate = async () => {
    if (!caseId || !vendorId) return;
    const attachmentList = attachments
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);
    await workOrderMutation.mutateAsync({
      caseId,
      vendorId,
      scheduledDate: scheduledDate || undefined,
      attachments: attachmentList,
      notes
    });
  };

  const handleStatusChange = async (id: string, status: string) => {
    await statusMutation.mutateAsync({ id, status });
  };

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

  const handleDownloadPdf = async (orderId: string) => {
    try {
      setPdfError(null);
      setPdfLoadingId(orderId);
      const pdf = await generateWorkOrderPdf(orderId);
      downloadBase64Pdf(pdf, `tombstone-work-order-${orderId}.pdf`);
    } catch (error) {
      setPdfError('Failed to generate work order PDF.');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const vendorOptions = useMemo(() => vendorsQuery.data || [], [vendorsQuery.data]);

  const workOrders = useMemo(() => workOrdersQuery.data || [], [workOrdersQuery.data]);

  const primaryVendorId = vendorOptions[0]?.id || '';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Tombstone installation</p>
        <span className="text-[10px] text-slate-400">
          {workOrders.length} work order{workOrders.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Plan installation</p>
          <div className="space-y-2 text-xs text-slate-300">
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Vendor
              <select
                value={vendorId || primaryVendorId}
                onChange={(event) => setVendorId(event.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              >
                <option value="">Select tombstone vendor</option>
                {vendorOptions.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Scheduled date
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(event) => setScheduledDate(event.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Attachments (comma-separated URLs)
              <input
                type="text"
                value={attachments}
                onChange={(event) => setAttachments(event.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </label>
            <button
              type="button"
              disabled={workOrderMutation.isLoading || !vendorId}
              onClick={handleCreate}
              className="w-full rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-50"
            >
              {workOrderMutation.isLoading ? 'Scheduling…' : 'Save work order'}
            </button>
            {workOrderMutation.isError && (
              <p className="text-[11px] text-rose-300">
                {(workOrderMutation.error as Error)?.message || 'Unable to create work order.'}
              </p>
            )}
          </div>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Add vendor</p>
          <input
            value={vendorName}
            onChange={(event) => setVendorName(event.target.value)}
            placeholder="Vendor name"
            className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={() => vendorMutation.mutateAsync({ name: vendorName })}
            disabled={!vendorName.trim() || vendorMutation.isLoading}
            className="mt-3 w-full rounded-full border border-emerald-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-700/30 disabled:opacity-50"
          >
            {vendorMutation.isLoading ? 'Adding vendor…' : 'Register vendor'}
          </button>
        </section>
      </div>

      <div className="mt-6 space-y-3">
        {workOrders.length ? (
          workOrders.map((order: any) => (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Work order</p>
                  <p className="text-lg font-semibold text-white">{order.type}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] ${
                    order.status === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : order.status === 'delayed'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  {STATUS_TITLES[order.status] || order.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Vendor: {order.vendor_name || 'Not assigned'} · Scheduled{' '}
                {order.scheduled_date ? new Date(order.scheduled_date).toLocaleString() : 'TBD'}
              </p>
              {order.notes && <p className="text-[11px] text-slate-400 mt-1">{order.notes}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {['scheduled', 'in_progress', 'delayed', 'completed'].map((status) => (
                  <button
                    key={`${order.id}-${status}`}
                    type="button"
                    onClick={() => handleStatusChange(order.id, status)}
                    disabled={statusMutation.isLoading || order.status === status}
                    className="rounded-full border border-slate-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-emerald-400 disabled:opacity-50"
                  >
                    {STATUS_TITLES[status]}
                  </button>
                ))}
              </div>
              {order.attachments?.length ? (
                <div className="mt-3 grid gap-2 text-[11px] text-slate-400">
                  {order.attachments.map((attachment: string, idx: number) => (
                    <a
                      key={`${order.id}-attach-${idx}`}
                      href={attachment}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-1 text-emerald-300 hover:text-emerald-200"
                    >
                      Attachment {idx + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-slate-500">No attachments uploaded.</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => certificateMutation.mutate({ orderId: order.id })}
                  disabled={certificateMutation.isLoading}
                  className="rounded-full border border-emerald-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-700/20 disabled:opacity-50"
                >
                  {order.certificate_url
                    ? certificateMutation.isLoading
                      ? 'Updating…'
                      : 'Regenerate certificate'
                    : certificateMutation.isLoading
                    ? 'Generating…'
                    : 'Generate certificate'}
                </button>
                {order.certificate_url && (
                  <a
                    href={getTombstoneWorkOrderCertificateUrl(order.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-slate-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-emerald-400"
                  >
                    Download certificate
                  </a>
                )}
              </div>
              {certificateMutation.isError && (
                <p className="mt-2 text-[11px] text-rose-300">
                  {(certificateMutation.error as Error)?.message || 'Certificate generation failed.'}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(order.id)}
                  disabled={pdfLoadingId === order.id}
                  className="rounded-full border border-amber-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-200 transition hover:bg-amber-700/20 disabled:opacity-50"
                >
                  {pdfLoadingId === order.id ? 'Generating PDF…' : 'Download work order PDF'}
                </button>
              </div>
              {pdfError && (
                <p className="mt-2 text-[11px] text-rose-300">{pdfError}</p>
              )}
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-xs text-slate-500">
            Tombstone installations will appear here once scheduled.
          </p>
        )}
      </div>
    </div>
  );
}


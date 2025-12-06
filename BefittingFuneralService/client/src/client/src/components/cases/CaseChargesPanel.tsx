import { useEffect, useMemo, useState } from 'react';
import { CaseCharge, createCaseCharge, deleteCaseCharge, updateCaseCharge } from '../../services/documents';

interface CaseChargesPanelProps {
  caseId: string;
  canManage: boolean;
  initialCharges?: CaseCharge[];
  loading?: boolean;
  onRefresh?: () => void;
}

const emptyForm = {
  id: '',
  description: '',
  amount: '',
  quantity: '1',
  category: ''
};

export default function CaseChargesPanel({
  caseId,
  canManage,
  initialCharges = [],
  loading,
  onRefresh
}: CaseChargesPanelProps) {
  const [charges, setCharges] = useState<CaseCharge[]>(initialCharges);
  const [error, setError] = useState<string | null>(null);
  const [chargeForm, setChargeForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const subtotal = useMemo(
    () => charges.reduce((total, charge) => total + (charge.amount || 0) * (charge.quantity || 1), 0),
    [charges]
  );

  const refreshCharges = (records: CaseCharge[]) => {
    setCharges(records);
    onRefresh?.();
  };

  useEffect(() => {
    setCharges(initialCharges);
  }, [initialCharges]);

  const handleSubmit = async () => {
    if (!chargeForm.description.trim()) {
      setError('Description is required.');
      return;
    }
    const amount = parseFloat(chargeForm.amount);
    if (Number.isNaN(amount)) {
      setError('Valid amount is required.');
      return;
    }
    const quantity = Math.max(1, parseInt(chargeForm.quantity, 10) || 1);
    setBusy(true);
    setError(null);
    try {
      const payload = {
        description: chargeForm.description.trim(),
        amount,
        quantity,
        category: chargeForm.category || undefined
      };
      let updatedList: CaseCharge[];
      if (chargeForm.id) {
        const updated = await updateCaseCharge(caseId, chargeForm.id, payload);
        updatedList = charges.map((c) => (c.id === updated.id ? updated : c));
      } else {
        const created = await createCaseCharge(caseId, payload);
        updatedList = [created, ...charges];
      }
      setChargeForm(emptyForm);
      refreshCharges(updatedList);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to save charge.');
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (charge: CaseCharge) => {
    setChargeForm({
      id: charge.id,
      description: charge.description,
      amount: String(charge.amount ?? ''),
      quantity: String(charge.quantity ?? 1),
      category: charge.category || ''
    });
  };

  const handleDelete = async (chargeId: string) => {
    if (!window.confirm('Remove this charge?')) return;
    setBusy(true);
    try {
      await deleteCaseCharge(caseId, chargeId);
      refreshCharges(charges.filter((c) => c.id !== chargeId));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to delete charge.');
    } finally {
      setBusy(false);
    }
  };

  if (loading && charges.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Loading charges…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h4 className="text-base font-semibold text-slate-900">Charges</h4>
        <p className="text-xs text-slate-500">
          Track line items that flow into estimates and invoices for this case.
        </p>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </header>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 text-sm text-slate-600">
            Description
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              value={chargeForm.description}
              onChange={(event) =>
                setChargeForm((prev) => ({ ...prev, description: event.target.value }))
              }
              disabled={!canManage || busy}
            />
          </label>
          <label className="text-sm text-slate-600">
            Amount (GHS)
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              value={chargeForm.amount}
              onChange={(event) =>
                setChargeForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              disabled={!canManage || busy}
            />
          </label>
          <label className="text-sm text-slate-600">
            Qty
            <input
              type="number"
              min={1}
              className="mt-1 w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              value={chargeForm.quantity}
              onChange={(event) =>
                setChargeForm((prev) => ({ ...prev, quantity: event.target.value }))
              }
              disabled={!canManage || busy}
            />
          </label>
          <label className="text-sm text-slate-600">
            Category
            <input
              type="text"
              className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              value={chargeForm.category}
              onChange={(event) =>
                setChargeForm((prev) => ({ ...prev, category: event.target.value }))
              }
              disabled={!canManage || busy}
            />
          </label>
          <button
            onClick={handleSubmit}
            disabled={!canManage || busy}
            className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {chargeForm.id ? 'Update charge' : 'Add charge'}
          </button>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-right">Quantity</th>
              <th className="px-3 py-2 text-right">Line total</th>
              {canManage && <th className="px-3 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {charges.length === 0 ? (
              <tr>
                <td className="px-3 py-2 text-sm text-slate-500" colSpan={canManage ? 6 : 5}>
                  No charges added yet.
                </td>
              </tr>
            ) : (
              charges.map((charge) => (
                <tr key={charge.id}>
                  <td className="px-3 py-2">{charge.description}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{charge.category || '—'}</td>
                  <td className="px-3 py-2 text-right">{charge.amount.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{charge.quantity}</td>
                  <td className="px-3 py-2 text-right">
                    {(charge.amount * (charge.quantity || 1)).toFixed(2)}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2 text-right text-xs text-amber-700">
                      <button className="mr-2 hover:text-amber-500" onClick={() => handleEdit(charge)}>
                        Edit
                      </button>
                      <button
                        className="text-rose-600 hover:text-rose-500"
                        onClick={() => handleDelete(charge.id)}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 text-sm font-semibold text-slate-900">
              <td className="px-3 py-2" colSpan={4}>
                Charges subtotal
              </td>
              <td className="px-3 py-2 text-right">GHS {subtotal.toFixed(2)}</td>
              {canManage && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}


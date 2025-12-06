import { FormEvent, useState } from 'react';
import type { FamilyPayments } from '../types';

type PaymentsPageProps = {
  payments: FamilyPayments | null;
  onUploadReceipt: (payload: { amount: number; reference?: string; file_url: string }) => Promise<void>;
  loading?: boolean;
  error?: string;
};

export default function PaymentsPage({ payments, onUploadReceipt, loading, error }: PaymentsPageProps) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!fileUrl.trim() || Number.isNaN(numericAmount)) {
      return;
    }
    await onUploadReceipt({
      amount: numericAmount,
      reference: reference.trim() || undefined,
      file_url: fileUrl.trim()
    });
    setAmount('');
    setReference('');
    setFileUrl('');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Outstanding balance</p>
        <p className="mt-2 text-3xl font-semibold text-white">
          ₵ {(payments?.outstandingBalance ?? 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-slate-400">{payments?.charges.length ?? 0} pending charges</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Upload proof of payment</p>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <form onSubmit={handleUpload} className="mt-4 space-y-3">
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount (GHS)"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
          />
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Reference (optional)"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
          />
          <input
            value={fileUrl}
            onChange={(event) => setFileUrl(event.target.value)}
            placeholder="Receipt URL"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Uploading…' : 'Share proof'}
          </button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Charges</p>
          <div className="mt-4 space-y-3">
            {payments?.charges.length ? (
              payments.charges.map((charge) => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-white">{charge.description}</p>
                    <p className="text-xs text-slate-500">{charge.status}</p>
                  </div>
                  <p className="font-semibold text-white">
                    ₵ {charge.amount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No charges yet.</p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Uploaded receipts</p>
          <div className="mt-4 space-y-3">
            {payments?.uploads.length ? (
              payments.uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-white">
                      Receipt · ₵ {upload.amount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500">{upload.status}</p>
                  </div>
                  {upload.file_url ? (
                    <a
                      href={upload.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300 transition hover:text-emerald-200"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                      no link
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No receipts uploaded yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}


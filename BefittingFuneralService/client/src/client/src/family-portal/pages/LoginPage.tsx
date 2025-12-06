import { FormEvent, useState } from 'react';

type LoginPageProps = {
  step: 'request' | 'verify';
  loading?: boolean;
  error?: string;
  otpHint?: string;
  pendingCaseRef?: string;
  onRequestOtp: (payload: { caseRef: string; phone?: string; email?: string }) => Promise<void>;
  onVerifyOtp: (otp: string) => Promise<void>;
  onReset?: () => void;
};

export default function LoginPage({
  step,
  loading,
  error,
  otpHint,
  pendingCaseRef,
  onRequestOtp,
  onVerifyOtp,
  onReset
}: LoginPageProps) {
  const [caseRef, setCaseRef] = useState(pendingCaseRef || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!caseRef.trim()) {
      return;
    }
    await onRequestOtp({
      caseRef: caseRef.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined
    });
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!otp.trim()) {
      return;
    }
    await onVerifyOtp(otp.trim());
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4">
      <div className="w-full max-w-3xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-900/40 backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">Praxion Family Portal</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Secure case access</h1>
          <p className="text-sm text-slate-400">
            Use your case reference to request a one-time passcode. Your OTP stays valid for 48 hours.
          </p>
        </div>
        {error && (
          <div className="rounded-lg bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200">
            {error}
          </div>
        )}
        {step === 'request' && (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Case reference
              </label>
              <input
                type="text"
                value={caseRef}
                onChange={(event) => setCaseRef(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                placeholder="e.g. PRAX-45-002"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Phone (optional)
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="020 123 4567"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Email (optional)
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="family@domain.com"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? 'Sending OTP…' : 'Request OTP'}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <p className="text-sm text-slate-400">
                OTP sent to the details on file for <span className="font-semibold text-white">{pendingCaseRef}</span>.
              </p>
              {otpHint && <p className="text-xs text-slate-500">{otpHint}</p>}
            </div>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Enter OTP
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                placeholder="123456"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? 'Verifying…' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={onReset}
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


import { FormEvent, useState } from 'react';

interface LoginPageProps {
  onLogin: (credentials: { phone: string; password: string }) => void;
  loading?: boolean;
  mfaPending?: { staffId: string; otpHint?: string };
  onVerifyOtp: (code: string) => void;
  mfaLoading?: boolean;
  mfaError?: string;
}

export default function LoginPage({
  onLogin,
  loading,
  mfaPending,
  onVerifyOtp,
  mfaLoading,
  mfaError
}: LoginPageProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onLogin({ phone, password });
  };

  const handleVerify = (event: FormEvent) => {
    event.preventDefault();
    if (!otp.trim()) return;
    onVerifyOtp(otp.trim());
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
      <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-semibold mb-6 text-center">Befitting Funeral Staff Login</h1>
        {!mfaPending ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col text-sm font-medium text-slate-200">
              Email or phone
              <input
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 focus:border-amber-300 focus:outline-none"
                required
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-200">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 focus:border-amber-300 focus:outline-none"
                required
              />
            </label>
            <button
              type="submit"
              className="w-full py-2 rounded-md bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400 transition"
              disabled={loading}
            >
              {loading ? 'Authenticating…' : 'Continue to Dashboard'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-slate-300">
              Enter the OTP sent to the staff contact. {mfaPending.otpHint && <span>{mfaPending.otpHint}</span>}
            </p>
            {mfaError && <p className="text-xs text-rose-300">{mfaError}</p>}
            <label className="flex flex-col text-sm font-medium text-slate-200">
              One-time code
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="mt-1 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 focus:border-amber-300 focus:outline-none"
                required
              />
            </label>
            <button
              type="submit"
              className="w-full py-2 rounded-md bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 transition"
              disabled={mfaLoading}
            >
              {mfaLoading ? 'Verifying…' : 'Verify OTP'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}


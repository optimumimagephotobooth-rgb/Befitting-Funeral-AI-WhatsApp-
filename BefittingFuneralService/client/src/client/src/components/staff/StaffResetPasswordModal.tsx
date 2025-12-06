import { useEffect, useState } from 'react';
import { StaffRecord } from '../../services/staff';

interface StaffResetPasswordModalProps {
  open: boolean;
  staff: StaffRecord | null;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onReset: (staffId: string, newPassword: string) => Promise<void>;
}

function buildTempPassword() {
  return `BFS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export default function StaffResetPasswordModal({ open, staff, loading, error, onClose, onReset }: StaffResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState(buildTempPassword());

  useEffect(() => {
    if (open) {
      setNewPassword(buildTempPassword());
    }
  }, [open]);

  const handleSubmit = () => {
    if (!staff || loading) return;
    onReset(staff.id, newPassword);
  };

  if (!open || !staff) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-40 z-20 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Reset password for {staff.name}</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            Close
          </button>
        </div>
        <p className="text-sm text-slate-500">
          A new temporary password will be generated. Share it securely with the staff member.
        </p>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Temporary password</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setNewPassword(buildTempPassword())}
              className="text-slate-600 text-xs font-semibold"
              disabled={loading}
            >
              Regenerate
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 text-xs font-semibold hover:text-slate-900"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-amber-400 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </div>
      </div>
    </div>
  );
}


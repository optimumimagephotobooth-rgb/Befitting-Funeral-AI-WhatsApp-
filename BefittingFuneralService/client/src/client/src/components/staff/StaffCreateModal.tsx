import { FormEvent, useEffect, useState } from 'react';
import { CreateStaffPayload, STAFF_ROLES } from '../../services/staff';

interface StaffCreateModalProps {
  open: boolean;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onCreate: (payload: CreateStaffPayload) => Promise<void>;
}

export default function StaffCreateModal({ open, loading, error, onClose, onCreate }: StaffCreateModalProps) {
  const [formValues, setFormValues] = useState<CreateStaffPayload>({
    name: '',
    phone: '',
    email: '',
    role: 'agent',
    password: ''
  });

  useEffect(() => {
    if (!open) {
      setFormValues({
        name: '',
        phone: '',
        email: '',
        role: 'agent',
        password: ''
      });
    }
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    onCreate(formValues);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-40 z-30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Add Staff</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 transition"
          >
            Close
          </button>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-medium text-slate-500">Name</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm"
              placeholder="Alfred Mensah"
              value={formValues.name}
              onChange={(event) => setFormValues((previous) => ({ ...previous, name: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Phone</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm"
              placeholder="+23350XXXXXXX"
              type="tel"
              value={formValues.phone}
              onChange={(event) => setFormValues((previous) => ({ ...previous, phone: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Email (optional)</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm"
              placeholder="alfred@befitting.funeral"
              type="email"
              value={formValues.email}
              onChange={(event) => setFormValues((previous) => ({ ...previous, email: event.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Role</label>
            <select
              value={formValues.role}
              onChange={(event) =>
                setFormValues((previous) => ({ ...previous, role: event.target.value as CreateStaffPayload['role'] }))
              }
              className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm"
            >
              {STAFF_ROLES.map((role) => (
                <option value={role} key={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Temporary password</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm"
              type="password"
              value={formValues.password}
              onChange={(event) => setFormValues((previous) => ({ ...previous, password: event.target.value }))}
              required
            />
          </div>
          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 border border-rose-100 px-3 py-2 rounded">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-amber-400 transition disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create staff'}
          </button>
        </form>
      </div>
    </div>
  );
}



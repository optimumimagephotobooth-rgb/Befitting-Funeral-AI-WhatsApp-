import StaffRoleEditor from './StaffRoleEditor';
import StaffStatusToggle from './StaffStatusToggle';
import { StaffRecord } from '../../services/staff';

interface StaffListProps {
  staff: StaffRecord[];
  loading?: boolean;
  isAdmin: boolean;
  busyStaffId?: string | null;
  togglingStaffId?: string | null;
  resettingStaffId?: string | null;
  onRoleChange: (id: string, newRole: StaffRecord['role']) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onResetPassword: (staff: StaffRecord) => void;
  onOpenCreate: () => void;
}

export default function StaffList({
  staff,
  loading,
  isAdmin,
  busyStaffId,
  togglingStaffId,
  resettingStaffId,
  onRoleChange,
  onToggleActive,
  onResetPassword,
  onOpenCreate
}: StaffListProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <p className="text-lg font-semibold">Staff roster</p>
          <p className="text-xs text-slate-500">Manage agents, coordinators, and admin accounts</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-amber-400 transition"
          >
            Add staff
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Last login</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-xs text-slate-400">
                  Loading staff…
                </td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-xs text-slate-400">
                  No staff accounts yet.
                </td>
              </tr>
            ) : (
              staff.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-6 py-3 font-semibold">{row.name}</td>
                  <td className="px-6 py-3">{row.phone || '—'}</td>
                  <td className="px-6 py-3 text-xs text-slate-500">{row.email || '—'}</td>
                  <td className="px-6 py-3">
                    <StaffRoleEditor
                      currentRole={row.role}
                      onChange={(role) => onRoleChange(row.id, role)}
                      disabled={!isAdmin}
                      busy={busyStaffId === row.id}
                    />
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-500">
                    {row.lastLogin ? new Date(row.lastLogin).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <StaffStatusToggle
                      isActive={row.isActive}
                      onToggle={() => onToggleActive(row.id, row.isActive)}
                      disabled={!isAdmin}
                      busy={togglingStaffId === row.id}
                    />
                  </td>
                  <td className="px-6 py-3 space-x-2">
                    <button
                      type="button"
                      onClick={() => onResetPassword(row)}
                      disabled={!isAdmin || resettingStaffId === row.id}
                      className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-900 transition disabled:opacity-40"
                    >
                      {resettingStaffId === row.id ? 'Resetting…' : 'Reset password'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



import { StaffRole, STAFF_ROLES } from '../../services/staff';

interface StaffRoleEditorProps {
  currentRole: StaffRole;
  disabled?: boolean;
  busy?: boolean;
  onChange: (newRole: StaffRole) => void;
}

export default function StaffRoleEditor({ currentRole, disabled, busy, onChange }: StaffRoleEditorProps) {
  return (
    <select
      value={currentRole}
      onChange={(event) => onChange(event.target.value as StaffRole)}
      disabled={disabled || busy}
      className="bg-transparent border border-slate-200 rounded px-2 py-1 text-xs"
    >
      {STAFF_ROLES.map((role) => (
        <option key={role} value={role}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </option>
      ))}
    </select>
  );
}



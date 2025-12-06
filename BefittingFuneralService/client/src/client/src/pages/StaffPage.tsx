import { useCallback, useEffect, useState } from 'react';
import StaffList from '../components/staff/StaffList';
import StaffCreateModal from '../components/staff/StaffCreateModal';
import StaffResetPasswordModal from '../components/staff/StaffResetPasswordModal';
import StaffActivityTimeline from '../components/staff/StaffActivityTimeline';
import { QuietThresholdPanel } from '../components/settings/QuietThresholdPanel';
import {
  CreateStaffPayload,
  StaffEvent,
  StaffRecord,
  createStaff,
  fetchStaffList,
  listStaffEvents,
  resetStaffPassword,
  updateStaff
} from '../services/staff';
import { subscribeStaffEvents, unsubscribeChannel } from '../services/supabaseRealtime';

interface StaffPageProps {
  currentStaff: { name: string; role: string } | null;
}

export default function StaffPage({ currentStaff }: StaffPageProps) {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffRecord | null>(null);
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);
  const [togglingStaffId, setTogglingStaffId] = useState<string | null>(null);
  const [resettingStaffId, setResettingStaffId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const canManageStaff = currentStaff?.role === 'admin';

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetchStaffList();
      setStaff(response);
    } catch (error) {
      console.error('Staff load failed', error);
      setErrorMessage('Unable to load staff right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStaffEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const page = await listStaffEvents(1, 25);
      setEvents(page.data);
    } catch (error: any) {
      console.error('Failed to load staff events', error);
      setEventsError(
        error?.response?.data?.error || 'Unable to load staff activity at the moment.'
      );
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManageStaff) {
      void loadStaff();
      void loadStaffEvents();
    } else {
      setStaff([]);
      setEvents([]);
    }
  }, [canManageStaff, loadStaff, loadStaffEvents]);

  useEffect(() => {
    if (!canManageStaff) {
      return;
    }

    const channel = subscribeStaffEvents((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        void loadStaffEvents();
      }
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [canManageStaff, loadStaffEvents]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timeout = setTimeout(() => setStatusMessage(null), 5000);
    return () => clearTimeout(timeout);
  }, [statusMessage]);

  const handleCreate = async (payload: CreateStaffPayload) => {
    if (!canManageStaff) return;
    setCreateError(null);
    setCreating(true);
    try {
      await createStaff(payload);
      setCreateModalOpen(false);
      setStatusMessage(`${payload.name} has been added.`);
      void loadStaff();
    } catch (error) {
      console.error('Create staff failed', error);
      setCreateError('Could not create staff. Check for duplicates and try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (staffId: string, role: StaffRecord['role']) => {
    if (!canManageStaff) return;
    setBusyStaffId(staffId);
    try {
      await updateStaff(staffId, { role });
      setStatusMessage('Role updated.');
      void loadStaff();
    } catch (error) {
      console.error('Role update failed', error);
      setErrorMessage('Unable to update role.');
    } finally {
      setBusyStaffId(null);
    }
  };

  const handleToggleActive = async (staffId: string, isActive: boolean) => {
    if (!canManageStaff) return;
    setTogglingStaffId(staffId);
    try {
      await updateStaff(staffId, { isActive: !isActive });
      setStatusMessage(isActive ? 'Staff disabled.' : 'Staff reactivated.');
      void loadStaff();
    } catch (error) {
      console.error('Toggle active failed', error);
      setErrorMessage('Unable to update status.');
    } finally {
      setTogglingStaffId(null);
    }
  };

  const handleResetPassword = (target: StaffRecord) => {
    setResetError(null);
    setResetTarget(target);
  };

  const handleConfirmReset = async (staffId: string, newPassword: string) => {
    setResettingStaffId(staffId);
    setResetError(null);
    try {
      await resetStaffPassword(staffId, newPassword);
      setStatusMessage(`Password reset. Temporary password: ${newPassword}`);
      setResetTarget(null);
    } catch (error) {
      console.error('Reset failed', error);
      setResetError('Unable to reset password.');
    } finally {
      setResettingStaffId(null);
    }
  };

  if (!canManageStaff) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Staff management</h1>
        <p className="text-sm text-slate-500 mt-2">
          You do not have permission to manage staff accounts. Please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Staff management</h1>
        <p className="text-sm text-slate-500">
          Admins can add staff, reset passwords, and adjust roles. All changes are logged in the backend.
        </p>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-2 rounded-lg text-xs">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 rounded-lg text-xs">
          {errorMessage}
        </div>
      )}

      <StaffList
        staff={staff}
        loading={loading}
        isAdmin={canManageStaff}
        busyStaffId={busyStaffId}
        togglingStaffId={togglingStaffId}
        resettingStaffId={resettingStaffId}
        onRoleChange={handleRoleChange}
        onToggleActive={handleToggleActive}
        onResetPassword={handleResetPassword}
        onOpenCreate={() => setCreateModalOpen(true)}
      />

      <StaffCreateModal
        open={createModalOpen}
        loading={creating}
        error={createError || undefined}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateError(null);
        }}
        onCreate={handleCreate}
      />

      <StaffResetPasswordModal
        open={!!resetTarget}
        staff={resetTarget}
        loading={resettingStaffId === resetTarget?.id}
        error={resetError || undefined}
        onClose={() => {
          setResetTarget(null);
          setResetError(null);
        }}
        onReset={handleConfirmReset}
      />

      <StaffActivityTimeline
        events={events}
        loading={eventsLoading}
        error={eventsError}
        onRetry={loadStaffEvents}
      />

      <QuietThresholdPanel canManage={canManageStaff} />
    </div>
  );
}


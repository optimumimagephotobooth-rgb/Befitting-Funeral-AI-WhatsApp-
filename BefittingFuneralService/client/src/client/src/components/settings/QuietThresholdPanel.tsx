import React, { useRef, useState } from 'react';
import {
  defaultQuietThresholds,
  exportQuietThresholds,
  importQuietThresholds
} from '../../settings/quietThresholds';
import { useRealtimeQuietThresholds } from '../../store/quietThresholdSync';

interface QuietThresholdPanelProps {
  canManage?: boolean;
}

export const QuietThresholdPanel: React.FC<QuietThresholdPanelProps> = ({ canManage = true }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    config,
    loading,
    error,
    updateLocal,
    hydrateFromServer,
    saveForOrg
  } = useRealtimeQuietThresholds();
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleNumber = (field: keyof typeof config, value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 1 && n <= 200) {
      updateLocal({ [field]: n });
    }
  };

  function handleExport() {
    const text = exportQuietThresholds();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiet-thresholds.json';
    a.click();

    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = reader.result as string;
        const cfg = importQuietThresholds(json);

        updateLocal(cfg);
        if (canManage) {
          setSaving(true);
          saveForOrg(cfg)
            .then(() => setStatus('Quiet period settings imported and saved for everyone.'))
            .catch(() => alert('Imported locally, but saving to the organization failed.'))
            .finally(() => setSaving(false));
        } else {
          setStatus('Quiet period settings imported locally (read-only account).');
        }
      } catch (err) {
        alert('Invalid JSON file. Import failed.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="mt-10 border rounded-lg p-5 bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Quiet Period Sensitivity</h2>
      <p className="text-sm text-gray-600 mb-3">
        Adjust how many hours of silence trigger dashboard quiet alerts. Updates sync live across all dashboards.
      </p>
      {(status || error) && (
        <p className={`text-xs mb-3 ${error ? 'text-rose-600' : 'text-emerald-600'}`}>
          {status || error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Business Hours – Warning (hours)
          </label>
          <input
            type="number"
            min={1}
            max={200}
            className="w-full border rounded px-2 py-1"
            value={config.businessWarningHours}
            onChange={(e) => handleNumber('businessWarningHours', e.target.value)}
            disabled={loading || saving || !canManage}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Business Hours – Alert (hours)
          </label>
          <input
            type="number"
            min={1}
            max={200}
            className="w-full border rounded px-2 py-1"
            value={config.businessAlertHours}
            onChange={(e) => handleNumber('businessAlertHours', e.target.value)}
            disabled={loading || saving || !canManage}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Off Hours – Warning (hours)</label>
          <input
            type="number"
            min={1}
            max={200}
            className="w-full border rounded px-2 py-1"
            value={config.offHoursWarningHours}
            onChange={(e) => handleNumber('offHoursWarningHours', e.target.value)}
            disabled={loading || saving || !canManage}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Off Hours – Alert (hours)</label>
          <input
            type="number"
            min={1}
            max={200}
            className="w-full border rounded px-2 py-1"
            value={config.offHoursAlertHours}
            onChange={(e) => handleNumber('offHoursAlertHours', e.target.value)}
            disabled={loading || saving || !canManage}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          className="px-4 py-2 border rounded bg-gray-50 hover:bg-gray-100 text-sm"
        >
          Export Settings
        </button>

        <label className="px-4 py-2 border rounded bg-gray-50 hover:bg-gray-100 text-sm cursor-pointer">
          Import Settings
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </label>

        {canManage && (
          <>
            <button
              onClick={() => {
                updateLocal(defaultQuietThresholds);
                setSaving(true);
                saveForOrg(defaultQuietThresholds)
                  .then(() => setStatus('Quiet settings reset to defaults for everyone.'))
                  .catch(() => alert('Reset locally, but saving to the organization failed.'))
                  .finally(() => setSaving(false));
              }}
              className="px-4 py-2 border rounded bg-gray-50 hover:bg-gray-100 text-sm"
              disabled={saving}
            >
              Reset Defaults
            </button>

            <button
              onClick={() => {
                setSaving(true);
                saveForOrg(config)
                  .then(() => setStatus('Saved as org defaults.'))
                  .catch(() => alert('Unable to save organization settings.'))
                  .finally(() => setSaving(false));
              }}
              className="px-4 py-2 border border-amber-400 rounded text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
              disabled={saving}
            >
              Save for Org
            </button>
          </>
        )}

        <button
          onClick={() => {
            hydrateFromServer().then(() => setStatus('Synced latest org defaults.'));
          }}
          className="px-4 py-2 border rounded bg-white hover:bg-gray-50 text-sm"
        >
          Sync org defaults
        </button>
      </div>
    </div>
  );
};
 

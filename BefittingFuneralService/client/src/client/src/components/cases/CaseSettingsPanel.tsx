import { useState } from 'react';

interface CaseNote {
  id: string;
  author?: string;
  staff_name?: string;
  body: string;
  created_at: string;
}

interface CaseSettingsPanelProps {
  notes?: CaseNote[];
  onAddNote?: (body: string) => void;
  assignedStaffName?: string;
  loading?: boolean;
  adding?: boolean;
  error?: string | null;
}

export default function CaseSettingsPanel({
  notes = [],
  onAddNote,
  assignedStaffName,
  loading,
  adding,
  error
}: CaseSettingsPanelProps) {
  const [noteDraft, setNoteDraft] = useState('');
  const [familyPreferences, setFamilyPreferences] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddNote = () => {
    if (!noteDraft.trim()) return;
    onAddNote?.(noteDraft.trim());
    setNoteDraft('');
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Assigned staff</p>
        <p className="mt-2 text-sm text-slate-100">{assignedStaffName || 'Unassigned'}</p>
        <p className="text-xs text-slate-500">Staff assignment editing coming soon.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Internal notes</p>
        <div className="mt-3 space-y-2">
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {loading ? (
            <p className="text-sm text-slate-500">Loading notes…</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-slate-500">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <article
                key={String(note.id)}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                  <span>{note.author || note.staff_name || 'Staff'}</span>
                  <time>{new Date(note.created_at).toLocaleString()}</time>
                </div>
                <p className="mt-2">{note.body}</p>
              </article>
            ))
          )}
        </div>
        <div className="mt-4 space-y-2">
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Add a private note..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
          />
          <button
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-slate-400 disabled:opacity-50"
            onClick={handleAddNote}
            disabled={adding}
          >
            {adding ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Family preferences (local)</p>
        <textarea
          value={familyPreferences}
          onChange={(event) => setFamilyPreferences(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
          placeholder="Describe cultural preferences, music restrictions, etc."
        />
        <p className="mt-2 text-xs text-slate-500">
          Stored locally for now; will be synced in a future release.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Case tags (local)</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['VIP', 'Out of town', 'Catholic', 'High profile'].map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() =>
                  setTags((prev) =>
                    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                  )
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  active ? 'bg-[#D4AF37] text-slate-900' : 'border border-slate-700 text-slate-300'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Tags are local-only for now, but structured for future persistence.
        </p>
      </div>
    </section>
  );
}


import { useEffect, useMemo, useState } from 'react';
import {
  createTemplate,
  deleteTemplate,
  DocumentTemplate,
  listTemplates,
  updateTemplate
} from '../services/documents';

const DOCUMENT_TYPES = [
  { value: 'estimate', label: 'Estimate / Quotation' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'statutory', label: 'Statutory Form' },
  { value: 'cremation', label: 'Cremation / Burial Form' },
  { value: 'letter', label: 'Family Letter' },
  { value: 'schedule', label: 'Schedule / Order of Events' },
  { value: 'minister_sheet', label: 'Minister / Church Sheet' },
  { value: 'order_of_service', label: 'Order of Service Draft' }
];

const MERGE_FIELDS = [
  '{{case.case_ref}}',
  '{{case.deceased_full_name}}',
  '{{case.service_date}}',
  '{{case.location}}',
  '{{family.primary_contact_name}}',
  '{{family.primary_contact_phone}}',
  '{{totals.total_amount}}',
  '{{totals.deposit_amount}}',
  '{{totals.balance}}',
  '{{account.company_name}}',
  '{{#each charges}} {{description}} – {{amount}} {{/each}}'
];

interface DraftTemplate {
  id?: string;
  name: string;
  documentType: string;
  description: string;
  htmlTemplate: string;
  isActive: boolean;
}

const emptyTemplate: DraftTemplate = {
  name: '',
  documentType: 'estimate',
  description: '',
  htmlTemplate: '<h1>{{case.deceased_full_name}}</h1>',
  isActive: true
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<DraftTemplate>(emptyTemplate);
  const [busy, setBusy] = useState(false);

  const sortedTemplates = useMemo(
    () =>
      [...templates].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [templates]
  );

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTemplates(true);
      setTemplates(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to load templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const openModal = (template?: DocumentTemplate) => {
    if (template) {
      setDraft({
        id: template.id,
        name: template.name,
        documentType: template.documentType,
        description: template.description || '',
        htmlTemplate: template.htmlTemplate,
        isActive: template.isActive
      });
    } else {
      setDraft(emptyTemplate);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      if (draft.id) {
        await updateTemplate(draft.id, draft);
      } else {
        await createTemplate(draft);
      }
      setModalOpen(false);
      await loadTemplates();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to save template.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!window.confirm('Delete this template?')) return;
    await deleteTemplate(templateId);
    await loadTemplates();
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Document templates</h2>
          <p className="text-sm text-slate-500">
            Manage reusable funeral documents with Handlebars merge fields.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openModal()}
            className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            New template
          </button>
          <button
            onClick={() => loadTemplates()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          Loading templates…
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedTemplates.map((template) => (
                <tr key={template.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{template.name}</div>
                    <div className="text-xs text-slate-500">{template.description || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs uppercase text-slate-500">{template.documentType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        template.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {template.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(template.updatedAt || template.metadata?.updatedAt || Date.now()).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-amber-700">
                    <div className="flex gap-3">
                      <button className="hover:text-amber-500" onClick={() => openModal(template)}>
                        Edit
                      </button>
                      <button className="text-rose-600 hover:text-rose-500" onClick={() => handleDelete(template.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setModalOpen(false)} />
          <div className="relative z-50 w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {draft.id ? 'Edit template' : 'New template'}
                </p>
                <p className="text-xs text-slate-500">Use Handlebars merge tags to personalize every document.</p>
              </div>
              <button className="text-sm text-slate-500 hover:text-slate-900" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </header>
            <div className="grid gap-0 md:grid-cols-[2fr,1fr]">
              <div className="p-5 space-y-4">
                <label className="block text-sm text-slate-600">
                  Template name
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  Document type
                  <select
                    value={draft.documentType}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, documentType: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-600">
                  Description
                  <input
                    type="text"
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  HTML template
                  <textarea
                    value={draft.htmlTemplate}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, htmlTemplate: event.target.value }))
                    }
                    rows={20}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 focus:border-amber-400 focus:outline-none"
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) => setDraft((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  Template active
                </label>
              </div>
              <div className="border-l border-slate-100 p-5 space-y-4 bg-slate-50">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Merge field cheat sheet</p>
                  <ul className="space-y-1 text-xs font-mono text-slate-600">
                    {MERGE_FIELDS.map((field) => (
                      <li
                        key={field}
                        className="truncate rounded bg-white px-2 py-1 shadow-sm cursor-pointer"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            htmlTemplate: `${prev.htmlTemplate}\n${field}`
                          }))
                        }
                      >
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-slate-500">
                  Templates compile with Handlebars. Use helpers like <code>{'{{ uppercase value }}'}</code> or{' '}
                  <code>{'{{ currency totals.total_amount }}'}</code>.
                </p>
              </div>
            </div>
            <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <button
                className="text-sm text-slate-500 hover:text-slate-900"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                onClick={handleSave}
                disabled={busy}
              >
                {draft.id ? 'Save changes' : 'Create template'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}


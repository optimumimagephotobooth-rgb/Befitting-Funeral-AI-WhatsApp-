import { useEffect, useMemo, useState } from 'react';
import {
  CaseDocumentRecord,
  DocumentTemplate,
  downloadCaseDocument,
  generateCaseDocument,
  listCaseTemplates,
  previewCaseDocument
} from '../../services/documents';

interface CaseDocumentsPanelProps {
  caseId: string;
  canManage: boolean;
  documents?: CaseDocumentRecord[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

export default function CaseDocumentsPanel({
  caseId,
  canManage,
  documents = [],
  loading,
  error,
  onRefresh
}: CaseDocumentsPanelProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [editorValue, setEditorValue] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const activeTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === selectedTemplate),
    [templates, selectedTemplate]
  );

  useEffect(() => {
    async function loadTemplates() {
      try {
        const tpls = await listCaseTemplates(caseId);
        setTemplates(tpls);
        if (!selectedTemplate && tpls.length) {
          setSelectedTemplate(tpls[0].id);
        }
      } catch (err: any) {
        setLocalError(err?.response?.data?.error || 'Unable to load templates.');
      }
    }
    void loadTemplates();
  }, [caseId, selectedTemplate]);

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    setBusy(true);
    try {
      const { html } = await previewCaseDocument(caseId, { templateId: selectedTemplate });
      setPreviewHtml(html);
      setEditorValue(html);
      setPreviewOpen(true);
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || 'Unable to preview template.');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async (override?: string) => {
    if (!selectedTemplate) return;
    setBusy(true);
    setLocalError(null);
    try {
      await generateCaseDocument(caseId, {
        templateId: selectedTemplate,
        htmlOverride: override,
        title: activeTemplate ? `${activeTemplate.name} – ${new Date().toLocaleDateString()}` : undefined
      });
      setPreviewOpen(false);
      onRefresh?.();
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || 'Unable to generate document.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (documentId: string, title: string) => {
    const blob = await downloadCaseDocument(caseId, documentId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title || 'document'}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const derivedError = error || localError;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900">Documents</h4>
          <p className="text-xs text-slate-500">
            Generate funeral estimates, invoices, letters, and statutory documents from case data.
          </p>
        </div>
        {derivedError && <p className="text-xs text-rose-600">{derivedError}</p>}
      </header>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 text-sm text-slate-600">
            Template
            <select
              value={selectedTemplate}
              onChange={(event) => setSelectedTemplate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.documentType})
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerate()}
              disabled={!canManage || !selectedTemplate || busy}
              className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              Generate PDF
            </button>
            <button
              onClick={handlePreview}
              disabled={!canManage || !selectedTemplate || busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Preview / Edit
            </button>
          </div>
        </div>
      </section>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Generated documents</p>
        {loading ? (
          <p className="text-sm text-slate-500">Loading documents…</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents generated yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Template</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-3 py-2 font-semibold text-slate-900">{doc.title}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {doc.templateName || '—'} {doc.documentType && `(${doc.documentType})`}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {new Date(doc.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDownload(doc.id, doc.title)}
                        className="text-sm text-amber-600 hover:text-amber-500"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setPreviewOpen(false)} />
          <div className="relative z-50 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Preview – {activeTemplate?.name || 'Template'}
                </p>
                <p className="text-xs text-slate-500">Make quick text edits before exporting.</p>
              </div>
              <button
                className="text-sm text-slate-500 hover:text-slate-900"
                onClick={() => setPreviewOpen(false)}
              >
                Close
              </button>
            </header>
            <div className="grid gap-0 md:grid-cols-2">
              <div className="max-h-[70vh] overflow-y-auto border-r border-slate-100 p-4 text-sm">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
              <div className="flex flex-col border-l border-slate-100">
                <textarea
                  className="flex-1 resize-none bg-slate-50 p-4 text-xs font-mono text-slate-700 focus:outline-none"
                  value={editorValue}
                  onChange={(event) => setEditorValue(event.target.value)}
                />
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                    onClick={() => setPreviewOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-lg border border-emerald-500 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                    disabled={busy}
                    onClick={() => handleGenerate(editorValue)}
                  >
                    Save & Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


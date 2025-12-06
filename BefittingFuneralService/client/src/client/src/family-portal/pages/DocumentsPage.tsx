import { FormEvent, useState } from 'react';
import type { FamilyDocument } from '../types';

type DocumentsPageProps = {
  documents: FamilyDocument[];
  onUpload: (payload: {
    title: string;
    description?: string;
    documentType?: string;
    file_url: string;
  }) => Promise<void>;
  loading?: boolean;
  error?: string;
};

export default function DocumentsPage({ documents, onUpload, loading, error }: DocumentsPageProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [documentType, setDocumentType] = useState('family_upload');

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !fileUrl.trim()) {
      return;
    }
    await onUpload({
      title: title.trim(),
      description: description.trim() || undefined,
      documentType,
      file_url: fileUrl.trim()
    });
    setTitle('');
    setDescription('');
    setFileUrl('');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Upload a document</p>
        <p className="text-sm text-slate-400">Photos, IDs, receipts or programme drafts.</p>
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        <form onSubmit={handleUpload} className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Document title"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Notes for staff (optional)"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
            rows={3}
          />
          <input
            value={fileUrl}
            onChange={(event) => setFileUrl(event.target.value)}
            placeholder="File URL (dropbox, drive, etc.)"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              className="rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-white outline-none"
            >
              <option value="family_upload">Family upload</option>
              <option value="obituary">Obituary draft</option>
              <option value="programme">Order of service</option>
              <option value="receipt">Payment receipt</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? 'Uploading…' : 'Share document'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Your documents</p>
        <div className="mt-4 space-y-3">
          {documents.length > 0 ? (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-white">{doc.title}</p>
                  <p className="text-xs text-slate-500">
                    Uploaded {new Date(doc.created_at).toLocaleString()}
                  </p>
                </div>
                <a
                  href={doc.file_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300 transition hover:text-emerald-200"
                >
                  Download
                </a>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No documents uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}


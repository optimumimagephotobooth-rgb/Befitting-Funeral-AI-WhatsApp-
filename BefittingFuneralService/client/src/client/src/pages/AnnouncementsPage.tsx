import { FormEvent, useEffect, useState } from 'react';
import { createAnnouncement, listAnnouncements } from '../services/api';

interface AnnouncementRecord {
  id?: number;
  title: string;
  body: string;
  channel: string;
  scheduled_at?: string;
  created_at?: string;
}

const channels = ['whatsapp', 'sms', 'email', 'display'];

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [form, setForm] = useState({
    title: '',
    body: '',
    channel: 'whatsapp',
    scheduledAt: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listAnnouncements({ limit: 20 }).then((payload) => setAnnouncements(payload.data));
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    await createAnnouncement({
      title: form.title,
      body: form.body,
      channel: form.channel,
      scheduledAt: form.scheduledAt || undefined
    });
    setForm({ ...form, title: '', body: '', scheduledAt: '' });
    const refreshed = await listAnnouncements({ limit: 20 });
    setAnnouncements(refreshed.data);
    setCreating(false);
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Announcements builder</h2>
          <p className="text-sm text-slate-500">
            Draft announcements and queue them for WhatsApp, SMS, or email distribution.
          </p>
        </div>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {announcements.length} drafts
        </span>
      </header>
      <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-slate-600">
            Title
            <input
              value={form.title}
              onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-amber-400 focus:outline-none"
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-600">
            Channel
            <select
              value={form.channel}
              onChange={(event) => setForm((state) => ({ ...state, channel: event.target.value }))}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-amber-400 focus:outline-none"
            >
              {channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col text-sm font-medium text-slate-600">
          Body
          <textarea
            value={form.body}
            onChange={(event) => setForm((state) => ({ ...state, body: event.target.value }))}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-amber-400 focus:outline-none"
            required
            rows={3}
          />
        </label>

        <label className="flex flex-col text-sm font-medium text-slate-600">
          Schedule (optional)
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(event) => setForm((state) => ({ ...state, scheduledAt: event.target.value }))}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-amber-400 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-70"
          disabled={creating}
        >
          {creating ? 'Saving announcement…' : 'Save announcement'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ul className="divide-y divide-slate-100">
          {announcements.map((announcement) => (
            <li key={`${announcement.title}-${announcement.created_at}`} className="px-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{announcement.title}</h3>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {announcement.channel}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{announcement.body}</p>
              <p className="mt-2 text-xs text-slate-400">
                Scheduled: {announcement.scheduled_at ? new Date(announcement.scheduled_at).toLocaleString() : 'ASAP'}
              </p>
            </li>
          ))}
          {announcements.length === 0 && (
            <li className="px-4 py-4 text-sm text-slate-500">No announcements yet.</li>
          )}
        </ul>
      </div>
    </section>
  );
}


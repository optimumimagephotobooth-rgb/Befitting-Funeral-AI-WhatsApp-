import { FormEvent, useState } from 'react';
import type { FamilyChatMessage } from '../types';

type ChatPageProps = {
  chat: FamilyChatMessage[];
  onSend: (message: string) => Promise<void>;
  sending?: boolean;
  error?: string;
};

export default function ChatPage({ chat, onSend, sending, error }: ChatPageProps) {
  const [message, setMessage] = useState('');

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }
    await onSend(message.trim());
    setMessage('');
  };

  return (
    <div className="flex min-h-[60vh] flex-col gap-4">
      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex h-full flex-col gap-3 overflow-auto p-5">
          {chat.length ? (
            chat.map((item) => {
              const isFamily = item.sender?.toLowerCase() === 'family';
              return (
                <div
                  key={item.id}
                  className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${
                    isFamily
                      ? 'self-end bg-emerald-500/20 text-white'
                      : 'self-start bg-slate-800 text-slate-200'
                  }`}
                >
                  <p className="font-semibold text-xs uppercase tracking-[0.4em] text-slate-400">
                    {isFamily ? 'You' : 'Coordinator'}
                  </p>
                  <p className="mt-1 text-slate-100">{item.body}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-500">No messages yet. Start the conversation.</p>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-inner shadow-slate-900/60"
      >
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Share updates, questions or documents..."
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
          rows={3}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.4em] text-slate-500">All chat is secure</span>
          <button
            type="submit"
            disabled={sending}
            className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </div>
  );
}


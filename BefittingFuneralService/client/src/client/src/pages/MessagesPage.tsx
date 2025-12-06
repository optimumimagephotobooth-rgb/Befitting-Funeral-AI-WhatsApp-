import { useEffect, useState } from 'react';
import { fetchMessages } from '../services/api';
import { subscribeMessages, unsubscribeChannel } from '../services/supabaseRealtime';

interface MessageRecord {
  id: number;
  case_id: number | null;
  direction: string;
  from_number: string;
  body: string;
  created_at: string;
  intent?: string;
  flow?: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMessages({ limit: 30 })
      .then((payload) => {
        setMessages(payload.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const subscription = subscribeMessages((payload) => {
      setMessages((prev) => [payload.new as MessageRecord, ...prev].slice(0, 50));
    });

    return () => {
      unsubscribeChannel(subscription);
    };
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Messages inbox</h2>
        <p className="text-sm text-slate-500">{messages.length} recent messages</p>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
          Loading recent messages…
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100 text-sm text-slate-700">
            {messages.map((message) => (
              <li key={message.id} className="px-4 py-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {message.direction}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(message.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="mt-1 text-base text-slate-900">{message.body}</p>
                <div className="mt-2 flex gap-3 text-xs text-slate-500">
                  <span>From: {message.from_number}</span>
                  <span>Intent: {message.intent || 'general'}</span>
                  <span>Flow: {message.flow || 'tracking'}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}


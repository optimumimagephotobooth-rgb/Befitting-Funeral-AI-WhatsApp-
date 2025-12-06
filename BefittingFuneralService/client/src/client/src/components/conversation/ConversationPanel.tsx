import MessageBubble from './MessageBubble';

export default function ConversationPanel() {
  return (
    <section className="rounded-3xl border border-slate-800 bg-dusk/80 p-5 shadow-lg">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Conversation</h2>
        <p className="text-xs text-slate-500">Latest WhatsApp messages</p>
      </header>
      <div className="space-y-3">
        <MessageBubble content="Example inbound message" />
        <MessageBubble content="Staff response placeholder" fromStaff />
      </div>
    </section>
  );
}


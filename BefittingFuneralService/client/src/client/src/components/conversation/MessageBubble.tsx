type MessageBubbleProps = {
  content: string;
  fromStaff?: boolean;
};

export default function MessageBubble({ content, fromStaff }: MessageBubbleProps) {
  return (
    <div className={`rounded-2xl px-4 py-2 ${fromStaff ? 'bg-emerald-500/20 text-white' : 'bg-slate-800 text-slate-200'}`}>
      <p className="text-sm">{content}</p>
    </div>
  );
}



